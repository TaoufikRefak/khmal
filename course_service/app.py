from datetime import datetime, timezone
import time
from flask import Flask, jsonify, request, g
from flask_sqlalchemy import SQLAlchemy
import pika
import threading
import json
import logging
import os
import uuid
import requests
from werkzeug.utils import secure_filename
from auth_lib import requires_role, decode_token
from threading import Lock
import subprocess
from circuitbreaker import circuit

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///course.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = '/app/videos'
app.config['ALLOWED_EXTENSIONS'] = {'mp4', 'mov', 'avi', 'mkv'}
app.config['HLS_OUTPUT'] = '/app/hls'

db = SQLAlchemy(app)

NGINX_RTMP_URL = os.getenv('NGINX_RTMP_URL', 'http://localhost/hls')
NGINX_VOD_DIR = '/tmp/hls'
HLS_BASE_PATH = '/hls'
USER_SERVICE_URL = os.environ.get('USER_SERVICE_URL', 'http://user_service:3001')

# -------------------------
# Models
# -------------------------
class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=False)
    teacher_id = db.Column(db.Integer, nullable=False)
    branch_id = db.Column(db.Integer, nullable=False)
    comments = db.relationship('Comment', backref='course', lazy=True)
    thumbnail_url  = db.Column(db.String(255), nullable=True)   # ← new

    # New relationship for likes
    views = db.Column(db.Integer, default=0)  # Add this line

    likes = db.relationship('CourseLike', backref='course', lazy=True)
    video_filename = db.Column(db.String(255), nullable=False)
    hls_playlist = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), 
                           onupdate=lambda: datetime.now(timezone.utc))

    def serialize(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "teacher_id": self.teacher_id,
            "branch_id": self.branch_id,
            "hls_url": self.hls_playlist,
            "thumbnail":    self.thumbnail_url,   
            "views": self.views,  # Add this line

            "like_count": len(self.likes) if self.likes else 0,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    text = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    user_role = db.Column(db.String(20), nullable=False)
    user_branch = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

# New model for storing likes
class CourseLike(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    user_id = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

with app.app_context():
    db.create_all()

# -------------------------
# RabbitMQ Setup
# -------------------------
connection = None
channel = None
lock = Lock()
COURSE_EVENTS_EXCHANGE = 'course_events_exchange'

def init_rabbitmq():
    global connection, channel
    with lock:
        if not connection or connection.is_closed:
            connection = pika.BlockingConnection(
                pika.ConnectionParameters('rabbitmq')
            )
            channel = connection.channel()
            
            # Declare the exchange first
            channel.exchange_declare(
                exchange='user_interactions',  # Add this exchange
                exchange_type='fanout',
                durable=True
            )
            
            # Then declare and bind the queue
            channel.queue_declare(
                queue='user_interactions',
                durable=True
            )
            channel.queue_bind(
                exchange='user_interactions',  # Bind to the exchange
                queue='user_interactions'
            )
            
            # Existing course events exchange declaration
            channel.exchange_declare(
                exchange=COURSE_EVENTS_EXCHANGE,
                exchange_type='fanout',
                durable=True
            )


@circuit(failure_threshold=5, recovery_timeout=60)
def publish_message(exchange, message, retries=3, delay=2):
    """Robust publisher matching Auth/User service pattern"""
    connection = None
    attempt = 0
    while attempt < retries:
        try:
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(
                    host="rabbitmq",
                    heartbeat=600,
                    blocked_connection_timeout=300
                )
            )
            channel = connection.channel()
            
            # Mirror Auth/User service exchange declaration
            channel.exchange_declare(
                exchange=exchange,
                exchange_type='fanout',
                durable=True
            )

            channel.basic_publish(
                exchange=exchange,
                routing_key='',  # Empty for fanout
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    delivery_mode=2,
                    content_type='application/json',
                    message_id=str(uuid.uuid4()),
                    headers={'x-deduplication-id': str(uuid.uuid4())}
                )
            )
            channel.confirm_delivery()
            
            logger.info(f"Published to {exchange}: {message}")
            connection.close()
            return True
        except Exception as e:
            logger.error(f"Publish failed (Attempt {attempt+1}/{retries}): {e}")
            time.sleep(delay)
            attempt += 1
        finally:
            if connection and not connection.is_closed:
                connection.close()
    logger.error(f"🚨 Failed to publish after {retries} attempts: {message}")
    return False

# -------------------------
# Helper Functions
# -------------------------
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def process_video_file(video_file, filename_prefix):
    """Process video file and return HLS playlist URL"""
    try:
        # Save original video
        filename = secure_filename(video_file.filename)
        video_path = os.path.join(NGINX_VOD_DIR, filename)
        video_file.save(video_path)
        
        # Create HLS output directory
        output_dir = os.path.join(NGINX_VOD_DIR, filename_prefix)
        os.makedirs(output_dir, exist_ok=True)

        # Generate HLS streams
        ffmpeg_command = [
            'ffmpeg','-y',
            '-i', video_path,
            '-profile:v', 'baseline',
            '-level', '3.0',
            '-s', '640x360',
            '-start_number', '0',
            '-hls_time', '10',
            '-hls_list_size', '0',
            '-f', 'hls',
            f'{output_dir}/index.m3u8'
        ]

        subprocess.run(ffmpeg_command, check=True)
        
        # Generate full HLS URL
        thumbnail_path = os.path.join(output_dir, 'thumbnail.jpg')
        subprocess.run([
            'ffmpeg','-y', '-i', video_path, 
            '-ss', '00:00:01', 
            '-vframes', '1', 
            '-q:v', '2', 
            thumbnail_path
        ], check=True)

        # Update return value to include thumbnail URL
        return {
            "hls_url": f"{NGINX_RTMP_URL}{HLS_BASE_PATH}/{filename_prefix}/index.m3u8",
            "thumbnail": f"{NGINX_RTMP_URL}{HLS_BASE_PATH}/{filename_prefix}/thumbnail.jpg"
        }

    except Exception as e:
        logger.error(f"Video processing failed: {e}")
        raise
        
    except Exception as e:
        logger.error(f"Video processing failed: {e}")
        raise

# -------------------------
# Comments Endpoints
# -------------------------
def get_user_email(user_id, auth_header):
    """Fetch user email from User Service"""
    try:
        headers = {'Authorization': auth_header}
        response = requests.get(
            f"{USER_SERVICE_URL}/users/{user_id}",
            headers=headers,
            timeout=3
        )
        response.raise_for_status()
        return response.json().get('email')
    except Exception as e:
        logger.error(f"Error fetching user email: {str(e)}")
        return None
    


@app.route('/courses/<int:course_id>/comments', methods=['GET'])
@requires_role(['student', 'teacher', 'admin'])
def get_comments(course_id):
    try:
        course = Course.query.get_or_404(course_id)
        user = g.user
        
        # Verify access
        if user['role'] == 'student' and course.branch_id != user['branch_id']:
            return jsonify({"error": "Unauthorized access"}), 403

        comments = []
        for c in course.comments:
            email = get_user_email(c.user_id, request.headers.get('Authorization'))
            comments.append({
                "id": c.id,
                "text": c.text,
                "user_id": c.user_id,
                "user_email": email or f"User {c.user_id}",  # Fallback to ID
                "created_at": c.created_at.isoformat(),
                "user_role": c.user_role
            })
            
        return jsonify(comments), 200
        
    except Exception as e:
        logger.error(f"Failed to fetch comments: {e}")
        return jsonify({"error": "Internal server error"}), 500
    



@app.route('/courses/<int:course_id>/comments', methods=['POST'])
@requires_role(['student', 'teacher', 'admin'])
def add_comment(course_id):
    try:
        course = Course.query.get_or_404(course_id)
        user = g.user
        data = request.get_json()
        
        # Validate permissions
        if user['role'] == 'student' and course.branch_id != user['branch_id']:
            return jsonify({"error": "Unauthorized to comment"}), 403
            
        if user['role'] == 'teacher' and course.branch_id != user['branch_id']:
            return jsonify({"error": "Unauthorized to comment"}), 403

        if not data or not data.get('text'):
            return jsonify({"error": "Comment text required"}), 400

        new_comment = Comment(
            text=data['text'],
            user_id=user['user_id'],
            course_id=course_id,
            user_role=user['role'],
            user_branch=user.get('branch_id')
        )
        
        db.session.add(new_comment)
        db.session.commit()
    
        # Fetch user email from User Service
        user_email = get_user_email(user['user_id'], request.headers.get('Authorization'))
        publish_message('user_interactions', {
            "event": "COMMENT_ADDED",
            "course_id": course_id,
            "student_id": user['user_id'],
            "branch_id": course.branch_id,  # Added

            "timestamp": datetime.now(timezone.utc).isoformat()
        }        )
        return jsonify({
            "id": new_comment.id,
            "text": new_comment.text,
            "user_id": new_comment.user_id,
            "user_email": user_email or f"user_{new_comment.user_id}",
            "created_at": new_comment.created_at.isoformat(),
            "user_role": new_comment.user_role
        }), 201

    except Exception as e:
        logger.error(f"Comment creation failed: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/courses/comments/<int:comment_id>', methods=['DELETE'])
@requires_role(['student', 'teacher', 'admin'])
def delete_comment(comment_id):
    try:
        comment = Comment.query.get_or_404(comment_id)
        user = g.user
        
        # Get associated course
        course = Course.query.get(comment.course_id)
        
        # Authorization checks
        is_admin = user['role'] == 'admin'
        is_owner = comment.user_id == user['user_id']
        valid_teacher = user['role'] == 'teacher' and course.teacher_id == user['user_id']
        
        if not any([is_admin, is_owner, valid_teacher]):
            return jsonify({"error": "Unauthorized to delete comment"}), 403

        db.session.delete(comment)
        db.session.commit()
        publish_message('user_interactions', {
            "event": "COMMENT_DELETED",
            "course_id": comment.course_id,
            "student_id": comment.user_id,
            "branch_id": course.branch_id,  # Added

            "timestamp": datetime.now(timezone.utc).isoformat()
        }        )
        return jsonify({"message": "Comment deleted successfully"}), 200

    except Exception as e:
        logger.error(f"Comment deletion failed: {e}")
        return jsonify({"error": "Internal server error"}), 500    

# -------------------------
# Course Endpoints
# -------------------------
@app.route('/courses', methods=['POST'])
@requires_role(['teacher', 'admin'])
def create_course():
    try:
        user = g.user
        if user['role'] == 'teacher':
            if 'branch_id' not in user or not user['branch_id']:
                return jsonify({"error": "Teacher account missing branch association"}), 400
            if 'user_id' not in user:
                return jsonify({"error": "Invalid teacher credentials"}), 401

        title = request.form.get('title')
        description = request.form.get('description')
        teacher_id = user['user_id'] if user['role'] == 'teacher' else request.form.get('teacher_id')
        branch_id = user['branch_id'] if user['role'] == 'teacher' else request.form.get('branch_id')
        video = request.files.get('video')
        if user['role'] != 'teacher':
            try:
                teacher_id = int(teacher_id) if teacher_id else None
                branch_id = int(branch_id) if branch_id else None
            except ValueError:
                return jsonify({"error": "Invalid ID format"}), 400

        # Add null checks
        if None in [teacher_id, branch_id]:
            return jsonify({"error": "Missing required IDs"}), 400

        if not all([title, description, teacher_id, branch_id]) or not video:
            return jsonify({"error": "All fields are required"}), 400

        # Process video and get HLS URL
        filename_prefix = os.path.splitext(secure_filename(video.filename))[0]
        result    = process_video_file(video, filename_prefix)
        hls_url   = result["hls_url"]
        thumb_url = result["thumbnail"]

        new_course = Course(
            title          = title,
            description    = description,
            teacher_id     = teacher_id,
            branch_id      = branch_id,
            video_filename = video.filename,
            hls_playlist   = hls_url,
            thumbnail_url  = thumb_url          # ← unpacked
        )
        db.session.add(new_course)
        db.session.commit()
        publish_message(COURSE_EVENTS_EXCHANGE, {
        "event": "COURSE_CREATED",
        "course_id": new_course.id,
        "title": new_course.title,
        "description": new_course.description,
        "teacher_id": new_course.teacher_id,
        "branch_id": new_course.branch_id,
        "hls_url": new_course.hls_playlist,
        "thumbnail_url": new_course.thumbnail_url,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

        return jsonify(new_course.serialize()), 201

    except Exception as e:
        logger.error(f"Course creation failed: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/courses/<int:course_id>', methods=['PUT'])
@requires_role(['teacher', 'admin'])
def update_course(course_id):
    try:
        user = g.user
        course = Course.query.get_or_404(course_id)

        if user['role'] == 'teacher' and (course.teacher_id != user['user_id'] or course.branch_id != user['branch_id']):
            return jsonify({"error": "Unauthorized to update this course"}), 403

        data = request.form
        if 'title' in data:
            course.title = data['title']
        if 'description' in data:
            course.description = data['description']
            
        if 'video' in request.files:
            video = request.files['video']
            filename_prefix = os.path.splitext(secure_filename(video.filename))[0]
            
            # Process new video - get BOTH URLs
            result = process_video_file(video, filename_prefix)  # Changed variable name
            
            # Update both fields
            course.hls_playlist = result["hls_url"]      # Extract string from dict
            course.thumbnail_url = result["thumbnail"]   # Update thumbnail URL
            course.video_filename = video.filename

        db.session.commit()

        publish_message(COURSE_EVENTS_EXCHANGE, {
        "event": "COURSE_UPDATED",
        "course_id": course.id,
        "title": course.title,
        "description": course.description,
        "teacher_id": course.teacher_id,
        "branch_id": course.branch_id,
        "hls_url": course.hls_playlist,
        "thumbnail_url": course.thumbnail_url,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

        return jsonify(course.serialize()), 200
    except Exception as e:
        logger.error(f"Course update failed: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/courses', methods=['GET'])
@requires_role(['student', 'teacher', 'admin'])
def get_courses():
    try:
        user = g.user
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 9, type=int)
        search_term = request.args.get('search', '')

        query = Course.query
        
        if user['role'] == 'student':
            query = query.filter_by(branch_id=user['branch_id'])
        elif user['role'] == 'teacher':
            query = query.filter_by(branch_id=user['branch_id'])
        
        if 'branch_id' in request.args:
            if user['role'] in ['admin']:
                query = query.filter_by(branch_id=request.args.get('branch_id'))

        # Add search filter
        if search_term:
            search = f"%{search_term}%"
            query = query.filter(
                db.or_(
                    Course.title.ilike(search),
                    Course.description.ilike(search)
                )
            )
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        courses = pagination.items
        
        return jsonify({
            "courses": [c.serialize() for c in courses],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
            "pages": pagination.pages
        }), 200
    except Exception as e:
        logger.error(f"Failed to fetch courses: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/courses/<int:course_id>', methods=['GET'])
@requires_role(['student', 'teacher', 'admin'])
def get_course(course_id):
    try:
        course = Course.query.get_or_404(course_id)
        user = g.user
        
        if user['role'] == 'student' and course.branch_id != user['branch_id']:
            return jsonify({"error": "Unauthorized access"}), 403
            
        return jsonify(course.serialize()), 200
    except Exception as e:
        logger.error(f"Failed to fetch course: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/courses/<int:course_id>', methods=['DELETE'])
@requires_role(['teacher', 'admin'])
def delete_course(course_id):
    try:
        user = g.user
        course = Course.query.get_or_404(course_id)
        
        if user['role'] == 'teacher' and (course.teacher_id != user['user_id'] or course.branch_id != user['branch_id']):
            return jsonify({"error": "Unauthorized to delete this course"}), 403

        course_data = course.serialize()
        db.session.delete(course)
        db.session.commit()

        publish_message(COURSE_EVENTS_EXCHANGE, {
        "event": "COURSE_DELETED",
        "course_id": course.id,
        "title": course.title,
        "description": course.description,
        "teacher_id": course.teacher_id,
        "branch_id": course.branch_id,
        "hls_url": course.hls_playlist,
        "thumbnail_url": course.thumbnail_url,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

        return jsonify({"message": "Course deleted successfully"}), 200
    except Exception as e:
        logger.error(f"Course deletion failed: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/teachers/<int:teacher_id>/courses', methods=['GET'])
@requires_role(['student', 'teacher', 'admin'])
def get_teacher_courses(teacher_id):
    try:
        user = g.user
        courses = Course.query.filter_by(teacher_id=teacher_id)
        
        if user['role'] == 'student':
            courses = courses.filter_by(branch_id=user['branch_id'])
        elif user['role'] == 'teacher':
            courses = courses.filter_by(branch_id=user['branch_id'])
            
        return jsonify([c.serialize() for c in courses]), 200
    except Exception as e:
        logger.error(f"Failed to fetch teacher courses: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/branches/<int:branch_id>/courses', methods=['GET'])
@requires_role(['admin', 'teacher', 'student'])
def get_branch_courses(branch_id):
    try:
        user = g.user
        if user['role'] == 'student' and branch_id != user['branch_id']:
            return jsonify({"error": "Unauthorized branch access"}), 403

        courses = Course.query.filter_by(branch_id=branch_id)
        return jsonify([c.serialize() for c in courses]), 200
    except Exception as e:
        logger.error(f"Failed to fetch branch courses: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/courses/<int:course_id>/branch', methods=['GET'])
def get_course_branch(course_id):
    course = Course.query.get_or_404(course_id)
    return jsonify({"course_id": course_id, "branch_id": course.branch_id}), 200

@app.route('/courses/<int:course_id>/view', methods=['POST'])
@requires_role(['student'])
def track_course_view(course_id):
    try:
        user = g.user
        course = Course.query.get_or_404(course_id)
        
        # Increment the course's view count
        course.views += 1
        db.session.commit()  # Save immediately

        
        if course.branch_id != user['branch_id']:
            return jsonify({"error": "Course not available in your branch"}), 403

        # Publish to the exchange instead of queue
        success = publish_message(
            'user_interactions',  # Exchange name
            {
                "event": "COURSE_VIEWED",
                "course_id": course_id,
                "student_id": user['user_id'],
                "branch_id": course.branch_id,  # Added

                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
        
        if not success:
            logger.error("Failed to publish view event")
        return jsonify({"message": "View tracked"}), 200
    except Exception as e:
        logger.error(f"View tracking failed: {e}")
        return jsonify({"error": "Internal server error"}), 500

# -------------------------
# New Endpoints: Like Feature
# -------------------------
@app.route('/courses/<int:course_id>/like', methods=['POST'])
@requires_role(['student', 'teacher', 'admin'])
def like_course(course_id):
    try:
        user = g.user
        course = Course.query.get_or_404(course_id)
        
        # Check if user already liked the course
        existing_like = CourseLike.query.filter_by(course_id=course_id, user_id=user['user_id']).first()
        if existing_like:
            return jsonify({"error": "Course already liked"}), 400
        
        new_like = CourseLike(course_id=course_id, user_id=user['user_id'])
        db.session.add(new_like)
        db.session.commit()
        publish_message('user_interactions', {
            "event": "COURSE_LIKED",
            "course_id": course_id,
            "student_id": user['user_id'],
            "branch_id": course.branch_id,  # Added

            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        )
        return jsonify({
            "message": "Course liked", 
            "like_count": len(course.likes),
            "is_liked": True
        }), 201
    except Exception as e:
        logger.error(f"Failed to like course: {e}")
        return jsonify({"error": "Internal server error"}), 500
    
@app.route('/courses/<int:course_id>/likes/status', methods=['GET'])
@requires_role(['student', 'teacher', 'admin'])
def check_like_status(course_id):
    user = g.user
    existing_like = CourseLike.query.filter_by(
        course_id=course_id, 
        user_id=user['user_id']
    ).first()
    
    return jsonify({
        "is_liked": existing_like is not None,
        "like_count": CourseLike.query.filter_by(course_id=course_id).count()
    }), 200


@app.route('/courses/<int:course_id>/like', methods=['DELETE'])
@requires_role(['student', 'teacher', 'admin'])
def unlike_course(course_id):
    try:
        user = g.user
        course = Course.query.get_or_404(course_id)
        
        existing_like = CourseLike.query.filter_by(course_id=course_id, user_id=user['user_id']).first()
        if not existing_like:
            return jsonify({"error": "Like not found"}), 404
        
        db.session.delete(existing_like)
        db.session.commit()
        publish_message('user_interactions', {
            "event": "COURSE_UNLIKED",
            "course_id": course_id,
            "student_id": user['user_id'],
            "branch_id": course.branch_id,  # Added

            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        )
        return jsonify({
            "message": "Course unliked",
            "like_count": len(course.likes),
            "is_liked": False
        }), 200
    except Exception as e:
        logger.error(f"Failed to unlike course: {e}")
        return jsonify({"error": "Internal server error"}), 500

# -------------------------
# RabbitMQ Consumer
# -------------------------
def consume_course_events():
    while True:
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host='rabbitmq'))
            channel = connection.channel()
            channel.queue_declare(queue='course_events', durable=True)

            def callback(ch, method, properties, body):
                event = json.loads(body)
                logger.info(f"Processing event: {event['event']}")

            channel.basic_consume(queue='course_events', on_message_callback=callback, auto_ack=True)
            channel.start_consuming()
        except Exception as e:
            logger.error(f"RabbitMQ connection error: {e}")
            time.sleep(5)

threading.Thread(target=consume_course_events, daemon=True).start()

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(NGINX_VOD_DIR, exist_ok=True)
    app.run(host='0.0.0.0', port=3002)
