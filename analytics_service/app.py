from datetime import datetime, timedelta, timezone
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
import pika
import threading
import json
import logging
import time
import requests
from collections import defaultdict
from sqlalchemy import func, and_
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///analytics.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Database models
class CourseView(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    course_id = db.Column(db.Integer, nullable=False)
    student_id = db.Column(db.Integer, nullable=False)
    branch_id = db.Column(db.Integer, nullable=False)  # Added

    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class CourseRating(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    course_id = db.Column(db.Integer, nullable=False)
    student_id = db.Column(db.Integer, nullable=False)
    branch_id = db.Column(db.Integer, nullable=False)  # Added

    rating = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class PlaylistInteraction(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    playlist_id = db.Column(db.Integer, nullable=False)
    course_id = db.Column(db.Integer, nullable=False)  
    branch_id = db.Column(db.Integer, nullable=False)  # Added

    student_id = db.Column(db.Integer, nullable=False)
    action = db.Column(db.String(50), nullable=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class UserEngagement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    course_id = db.Column(db.Integer, nullable=False)
    branch_id = db.Column(db.Integer, nullable=False)  # Added

    liked = db.Column(db.Boolean, default=False)
    commented = db.Column(db.Boolean, default=False)
    playlist_added = db.Column(db.Boolean, default=False)
    timestamp = db.Column(db.DateTime, default=datetime.now(timezone.utc))

    __table_args__ = (db.UniqueConstraint('user_id', 'course_id', name='_user_course_uc'),)

    
with app.app_context():
    db.create_all()

# In-memory cache for frequent queries
cache = {}
CACHE_EXPIRATION = 30  # 0.5 minutes

# RabbitMQ Consumer with enhanced error handling
def consume_user_interactions():
    while True:
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host='rabbitmq'))
            channel = connection.channel()
            
            # Declare the exchange (match course service's setup)
            channel.exchange_declare(
                exchange='user_interactions',
                exchange_type='fanout',
                durable=True
            )
            channel.queue_declare(queue='user_interactions', durable=True)
            channel.queue_bind(
                exchange='user_interactions',
                queue='user_interactions'
            )
            channel.basic_qos(prefetch_count=1)

            def callback(ch, method, properties, body):
                try:
                    with app.app_context():
                        event = json.loads(body)
                        logger.info(f"Processing event: {event['event']}")
                        
                        user_id = event.get('student_id') or event.get('user_id')
                        course_id = event.get('course_id')
                        branch_id = event['branch_id']  # Get from event payload

                        # Handle course view events
                        if event['event'] == 'COURSE_VIEWED':
                            logger.info(f"Adding CourseView for course {course_id}, student {user_id}")

                            course_view = CourseView(
                                course_id=course_id,
                                student_id=user_id,
                                branch_id=branch_id,  # Store branch_id

                                timestamp=datetime.fromisoformat(event['timestamp'])
                            )
                            db.session.add(course_view)

                        # Handle explicit ratings
                        elif event['event'] == 'COURSE_RATED':
                            course_rating = CourseRating(
                                course_id=course_id,
                                student_id=user_id,
                                branch_id=branch_id,
                                rating=event['rating'],
                                timestamp=datetime.fromisoformat(event['timestamp'])
                            )
                            db.session.merge(course_rating)  # Update if exists

                        # Handle likes and comments (new engagement system)
                        elif event['event'] in ['COURSE_LIKED', 'COURSE_UNLIKED']:
                            engagement = UserEngagement.query.filter_by(
                                user_id=user_id,
                                branch_id=branch_id,
                                course_id=course_id
                            ).first()

                            if not engagement:
                                engagement = UserEngagement(user_id=user_id, course_id=course_id,branch_id=branch_id)
                                db.session.add(engagement)

                            engagement.liked = (event['event'] == 'COURSE_LIKED')
                            update_rating_based_on_engagement(engagement)

                        elif event['event'] in ['COMMENT_ADDED', 'COMMENT_DELETED']:
                            engagement = UserEngagement.query.filter_by(
                                user_id=user_id,
                                course_id=course_id,
                                branch_id=branch_id
                            ).first()

                            if not engagement:
                                engagement = UserEngagement(user_id=user_id, course_id=course_id,branch_id=branch_id)
                                db.session.add(engagement)

                            engagement.commented = (event['event'] == 'COMMENT_ADDED')
                            update_rating_based_on_engagement(engagement)

                        # Handle playlist interactions
                        elif event['event'] == 'PLAYLIST_UPDATE':
                            # Only process course additions/removals
                            if 'course_id' not in event:
                                logger.warning("Ignoring playlist event without course_id")
                                return
                            
                            interaction = PlaylistInteraction(
                                playlist_id=event['playlist_id'],
                                student_id=user_id,
                                branch_id=branch_id,
                                course_id=event['course_id'],  # Add this field to PlaylistInteraction model
                                action=event['action'],
                                timestamp=datetime.fromisoformat(event['timestamp'])
                            )
                            db.session.add(interaction)

                            # Only update engagement for course-specific actions
                            if event['action'] in ['add', 'remove'] and 'course_id' in event:
                                engagement = UserEngagement.query.filter_by(
                                    user_id=user_id,
                                    branch_id=branch_id,
                                    course_id=event['course_id']
                                ).first()

                                if not engagement:
                                    engagement = UserEngagement(
                                        user_id=user_id,
                                        branch_id=branch_id,
                                        course_id=event['course_id']
                                    )
                                    db.session.add(engagement)

                                engagement.playlist_added = (event['action'] == 'add')
                                update_rating_based_on_engagement(engagement)

                        db.session.commit()
                        ch.basic_ack(delivery_tag=method.delivery_tag)

                except Exception as e:
                    logger.error(f"Event processing failed: {e}")
                    db.session.rollback()

            def update_rating_based_on_engagement(engagement):
                # Determine rating based on engagement hierarchy
                new_rating = 0
                if engagement.liked:
                    new_rating = 5
                elif engagement.commented:
                    new_rating = 4
                elif engagement.playlist_added:
                    new_rating = 3

                # Update or create rating record
                rating = CourseRating.query.filter_by(
                    student_id=engagement.user_id,
                    course_id=engagement.course_id,
                    branch_id=engagement.branch_id
                ).first()

                if new_rating > 0:
                    if rating:
                        rating.rating = new_rating
                    else:
                        rating = CourseRating(
                            course_id=engagement.course_id,
                            student_id=engagement.user_id,
                            branch_id=engagement.branch_id,

                            rating=new_rating
                        )
                        db.session.add(rating)
                elif rating:  # Remove rating if engagement drops below threshold
                    db.session.delete(rating)
            global cache
            if 'top_rated' in cache:
                del cache['top_rated']
            channel.basic_consume(queue='user_interactions', 
                                on_message_callback=callback,
                                auto_ack=False)
            channel.start_consuming()
            
        except Exception as e:
            logger.error(f"Connection error: {e}")
            time.sleep(5)


def build_user_item_matrix(interactions):
    """
    Build a user-item interactions matrix from CourseView and UserEngagement tables.
    interactions: list of dicts with user_id, course_id, score
    """
    user_index = {}
    item_index = {}
    for rec in interactions:
        uid = rec['user_id']
        iid = rec['course_id']
        if uid not in user_index:
            user_index[uid] = len(user_index)
        if iid not in item_index:
            item_index[iid] = len(item_index)

    matrix = np.zeros((len(user_index), len(item_index)))
    for rec in interactions:
        ui = user_index[rec['user_id']]
        ii = item_index[rec['course_id']]
        matrix[ui, ii] += rec['score']
    return matrix, user_index, item_index


def cosine_similarity(matrix):
    norm = np.linalg.norm(matrix, axis=1, keepdims=True)
    norm[norm == 0] = 1
    mat = matrix / norm
    return mat.dot(mat.T)


def recommend_collaborative(user_id, matrix, user_index, item_index, k=10):
    if user_id not in user_index:
        return []
    ui = user_index[user_id]
    sim = cosine_similarity(matrix)[ui]
    # pick top similar users
    top_users = np.argsort(sim)[::-1][1:5]
    scores = defaultdict(float)
    for tu in top_users:
        for item_idx, val in enumerate(matrix[tu]):
            if matrix[ui, item_idx] == 0 and val > 0:
                scores[item_idx] += sim[tu] * val
    # rank
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    inv_item = {v: k for k, v in item_index.items()}
    return [inv_item[i] for i, _ in ranked[:k]]


def recommend_hybrid(user_id, current_branch, viewed, interactions, branch_popular, top_rated, current_course_id=None):
    # 1. Collaborative
    matrix, uidx, iidx = build_user_item_matrix(interactions)
    collab = recommend_collaborative(user_id, matrix, uidx, iidx, k=5)

    # 2. Branch-popular
    pop = [c for c, _ in branch_popular if c not in viewed]

    # 3. Top-rated
    tr = [c for c in top_rated if c not in viewed]

    # 4. Diversity: interleave
    candidates = []
    sources = [collab, pop, tr]
    idxs = [0, 0, 0]
    while len(candidates) < 10 and any(idxs[i] < len(sources[i]) for i in range(3)):
        for i in range(3):
            if idxs[i] < len(sources[i]):
                cid = sources[i][idxs[i]]
                if cid not in candidates:
                    candidates.append(cid)
                idxs[i] += 1
            if len(candidates) >= 10:
                break
    return candidates[:10]



# Enhanced Analytics Endpoints
@app.route('/analytics/course/<int:course_id>', methods=['GET'])
def get_course_analytics(course_id):
    # Basic stats
    views_count = CourseView.query.filter_by(course_id=course_id).count()
    ratings = CourseRating.query.filter_by(course_id=course_id).all()
    
    # Rating distribution
    rating_dist = db.session.query(
        CourseRating.rating,
        func.count(CourseRating.id)
    ).filter_by(course_id=course_id).group_by(CourseRating.rating).all()
    
    # View trends (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    view_trend = db.session.query(
        func.date(CourseView.timestamp),
        func.count(CourseView.id)
    ).filter(and_(
        CourseView.course_id == course_id,
        CourseView.timestamp >= thirty_days_ago
    )).group_by(func.date(CourseView.timestamp)).all()
    
    return jsonify({
        "course_id": course_id,
        "views": {
            "total": views_count,
            "trend": [{"date": datetime.strptime(date_str, "%Y-%m-%d").strftime("%Y-%m-%d"), "count": count} 
                    for date_str, count in view_trend]        },
        "ratings": {
            "average": sum(r.rating for r in ratings)/len(ratings) if ratings else 0,
            "distribution": {str(rating): count for rating, count in rating_dist},
            "total": len(ratings)
        }
    })

@app.route('/analytics/recommendations/<int:student_id>', methods=['GET'])
def get_personalized_recommendations(student_id):
    try:
        viewed_courses = [cv.course_id for cv in CourseView.query.filter_by(student_id=student_id).all()]
        
        # Fallback if no data
        if not viewed_courses:
            return jsonify({"recommendations": [1, 2, 3, 4, 5]})  # Default IDs
        
        # Existing logic here...
        
    except Exception as e:
        logger.error(f"Recommendation error: {e}")
        return jsonify({"recommendations": [1, 2, 3, 4, 5]})  # Fallbackdef get_new_user_recommendations(student_id):
    """For users with minimal activity"""
    return [
        # Most viewed globally
        *[c[0] for c in db.session.query(CourseView.course_id)
          .group_by(CourseView.course_id)
          .order_by(func.count(CourseView.id).desc())
          .limit(3).all()],
        
        # Recently added courses
        *[c[0] for c in db.session.query(CourseView.course_id)
          .order_by(CourseView.timestamp.desc())
          .limit(3).all()]
    ]

# def get_fallback_recommendations():
    # Fallback to platform-wide popular courses
    try:
        # Combine global most viewed and most liked
        viewed = CourseView.query\
            .group_by(CourseView.course_id)\
            .order_by(func.count(CourseView.id).desc())\
            .limit(20)\
            .all()
            
        liked = UserEngagement.query.filter_by(liked=True)\
            .group_by(UserEngagement.course_id)\
            .order_by(func.count(UserEngagement.id).desc())\
            .limit(20)\
            .all()
        
        combined = [v.course_id for v in viewed] + [l.course_id for l in liked]
        return list(dict.fromkeys(combined))[:20]  # Deduplicate
        
    except Exception as e:
        logger.error(f"Fallback recommendations failed: {e}")
        return []
    
    
@app.route('/analytics/random', methods=['GET'])
def get_random_courses():
    try:
        random_ids = [c[0] for c in db.session.query(CourseView.course_id)
            .distinct()
            .order_by(func.random())
            .limit(10)
            .all()]
        if not random_ids:
            return jsonify([1, 2, 3, 4, 5])  # Default IDs
        return jsonify(random_ids)
    except Exception as e:
        logger.error(f"Random courses error: {e}")
        return jsonify([1, 2, 3, 4, 5])  # Fallback

@app.route('/analytics/top-rated', methods=['GET'])
def get_top_rated_courses():
    try:
        # Get top rated courses with at least 5 ratings
        top_rated = db.session.query(
            CourseRating.course_id,
            func.avg(CourseRating.rating).label('avg_rating')
        ).group_by(CourseRating.course_id
        ).having(func.count(CourseRating.id) >= 5
        ).order_by(func.avg(CourseRating.rating).desc()
        ).limit(10).all()
        
        return jsonify([course_id for course_id, _ in top_rated])
    except Exception as e:
        logger.error(f"Top rated courses error: {e}")
        return jsonify([])
# def get_fallback_recommendations():
    try:
        # Get top rated courses as fallback
        top_rated = db.session.query(
            CourseRating.course_id,
            func.avg(CourseRating.rating).label('avg_rating')
        ).group_by(CourseRating.course_id).having(
            func.count(CourseRating.id) >= 5
        ).order_by(func.avg(CourseRating.rating).desc()).limit(10).all()
        
        return [course_id for course_id, _ in top_rated]
    except Exception as e:
        logger.error(f"Fallback recommendations failed: {e}")
        return []

# def get_branch_popular_courses(branch_id):
    """Get courses weighted by engagement metrics"""
    engagement = db.session.query(
        CourseView.course_id,
        (func.count(CourseView.id) +          # Views
        func.sum(UserEngagement.liked * 3) +  # Likes
        func.sum(UserEngagement.commented * 2) +  # Comments
        func.sum((PlaylistInteraction.action == 'add') * 2))  # Playlist adds
    ).label('engagement_score') \
    .outerjoin(UserEngagement, and_(
        CourseView.course_id == UserEngagement.course_id,
        CourseView.branch_id == UserEngagement.branch_id
    )) \
    .outerjoin(PlaylistInteraction, and_(
        CourseView.course_id == PlaylistInteraction.course_id,
        CourseView.branch_id == PlaylistInteraction.branch_id
    )) \
    .filter(CourseView.branch_id == branch_id) \
    .group_by(CourseView.course_id) \
    .all()
    
    return sorted(engagement, key=lambda x: x[1], reverse=True)
# def get_top_rated_courses():
    cache_key = 'top_rated'
    if cache_key in cache:
        return cache[cache_key]
    
    result = db.session.query(
        CourseRating.course_id,
        func.avg(CourseRating.rating).label('avg_rating'),
        func.count(CourseRating.id).label('rating_count')
    ).group_by(CourseRating.course_id).having(func.count(CourseRating.id) >= 5).order_by(
        func.avg(CourseRating.rating).desc()
    ).limit(50).all()
    
    cache[cache_key] = [r[0] for r in result]
    return cache[cache_key]

# def get_frequently_paired(current_course_id):
    """Find courses most frequently appearing in the same playlists as the current course"""
    # Get all playlists containing the current course
    playlist_ids = [pi.playlist_id for pi in PlaylistInteraction.query.filter_by(
        course_id=current_course_id
    ).distinct()]
    
    # Get all courses in these playlists
    paired_courses = defaultdict(int)
    for playlist_id in playlist_ids:
        courses_in_playlist = [pi.course_id for pi in PlaylistInteraction.query.filter_by(
            playlist_id=playlist_id
        ).all()]
        
        for course_id in courses_in_playlist:
            if course_id != current_course_id:
                paired_courses[course_id] += 1
    
    return sorted(paired_courses.items(), key=lambda x: x[1], reverse=True)

# def prioritize_recommendations(viewed, branch_popular, top_rated, paired, current_course_id):
    recommendations = []
    
    # 1. Courses frequently paired in playlists (highest priority)
    paired = get_frequently_paired(current_course_id)
    recommendations.extend([c for c, _ in paired if c not in viewed])
    
    # 2. Engagement-weighted branch popularity
    engagement_scores = {course_id: score for course_id, score in branch_popular}
    sorted_by_engagement = sorted(branch_popular, key=lambda x: x[1], reverse=True)
    recommendations.extend([c for c, _ in sorted_by_engagement if c not in viewed and c not in recommendations])
    
    # 3. Top rated courses with high engagement
    recommendations.extend([c for c in top_rated if c not in viewed and c not in recommendations])
    
    return recommendations[:10]

@app.route('/analytics/engagement', methods=['GET'])
def get_engagement_metrics():
    # Daily active users
    daily_active = db.session.query(
        func.date(CourseView.timestamp),
        func.count(func.distinct(CourseView.student_id))
    ).filter(CourseView.timestamp >= datetime.now(timezone.utc) - timedelta(days=7)).group_by(
        func.date(CourseView.timestamp)
    ).all()
    
    # Course completion rates (assuming completion events)
    # Add your completion tracking logic here
    
    return jsonify({
        "daily_active_users": [
            {"date": datetime.strptime(date_str, "%Y-%m-%d").strftime("%Y-%m-%d"), "count": count} 
            for date_str, count in daily_active
        ],
        "weekly_engagement": {
            "total_views": CourseView.query.filter(
                CourseView.timestamp >= datetime.now(timezone.utc) - timedelta(days=7)
            ).count(),
            "total_ratings": CourseRating.query.filter(
                CourseRating.timestamp >= datetime.now(timezone.utc) - timedelta(days=7)
            ).count()
        }
    })

# Start RabbitMQ consumer
consumer_thread = threading.Thread(target=consume_user_interactions)
consumer_thread.daemon = True
consumer_thread.start()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3005)