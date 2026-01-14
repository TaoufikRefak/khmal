# playlist_service.py
from datetime import datetime, timezone
from flask import Flask, jsonify, request, g
from flask_sqlalchemy import SQLAlchemy
import pika
import threading
import json
import logging
import time
import os
import requests # Added for HTTP calls to Course service
from circuitbreaker import circuit # Can add circuit breaker if publishing is critical
from auth_lib import requires_role, decode_token # Assuming auth_lib correctly handles token validation
from sqlalchemy import func, and_ # Added for max order query

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Use environment variables for configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URI', 'sqlite:///playlist.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Environment configuration for external services
RABBITMQ_HOST = os.environ.get('RABBITMQ_HOST', 'rabbitmq')
COURSE_SERVICE_URL = os.environ.get('COURSE_SERVICE_URL', 'http://course_service:3002') # URL for Course service HTTP API

# --- RabbitMQ Configuration (Pub/Sub) ---
# Exchange for events related to courses (created, updated, deleted) - MUST match Course service
COURSE_EVENTS_EXCHANGE = 'course_events_exchange'
# Exchange/Queue for user interactions (views, likes, playlist updates) - Assuming this is a Work Queue for Analytics service
USER_INTERACTIONS_QUEUE = 'user_interactions' # Keeping as a queue name

# Unique queue name for this service's consumer of COURSE_EVENTS
COURSE_SYNC_PLAYLIST_QUEUE = 'course_sync_playlist_queue' # Consistent queue name

# -------------------------
# Models
# -------------------------
class Playlist(db.Model):
    __tablename__ = 'playlists'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(120), nullable=False)
    student_id = db.Column(db.Integer, nullable=False) # Student ID is the owner
    branch_id = db.Column(db.Integer, nullable=True) # Branch ID from the student's token
    is_public = db.Column(db.Boolean, default=True)
    # Courses will reference Course IDs from the Course service
    courses = db.relationship('PlaylistCourse', backref='playlist', cascade='all, delete-orphan')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))


class PlaylistCourse(db.Model):
    __tablename__ = 'playlist_courses'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    playlist_id = db.Column(db.Integer, db.ForeignKey('playlists.id', ondelete='CASCADE'), nullable=False)
    course_id = db.Column(db.Integer, nullable=False) # Reference to external Course ID
    # No foreign key constraint here as Course service owns Course table
    order = db.Column(db.Integer, nullable=True) # Optional: Add order for custom sorting

    # Add composite unique constraint to prevent adding the same course twice to the same playlist
    __table_args__ = (db.UniqueConstraint('playlist_id', 'course_id', name='_playlist_course_uc'),)

# playlist_service.py
class Course(db.Model):
    __tablename__ = 'courses'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    teacher_id = db.Column(db.Integer, nullable=False)
    branch_id = db.Column(db.Integer, nullable=False)
    hls_url = db.Column(db.String(255), nullable=False)
    thumbnail_url = db.Column(db.String(255))
    deleted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

# Initialize database
with app.app_context():
    db.create_all()

# -------------------------
# Robust RabbitMQ Publisher (Shared logic across services)
# -------------------------
# Reusing the robust publisher logic
@circuit(failure_threshold=5, recovery_timeout=60) # Add circuit breaker here if desired
def publish_message(destination, message, destination_type='queue', retries=3, delay=2):
    """Publishes a message to a RabbitMQ queue or exchange with basic retry."""
    connection = None
    attempt = 0
    while attempt < retries:
        try:
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(
                    host=RABBITMQ_HOST,
                    heartbeat=600,
                    blocked_connection_timeout=300
                )
            )
            channel = connection.channel()

            if destination_type == 'queue':
                 # Declare the queue - MUST match consuming services
                 channel.queue_declare(queue=destination, durable=True)
                 exchange = '' # Default exchange
                 routing_key = destination # Queue name as routing key for default exchange
            elif destination_type == 'exchange':
                 # Declare the exchange - MUST match consuming services
                 channel.exchange_declare(exchange=destination, exchange_type='fanout', durable=True) # Assuming fanout for events
                 exchange = destination
                 routing_key = '' # Routing key might be empty for fanout
            else:
                 logger.error(f"Invalid destination_type '{destination_type}' for message publishing.")
                 return False


            channel.basic_publish(
                exchange=exchange,
                routing_key=routing_key,
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    delivery_mode=2, # Make message persistent
                    content_type='application/json'
                )
            )
            logger.info(f"Published message to {destination_type} '{destination}': {message}")
            connection.close()
            return True # Success
        except pika.exceptions.AMQPConnectionError as e:
            attempt += 1
            logger.error(f"RabbitMQ Connection Error during publish (Attempt {attempt}/{retries}): {e}. Retrying in {delay}s...", exc_info=True)
            time.sleep(delay)
        except Exception as e:
            logger.error(f"Failed to publish message after {attempt+1} attempts: {e}", exc_info=True)
            attempt += 1
            time.sleep(delay)
        finally:
            if connection and not connection.is_closed:
                try:
                    connection.close()
                except Exception as close_err:
                    logger.error(f"Error closing RabbitMQ connection after publish attempt: {close_err}")

    logger.critical(f"🚨 Failed to publish message to {destination_type} '{destination}' after {retries} attempts. Message dropped: {message}")
    return False # Failure


# -------------------------
# RabbitMQ Consumer
# -------------------------
COURSE_EVENTS_EXCHANGE = 'course_events_exchange'
COURSE_SYNC_QUEUE = 'playlist_course_sync_queue'  # Unique queue for this service

def consume_course_events():
    """Mirror Auth/User service consumer pattern"""
    while True:
        try:
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(host=RABBITMQ_HOST)
            )
            channel = connection.channel()
            
            # Match Auth/User service queue/exchange setup
            channel.exchange_declare(
                exchange=COURSE_EVENTS_EXCHANGE,
                exchange_type='fanout',
                durable=True
            )
            
            channel.queue_declare(
                queue=COURSE_SYNC_QUEUE,
                durable=True,
                arguments={'x-queue-type': 'quorum'}
            )
            
            channel.queue_bind(
                exchange=COURSE_EVENTS_EXCHANGE,
                queue=COURSE_SYNC_QUEUE
            )

            channel.basic_qos(prefetch_count=1)
            
            def callback(ch, method, properties, body):
                try:
                    event = json.loads(body)
                    # Mirror Auth/User service's DB session handling
                    with app.app_context():
                        if event['event'] == 'COURSE_CREATED':
                            course = Course(
                                id=event['course_id'],
                                title=event['title'],
                                description=event['description'],
                                teacher_id=event['teacher_id'],
                                branch_id=event['branch_id'],
                                hls_url=event['hls_url'],
                                thumbnail_url=event['thumbnail_url']
                            )
                            db.session.merge(course)
                            db.session.commit()
                            
                        elif event['event'] == 'COURSE_UPDATED':
                            course = Course.query.get(event['course_id'])
                            if course:
                                course.title = event.get('title', course.title)
                                course.description = event.get('description', course.description)
                                course.hls_url = event.get('hls_url', course.hls_url)
                                db.session.commit()
                                
                        elif event['event'] == 'COURSE_DELETED':
                            PlaylistCourse.query.filter_by(course_id=event['course_id']).delete()
    
                            # Delete or mark the local course replica as deleted
                            course = Course.query.get(event['course_id'])
                            if course:
                                db.session.delete(course)  # Or set course.deleted = True
                            db.session.commit()
                                
                        ch.basic_ack(delivery_tag=method.delivery_tag)
                except Exception as e:
                    logger.error(f"Failed processing event: {e}")
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

            channel.basic_consume(
                queue=COURSE_SYNC_QUEUE,
                on_message_callback=callback,
                auto_ack=False
            )
            channel.start_consuming()
            
        except pika.exceptions.AMQPConnectionError:
            logger.error("Connection lost, retrying in 5s...")
            time.sleep(5)
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            time.sleep(5)

# Start consumer thread (add with other initializations)
threading.Thread(target=consume_course_events, daemon=True).start()

# -------------------------
# Helper to Fetch Course Details
# -------------------------
def get_course_details(course_id, token):
    """Fetches course details from the Course service."""
    try:
        headers = {'Authorization': token}        # Add timeout to prevent hanging
        # Pass branch_id of the current user if needed for Course service auth
        user_branch_id = g.user.get('branch_id')
        params = {'branch_id': user_branch_id} if user_branch_id is not None else {}
        response = requests.get(f"{COURSE_SERVICE_URL}/courses/{course_id}", headers=headers, params=params, timeout=5)
        response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)
        return response.json()
    except requests.exceptions.Timeout:
        logger.error(f"Timeout fetching course {course_id} from Course Service.")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching course {course_id} from Course Service (Status: {getattr(e.response, 'status_code', 'N/A')}): {e}")
        return None # Return None on failure
    except Exception as e:
         logger.error(f"Unexpected error fetching course {course_id}: {e}")
         return None


# -------------------------
# API Endpoints
# -------------------------
# (Endpoints remain largely the same, using the new publish_message and updated auth/error handling)
@app.route('/playlists', methods=['POST'])
@requires_role(['student', 'admin']) # Only students and admins can create playlists
def create_playlist():
    try:
        user = g.user # User info from auth_lib

        # Only allow creating playlists for the authenticated user's ID
        # Admin might create for others, but simple implementation assumes owner is the token user
        owner_student_id = user['user_id']
        owner_branch_id = user['branch_id'] # Assume playlist is tied to owner's branch

        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({"error": "Playlist name required"}), 400

        playlist_name = data['name'].strip()
        if not playlist_name:
             return jsonify({"error": "Playlist name cannot be empty"}), 400

        is_public = bool(data.get('is_public', True)) # Default to True, but allow explicit false


        new_playlist = Playlist(
            name=playlist_name,
            student_id=owner_student_id,
            branch_id=owner_branch_id,
            is_public=is_public
        )
        db.session.add(new_playlist)
        db.session.commit()

        logger.info(f"Playlist created: ID {new_playlist.id}, Owner {new_playlist.student_id}, Branch {new_playlist.branch_id}")
        return jsonify({"message": "Playlist created", "id": new_playlist.id}), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Playlist creation error: {str(e)}", exc_info=True)
        return jsonify({"error": "Playlist creation failed"}), 500

@app.route('/playlists/<int:playlist_id>/courses', methods=['POST'])
@requires_role(['student', 'admin'])
def add_course_to_playlist(playlist_id):
    try:
        user = g.user
        playlist = db.session.get(Playlist, playlist_id)
        if not playlist:
            return jsonify({"error": "Playlist not found"}), 404

        # Authorization check
        if playlist.student_id != user['user_id'] and user['role'] != 'admin':
            return jsonify({"error": "Unauthorized to modify this playlist"}), 403

        data = request.get_json()
        logger.info(f"Received data for playlist {playlist_id}: {data}")

        course_id = data.get('course_id')
        logger.info(f"Extracted course_id: {course_id}")

        if course_id is None:
            logger.warning("No course_id provided in request data.")
            return jsonify({"error": "Course ID required"}), 400

        # 1. Check local course replica
        course = Course.query.get(course_id)
        if not course or course.deleted:
            logger.warning(f"Course {course_id} not found or marked as deleted.")
            return jsonify({"error": "Course not available"}), 400

        # 2. Validate branch consistency
        if course.branch_id != playlist.branch_id:
            logger.warning(f"Course {course_id} branch {course.branch_id} does not match playlist branch {playlist.branch_id}.")
            return jsonify({"error": "Cannot add course from different branch"}), 400

        # 3. Check existing association
        if PlaylistCourse.query.filter_by(
            playlist_id=playlist_id,
            course_id=course_id
        ).first():
            logger.warning(f"Course {course_id} already in playlist {playlist_id}.")
            return jsonify({"error": "Course already in playlist"}), 400

        # 4. Determine order (simplified version)
        max_order = db.session.query(func.max(PlaylistCourse.order)).filter_by(
            playlist_id=playlist_id
        ).scalar() or 0

        association = PlaylistCourse(
            playlist_id=playlist_id,
            course_id=course_id,
            order=max_order + 1
        )

        db.session.add(association)
        db.session.commit()

        # Publish event
        publish_message(USER_INTERACTIONS_QUEUE, {
            "event": "PLAYLIST_UPDATE",
            "user_id": user['user_id'],
            "playlist_id": playlist_id,
            "course_id": course_id,
            "branch_id": playlist.branch_id,  # Added

            "action": "add",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, destination_type='queue')

        return jsonify({"message": "Course added to playlist"}), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Course addition error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to add course"}), 500
    
    
@app.route('/playlists/<int:playlist_id>/courses/<int:course_id>', methods=['DELETE'])
@requires_role(['student', 'admin']) # Only playlist owner or admin can add/remove courses
def remove_course_from_playlist(playlist_id, course_id):
    try:
        user = g.user # User info from auth_lib

        # Replace get_or_404
        playlist = db.session.get(Playlist, playlist_id)
        if not playlist:
             return jsonify({"error": "Playlist not found"}), 404

        # Authorization: Must be the owner of the playlist or an admin
        if playlist.student_id != user['user_id'] and user['role'] != 'admin':
            return jsonify({"error": "Unauthorized to modify this playlist"}), 403

        association = PlaylistCourse.query.filter_by(
            playlist_id=playlist_id,
            course_id=course_id
        ).first() # Use first(), not first_or_404, handle not found explicitly

        if not association:
            return jsonify({"error": "Course not found in playlist"}), 404

        db.session.delete(association)
        db.session.commit()

        # Optional: Reorder remaining items after deletion
        # This is complex and might be better as a separate endpoint/task
        # For now, just keep the existing order numbers as they are.

        # Publish interaction event
        publish_message(USER_INTERACTIONS_QUEUE, {
            "event": "PLAYLIST_UPDATE",
            "user_id": user['user_id'],
            "playlist_id": playlist_id,
            "branch_id": playlist.branch_id,  # Added
            "course_id": course_id,
            "action": "remove",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, destination_type='queue') # CORRECTED publish call


        logger.info(f"Course {course_id} removed from playlist {playlist_id} by user {user['user_id']}")
        return jsonify({"message": "Course removed from playlist"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Course removal error from playlist {playlist_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to remove course"}), 500

@app.route('/playlists/<int:playlist_id>', methods=['PUT'])
@requires_role(['student', 'admin']) # Only playlist owner or admin can update metadata
def update_playlist(playlist_id):
    try:
        user = g.user # User info from auth_lib
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Replace get_or_404
        playlist = db.session.get(Playlist, playlist_id)
        if not playlist:
             return jsonify({"error": "Playlist not found"}), 404

        # Authorization: Must be the owner of the playlist or an admin
        if playlist.student_id != user['user_id'] and user['role'] != 'admin':
            return jsonify({"error": "Unauthorized to update this playlist"}), 403

        updated = False
        if 'name' in data:
            new_name = data['name'].strip()
            if not new_name:
                return jsonify({"error": "Playlist name cannot be empty"}), 400
            playlist.name = new_name
            updated = True

        if 'is_public' in data:
             # Only allow admin or owner to change public status
             # If user is admin, they can set is_public for any playlist they are authorized to update
             # If user is owner, they can set is_public for their playlist
             if user['role'] == 'admin' or playlist.student_id == user['user_id']:
                  playlist.is_public = bool(data['is_public'])
                  updated = True
             else:
                  # Should not happen with the check above, but defensive
                  return jsonify({"error": "Unauthorized to change public status"}), 403

        # Optional: Handle reordering courses via a dedicated endpoint/data structure in PUT payload
        # Example: data = {"courses": [{"course_id": 1, "order": 0}, {"course_id": 5, "order": 1}, ...]}
        if 'courses' in data and isinstance(data['courses'], list):
             # This requires validating course_ids exist in the playlist and updating their 'order' field
             # This is a significant addition, skipping for just fixing the logs.

             pass # Add reordering logic here if needed


        if updated:
             # Update timestamp is automatic with onupdate
             db.session.commit()
             logger.info(f"Playlist {playlist_id} updated by user {user['user_id']}")

        return jsonify({"message": "Playlist updated"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Playlist update error for {playlist_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to update playlist"}), 500

@app.route('/playlists/<int:playlist_id>', methods=['DELETE'])
@requires_role(['student', 'admin']) # Only playlist owner or admin can delete
def delete_playlist(playlist_id):
    try:
        user = g.user # User info from auth_lib

        # Replace get_or_404
        playlist = db.session.get(Playlist, playlist_id)
        playlist_branch = playlist.branch_id if playlist else None # Get branch_id for logging
        if not playlist:
             return jsonify({"error": "Playlist not found"}), 404

        # Authorization: Must be the owner of the playlist or an admin
        if playlist.student_id != user['user_id'] and user['role'] != 'admin':
            return jsonify({"error": "Unauthorized to delete this playlist"}), 403

        # SQLAlchemy with cascade='all, delete-orphan' on the relationship should delete PlaylistCourse entries automatically
        db.session.delete(playlist)
        db.session.commit()

        # Optional: Publish event for playlist deletion (for analytics maybe)
        publish_message(USER_INTERACTIONS_QUEUE, {
             "event": "PLAYLIST_UPDATE",
             "user_id": user['user_id'],
             "playlist_id": playlist_id,
             "branch_id": playlist_branch,  # Added

             "action": "delete",
             "timestamp": datetime.now(timezone.utc).isoformat()
        }, destination_type='queue')


        logger.info(f"Playlist {playlist_id} deleted by user {user['user_id']}")
        return jsonify({"message": "Playlist deleted"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Playlist deletion error for {playlist_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to delete playlist"}), 500


@app.route('/playlists/public', methods=['GET'])
# Allow anyone authenticated to see public playlists in their branch
@requires_role(['student', 'teacher', 'admin', 'moderator'])
def get_public_playlists():
    try:
        user = g.user
        user_branch_id = user.get('branch_id') # Get branch_id from token, could be None for admin

        # Filter public playlists by the user's branch, unless admin (who sees all)
        if user['role'] == 'admin':
             playlists = Playlist.query.filter_by(is_public=True).all()
        elif user_branch_id is not None:
             playlists = Playlist.query.filter_by(
                 is_public=True,
                 branch_id=user_branch_id
             ).all()
        else:
             # Should not happen if role is defined and auth_lib is correct
             return jsonify({"error": "Invalid user role or missing branch_id"}), 400


        # To get course_count, load the relationship
        # This can be inefficient if there are many playlists
        # Maybe eager load or use a join in the query if performance is an issue
        result = []
        for p in playlists:
             # No need to refresh if fetching relationships. SQLAlchemy loads lazily or via eager loading.
             # For performance, could use: db.session.query(Playlist.id, Playlist.name, ..., func.count(PlaylistCourse.id).label('course_count')).join(PlaylistCourse).group_by(Playlist.id).filter(...).all()
             result.append({
                 "id": p.id,
                 "name": p.name,
                 "owner_student_id": p.student_id,
                 "student_id": p.student_id,  # Key name matches frontend

                 "branch_id": p.branch_id,
                 "course_count": len(p.courses), # Accessing relationship loads it if not eager loaded
                 "created_at": p.created_at.isoformat() if p.created_at else None,
                 "updated_at": p.updated_at.isoformat() if p.updated_at else None
             })

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Public playlists error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve playlists"}), 500
# Add to playlist_service.py

@app.route('/playlists/<int:playlist_id>/courses', methods=['DELETE'])
@requires_role(['student', 'admin'])
def remove_all_courses(playlist_id):
    try:
        playlist = Playlist.query.get_or_404(playlist_id)
        
        # Authorization check
        if playlist.student_id != g.user['user_id'] and g.user['role'] != 'admin':
            return jsonify({"error": "Unauthorized"}), 403
        
        PlaylistCourse.query.filter_by(playlist_id=playlist_id).delete()
        db.session.commit()
        
        return jsonify({"message": "All courses removed from playlist"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error removing all courses: {str(e)}")
        return jsonify({"error": "Failed to remove courses"}), 500
    

    
@app.route('/playlists', methods=['GET'])
# Authenticated users can get *their own* playlists. Admin can get others.
@requires_role(['student', 'admin']) # Teachers/Moderators might not have personal playlists in this system
def get_user_playlists():
    try:
        user = g.user # User info from auth_lib

        # This endpoint is for getting playlists owned by the authenticated user.
        # An admin could potentially provide a user_id query param to see others' playlists.
        target_user_id = user['user_id']
        if 'user_id' in request.args:
            try:
                requested_user_id = int(request.args['user_id'])
            except ValueError:
                return jsonify({"error": "Invalid user_id format"}), 400

            if user['role'] == 'admin':
                target_user_id = requested_user_id  # Admin can view any user
            else:
                # Non-admin can only request their own playlists
                if requested_user_id != user['user_id']:
                    return jsonify({"error": "Unauthorized to view other users' playlists"}), 403

        playlists = Playlist.query.filter_by(student_id=target_user_id).all()

        result = []
        for p in playlists:
             # As in get_public_playlists, accessing p.courses here
             result.append({
                 "id": p.id,
                 "name": p.name,
                 "is_public": p.is_public,
                 "branch_id": p.branch_id,
                 "course_count": len(p.courses),
                 "created_at": p.created_at.isoformat() if p.created_at else None,
                 "updated_at": p.updated_at.isoformat() if p.updated_at else None
             })


        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error retrieving user playlists for user {target_user_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve playlists"}), 500

@app.route('/playlists/<int:playlist_id>', methods=['GET'])
# Allow access if public (any auth role in same branch) or if owner (student/admin)
@requires_role(['student', 'teacher', 'admin', 'moderator'])
def get_playlist(playlist_id):
    try:
        user = g.user # User info from auth_lib
        user_branch_id = user.get('branch_id')

        # Replace get_or_404
        playlist = db.session.get(Playlist, playlist_id)
        if not playlist:
            return jsonify({"error": "Playlist not found"}), 404

        # Authorization: Check if owner OR admin OR (public AND in same branch)
        is_owner = playlist.student_id == user['user_id']
        is_admin = user['role'] == 'admin'
        is_public_in_same_branch = playlist.is_public and user_branch_id is not None and playlist.branch_id == user_branch_id

        if not any([is_owner, is_admin, is_public_in_same_branch]):
             return jsonify({"error": "Unauthorized access"}), 403

        # Fetch course details for each course in the playlist from the Course Service
        courses_details = []
        # Sort by order, then by id if order is the same or None
        for pc in sorted(playlist.courses, key=lambda x: (x.order is not None, x.order if x.order is not None else x.id)):
            # Pass the requesting user's token for the downstream call
            course_detail = get_course_details(pc.course_id, request.headers.get('Authorization'))
            if course_detail:
                courses_details.append({
                    "id": course_detail.get('id'), # Use .get() for safety
                    "title": course_detail.get('title', 'Unknown Title'),
                    "description": course_detail.get('description', ''),
                    "hls_url": course_detail.get('hls_url', ''),
                    "branch_id": course_detail.get('branch_id'), # Include branch_id from course service
                    "playlist_order": pc.order # Include order from playlist_course association
                    # Add other course details as needed
                })
            else:
                 # Handle case where course details couldn't be fetched (e.g., course deleted externally without event, or Course Service error)
                 # Decide how to handle this - omit the course, or show placeholder? Omit is safer.
                 logger.warning(f"Could not fetch details for course ID {pc.course_id} in playlist {playlist_id}.")
                 # Optionally add a placeholder indicating the course is missing
                 # courses_details.append({
                 #     "id": pc.course_id,
                 #     "title": "Missing Course",
                 #     "description": "Details unavailable",
                 #     "hls_url": None,
                 #     "branch_id": None,
                 #     "playlist_order": pc.order
                 # })


        return jsonify({
            "id": playlist.id,
            "name": playlist.name,
            "is_public": playlist.is_public,
            "owner_student_id": playlist.student_id,
            "branch_id": playlist.branch_id,
            "created_at": playlist.created_at.isoformat() if playlist.created_at else None,
            "updated_at": playlist.updated_at.isoformat() if playlist.updated_at else None,
            "courses": courses_details
        }), 200

    except Exception as e:
        logger.error(f"Get playlist error for {playlist_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve playlist"}), 500

@app.route('/playlists/<int:playlist_id>/courses/<int:course_id>/next', methods=['GET'])
# Same access rules as getting the playlist itself
@requires_role(['student', 'teacher', 'admin', 'moderator'])
def get_next_video(playlist_id, course_id):
    try:
        user = g.user
        user_branch_id = user.get('branch_id')

        # Retrieve the playlist and verify access rights.
        # Replace get_or_404
        playlist = db.session.get(Playlist, playlist_id)
        if not playlist:
             return jsonify({"error": "Playlist not found"}), 404

        # Authorization: Check if owner OR admin OR (public AND in same branch)
        is_owner = playlist.student_id == user['user_id']
        is_admin = user['role'] == 'admin'
        is_public_in_same_branch = playlist.is_public and user_branch_id is not None and playlist.branch_id == user_branch_id

        if not any([is_owner, is_admin, is_public_in_same_branch]):
             return jsonify({"error": "Unauthorized access"}), 403

        # Retrieve all playlist courses ordered by the 'order' field, falling back to 'id'
        playlist_courses = PlaylistCourse.query.filter_by(
            playlist_id=playlist_id
        ).order_by(PlaylistCourse.order.asc(), PlaylistCourse.id.asc()).all()

        # Find the index of the current course.
        current_index = None
        for idx, item in enumerate(playlist_courses):
            if item.course_id == course_id:
                current_index = idx
                break

        if current_index is None:
            # This course is not in the authorized playlist
            # Could return 404 or 403 depending on whether the course ID itself is sensitive info
            # Let's return 404 as it's not found *in the context of this playlist*
            return jsonify({"error": "Course not found in playlist"}), 404

        # Return the next course if it exists.
        if current_index < len(playlist_courses) - 1:
            next_course_assoc = playlist_courses[current_index + 1]
            next_course_id = next_course_assoc.course_id

            # Fetch details for the next course from the Course Service
            # Pass the requesting user's token for the downstream call
            next_course_detail = get_course_details(next_course_id, request.headers.get('Authorization'))

            if next_course_detail:
                # Only return essential details for the next video playback
                return jsonify({
                    "id": next_course_detail.get('id'),
                    "title": next_course_detail.get('title', 'Unknown Title'),
                    "description": next_course_detail.get('description', ''),
                    "hls_url": next_course_detail.get('hls_url', '')
                    # Add other relevant details like duration if available from Course service
                }), 200
            else:
                 # Failed to fetch details for the next course
                 logger.warning(f"Could not fetch details for next course ID {next_course_id} in playlist {playlist_id}.")
                 # Decide error response - 404 if course deleted, 500 if course service is down
                 # A generic 500 might be appropriate if Course Service is unresponsive
                 return jsonify({"error": "Failed to retrieve details for the next course"}), 500


        else:
            # This is the last video
            return jsonify({"message": "This is the last video in the playlist"}), 200

    except Exception as e:
        logger.error(f"Get next video error for playlist {playlist_id}, course {course_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve next video"}), 500


# Error Handler (can be generic)
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({"error": "Resource not found"}), 404

@app.errorhandler(403)
def forbidden_error(error):
    # error.description might contain the reason from requires_role
    return jsonify({"error": error.description or "Forbidden"}), 403

@app.errorhandler(400)
def bad_request_error(error):
     # error.description might contain the reason
     return jsonify({"error": error.description or "Bad Request"}), 400

# Generic Error Handler for unexpected exceptions
@app.errorhandler(500)
def internal_error(error):
    # Log the error appropriately, ensure stack trace is captured
    logger.error(f"Unhandled internal server error: {error}", exc_info=True)
    return jsonify({"error": "Internal server error"}), 500


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    logger.info("Playlist Service starting...")
    # In production, use a production-ready WSGI server like Gunicorn
    app.run(host='0.0.0.0', port=3004, debug=False)