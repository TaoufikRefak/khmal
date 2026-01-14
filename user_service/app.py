# user_service.py (Updated)

from datetime import datetime
from flask import Flask, jsonify, request, g
from flask_sqlalchemy import SQLAlchemy
import pika
import threading
import json
import logging
import time
import os # Import os for environment variables
from auth_lib import requires_role, decode_token
from circuitbreaker import circuit

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Use environment variables!
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URI', 'sqlite:///user.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- RabbitMQ Configuration ---
RABBITMQ_HOST = os.environ.get('RABBITMQ_HOST', 'rabbitmq')
USER_EVENTS_EXCHANGE = 'user_events_exchange' # New exchange name - MUST match auth service
USER_SYNC_USER_SERVICE_QUEUE = 'user_sync_user_service_queue' # New queue name for user service consumer

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(80), nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    role = db.Column(db.String(20), nullable=False)
    branch_id = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "branch_id": self.branch_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

with app.app_context():
    db.create_all()

# RabbitMQ Publisher
@circuit(failure_threshold=5, recovery_timeout=60)
def publish_message(exchange, routing_key, message): # Modified signature
    """Publishes a message to a RabbitMQ exchange with circuit breaker."""
    connection = None
    try:
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=RABBITMQ_HOST, # Use env var host
                heartbeat=600,
                blocked_connection_timeout=300
            )
        )
        channel = connection.channel()
        # Declare the exchange - MUST match consuming services
        channel.exchange_declare(exchange=exchange, exchange_type='fanout', durable=True) # Declare as fanout

        channel.basic_publish(
            exchange=exchange,       # Publish to the exchange
            routing_key=routing_key, # Empty routing key for fanout
            body=json.dumps(message),
            properties=pika.BasicProperties(
                delivery_mode=2,
                content_type='application/json'
            )
        )
        logger.info(f"Published message to exchange '{exchange}' with routing key '{routing_key}': {message}")
        connection.close()
    except pika.exceptions.AMQPConnectionError as e:
        logger.error(f"RabbitMQ Connection Error during publish: {e}")
        raise
    except Exception as e:
        logger.error(f"Failed to publish message: {e}")
        raise
    finally:
        if connection and not connection.is_closed:
            try:
                connection.close()
            except Exception as close_err:
                logger.error(f"Error closing RabbitMQ connection after publish: {close_err}")


# User Endpoints
@app.route('/users/<int:user_id>', methods=['GET'])
@requires_role(['student', 'teacher', 'admin', 'moderator'])
def get_user(user_id):
    try:
        requester = g.user
        target_user = db.session.get(User, user_id) # Use db.session.get
        if not target_user:
            return jsonify({"error": "User not found"}), 404

        if requester['role'] == 'student' and requester['user_id'] != user_id:
            return jsonify({"error": "Unauthorized access"}), 403

        if requester['role'] == 'teacher' and not (
            requester['user_id'] == user_id or
            (target_user.role == 'student' and target_user.branch_id is not None and target_user.branch_id == requester.get('branch_id'))
        ):
             return jsonify({"error": "Unauthorized access"}), 403

        return jsonify(target_user.serialize()), 200
    except Exception as e:
        logger.error(f"Error fetching user {user_id}: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500
    



@app.route('/users/me', methods=['GET'])
@requires_role(['student', 'teacher', 'admin', 'moderator'])
def get_current_user():
    try:
        requester = g.user
        user = db.session.get(User, requester['user_id'])
        if not user:
            # If a token is valid but the user doesn't exist in the User DB, it's a data inconsistency.
            # A 500 might be more appropriate than 404 here, or a specific error code.
            logger.error(f"User {requester['user_id']} from token not found in User DB.")
            return jsonify({"error": "User profile data not found"}), 404 # Keeping 404 as it's expected by client
        return jsonify(user.serialize()), 200
    except Exception as e:
        logger.error(f"Error fetching current user: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


@app.route('/users/<int:user_id>', methods=['PUT'])
@requires_role(['admin', 'teacher', 'student'])
def update_user(user_id):
    try:
        requester = g.user
        target_user = db.session.get(User, user_id) # Use db.session.get
        if not target_user:
             return jsonify({"error": "User not found"}), 404

        data = request.get_json()
        if not data:
             return jsonify({"error": "No input data provided"}), 400

        if requester['role'] != 'admin' and requester['user_id'] != user_id:
            return jsonify({"error": "Unauthorized update"}), 403

        if 'role' in data:
            if requester['role'] != 'admin':
                 return jsonify({"error": "Only admins can modify roles"}), 403
            valid_roles = ['student', 'teacher', 'admin', 'moderator']
            if data['role'] not in valid_roles:
                return jsonify({"error": f"Invalid role: {data['role']}. Valid roles are {valid_roles}"}), 400
            target_user.role = data['role']

        if 'branch_id' in data:
            if requester['role'] != 'admin':
                 return jsonify({"error": "Only admins can modify branches"}), 403
            if not isinstance(data['branch_id'], (int, type(None))):
                return jsonify({"error": "Invalid branch_id format, must be integer or null"}), 400
            target_user.branch_id = data['branch_id']

        if 'name' in data:
            if not isinstance(data['name'], str) or not data['name'].strip():
                 return jsonify({"error": "Name cannot be empty"}), 400
            target_user.name = data['name'].strip()

        if 'email' in data:
             if not isinstance(data['email'], str) or '@' not in data['email'] or '.' not in data['email'].split('@')[-1]:
                 return jsonify({"error": "Invalid email format"}), 400
             existing_user = User.query.filter(User.email == data['email'], User.id != user_id).first()
             if existing_user:
                 return jsonify({"error": "Email already exists"}), 409
             target_user.email = data['email']

        db.session.commit()

        # Publish message to the EXCHANGE
        publish_message(USER_EVENTS_EXCHANGE, '', { # Use exchange, empty routing key
            "event": "USER_UPDATED",
            "user_id": target_user.id,
            "email": target_user.email,
            "name": target_user.name,
            "role": target_user.role,
            "branch_id": target_user.branch_id
        })

        return jsonify(target_user.serialize()), 200
    except Exception as e:
        logger.error(f"Error updating user {user_id}: {e}", exc_info=True)
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

@app.route('/users/<int:user_id>', methods=['DELETE'])
@requires_role(['admin'])
def delete_user(user_id):
    try:
        target_user = db.session.get(User, user_id) # Use db.session.get
        if not target_user:
             return jsonify({"error": "User not found"}), 404

        db.session.delete(target_user)
        db.session.commit()

        # Publish message to the EXCHANGE
        publish_message(USER_EVENTS_EXCHANGE, '', { # Use exchange, empty routing key
            "event": "USER_DELETED",
            "user_id": user_id
        })

        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        logger.error(f"Error deleting user {user_id}: {e}", exc_info=True)
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

@app.route('/users', methods=['GET'])
@requires_role(['admin', 'moderator'])
def list_users():
    try:
        role_filter = request.args.get('role')
        branch_filter_str = request.args.get('branch_id')

        query = User.query

        if role_filter:
            valid_roles = ['student', 'teacher', 'admin', 'moderator']
            if role_filter not in valid_roles:
                 return jsonify({"error": f"Invalid role filter: {role_filter}. Valid roles are {valid_roles}"}), 400
            query = query.filter_by(role=role_filter)

        if branch_filter_str:
            try:
                 branch_filter = int(branch_filter_str)
                 query = query.filter_by(branch_id=branch_filter)
            except ValueError:
                 return jsonify({"error": "Invalid branch_id format, must be an integer"}), 400

        users = query.all()
        return jsonify([u.serialize() for u in users]), 200
    except Exception as e:
        logger.error(f"Error listing users: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/users/<int:user_id>/branch', methods=['GET'])
@requires_role(['admin', 'teacher', 'student', 'moderator'])
def get_user_branch(user_id):
    try:
        requester = g.user
        user = db.session.get(User, user_id) # Use db.session.get
        if not user:
             return jsonify({"error": "User not found"}), 404

        if requester['user_id'] == user_id:
             return jsonify({"user_id": user_id, "branch_id": user.branch_id}), 200

        if requester['role'] == 'admin':
             return jsonify({"user_id": user_id, "branch_id": user.branch_id}), 200

        if requester['role'] == 'teacher' and user.role == 'student' and user.branch_id is not None and user.branch_id == requester.get('branch_id'):
             return jsonify({"user_id": user_id, "branch_id": user.branch_id}), 200

        return jsonify({"error": "Unauthorized access to user's branch"}), 403

    except Exception as e:
        logger.error(f"Error fetching user branch {user_id}: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


@app.route('/users/branches/<int:branch_id>', methods=['GET'])
@requires_role(['admin', 'teacher', 'moderator'])
def get_branch_users(branch_id):
    try:
        requester = g.user
        if requester['role'] == 'teacher' and requester.get('branch_id') != branch_id:
            return jsonify({"error": "Unauthorized branch access"}), 403

        users = User.query.filter_by(branch_id=branch_id).all()
        return jsonify([u.serialize() for u in users]), 200
    except Exception as e:
        logger.error(f"Error fetching branch {branch_id} users: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

@app.route("/health", methods=["GET"])
def health_check():
    try:
        db.session.execute(db.select(User).limit(1))
        db_status = "ok"
    except Exception:
        db_status = "error"

    rabbitmq_status = "ok"
    connection = None
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST, heartbeat=10))
        connection.close()
    except Exception:
        rabbitmq_status = "error"
    finally:
        if connection and not connection.is_closed:
             try: connection.close()
             except Exception: pass

    return jsonify(status="ok", db_status=db_status, rabbitmq_status=rabbitmq_status), 200

# RabbitMQ Consumer for user synchronization (User Service)
# This consumer listens for events published to the exchange and updates the User table.
def consume_user_events_user_service():
    logger.info("Starting User Service RabbitMQ consumer thread")
    connection = None
    channel = None
    while True:
        try:
            if connection is None or connection.is_closed:
                 logger.info("User Service attempting to connect to RabbitMQ...")
                 connection = pika.BlockingConnection(
                     pika.ConnectionParameters(
                         host=RABBITMQ_HOST,
                         heartbeat=600,
                         blocked_connection_timeout=300
                     )
                 )
                 channel = connection.channel()

                 # Declare the exchange - MUST match publisher and other consumers
                 channel.exchange_declare(exchange=USER_EVENTS_EXCHANGE, exchange_type='fanout', durable=True) # Declare as fanout

                 # Declare THIS service's unique queue
                 result = channel.queue_declare(
                     queue=USER_SYNC_USER_SERVICE_QUEUE, # Use THIS service's queue name
                     durable=True,
                     arguments={'x-queue-type': 'quorum'}
                 )
                 # Bind THIS service's queue to the exchange
                 queue_name = result.method.queue
                 channel.queue_bind(
                     exchange=USER_EVENTS_EXCHANGE,
                     queue=queue_name,
                     routing_key='' # Bind with empty routing key for fanout
                 )

                 channel.basic_qos(prefetch_count=1)
                 logger.info(f"User Service RabbitMQ connection established and queue '{queue_name}' bound to exchange '{USER_EVENTS_EXCHANGE}'.")

            def callback(ch, method, properties, body):
                try:
                    with app.app_context():
                        event = json.loads(body)
                        event_type = event.get('event')
                        user_id = event.get('user_id')
                        logger.info(f"🐰 User Service received event: {event_type} for user ID: {user_id}")

                        if event_type == 'USER_CREATED':
                            # This service is the source of truth for user details.
                            # It receives the ID from Auth and creates the full user record.
                            existing_user = db.session.get(User, user_id) # Use db.session.get
                            if existing_user:
                                logger.warning(f"⚠️ USER_CREATED event received for existing user {user_id}. Skipping creation.")
                                # If it already exists, acknowledge. This could happen if User service restarted
                                # and processed a message that Auth's consumer had already seen.
                                ch.basic_ack(delivery_tag=method.delivery_tag)
                                return

                            email = event.get('email')
                             # user_id must come from the event payload as Auth Service generated it
                            if user_id is None or not email:
                                logger.error(f"🚨 Invalid USER_CREATED event received: Missing user_id or email. Event: {event}. NACK without requeue.")
                                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                                return

                            role_str = event.get('role', 'student')
                            valid_roles = ['student', 'teacher', 'admin', 'moderator']
                            if role_str not in valid_roles:
                                logger.warning(f"⚠️ Invalid role '{role_str}' in USER_CREATED event for user {user_id}. Defaulting to 'student'.")
                                role_str = 'student'

                            new_user = User(
                                id=user_id, # Use ID from event payload provided by Auth Service
                                name=event.get('name', f"User_{user_id}"),
                                email=email,
                                role=role_str,
                                branch_id=event.get('branch_id')
                            )

                            try:
                                db.session.add(new_user)
                                db.session.commit()
                                logger.info(f"✅ Successfully created user {new_user.id} ({new_user.email}) from event.")
                                ch.basic_ack(delivery_tag=method.delivery_tag)
                            except Exception as db_error:
                                db.session.rollback()
                                logger.error(f"💥 Database error during User Service USER_CREATED processing for user {user_id}: {db_error}", exc_info=True)
                                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)


                        elif event_type == 'USER_UPDATED':
                            user = db.session.get(User, user_id) # Use db.session.get
                            if user:
                                updated = False
                                if 'name' in event:
                                    if isinstance(event['name'], str) and event['name'].strip():
                                         user.name = event['name'].strip()
                                         updated = True
                                    else: logger.warning(f"⚠️ Invalid name format in USER_UPDATED event for user {user_id}. Skipping name update.")
                                if 'email' in event:
                                     if isinstance(event['email'], str) and '@' in event['email']:
                                         existing_user = User.query.filter(User.email == event['email'], User.id != user_id).first()
                                         if existing_user:
                                            logger.warning(f"⚠️ Email '{event['email']}' already exists in USER_UPDATED event for user {user_id}. Skipping email update.")
                                         else:
                                            user.email = event['email']
                                            updated = True
                                     else: logger.warning(f"⚠️ Invalid email format in USER_UPDATED event for user {user_id}. Skipping email update.")
                                if 'role' in event:
                                    role_str = event['role']
                                    valid_roles = ['student', 'teacher', 'admin', 'moderator']
                                    if role_str in valid_roles:
                                        user.role = role_str
                                        updated = True
                                    else: logger.warning(f"⚠️ Invalid role '{role_str}' in USER_UPDATED event for user {user_id}. Skipping role update.")
                                if 'branch_id' in event:
                                     if isinstance(event['branch_id'], (int, type(None))):
                                        user.branch_id = event['branch_id']
                                        updated = True
                                     else: logger.warning(f"⚠️ Invalid branch_id format in USER_UPDATED event for user {user_id}. Skipping branch_id update.")

                                if updated:
                                    try:
                                        db.session.commit()
                                        logger.info(f"✅ Successfully updated user {user.id} from event.")
                                        ch.basic_ack(delivery_tag=method.delivery_tag)
                                    except Exception as e:
                                        db.session.rollback()
                                        logger.error(f"💥 Database error during User Service USER_UPDATED processing for user {user_id}: {e}", exc_info=True)
                                        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
                                else:
                                     logger.info(f"🔄 No fields updated for user {user_id} from event (maybe no changes or invalid data).")
                                     ch.basic_ack(delivery_tag=method.delivery_tag)
                            else:
                                logger.warning(f"⚠️ USER_UPDATED event received for non-existent user {user_id}. Skipping update.")
                                ch.basic_ack(delivery_tag=method.delivery_tag)


                        elif event_type == 'USER_DELETED':
                            user = db.session.get(User, user_id) # Use db.session.get
                            if user:
                                try:
                                    db.session.delete(user)
                                    db.session.commit()
                                    logger.info(f"✅ Successfully deleted user {user_id} from event.")
                                    ch.basic_ack(delivery_tag=method.delivery_tag)
                                except Exception as e:
                                    db.session.rollback()
                                    logger.error(f"💥 Database error during User Service USER_DELETED processing for user {user_id}: {e}", exc_info=True)
                                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
                            else:
                                logger.warning(f"⚠️ USER_DELETED event received for non-existent user {user_id}. Skipping deletion.")
                                ch.basic_ack(delivery_tag=method.delivery_tag)

                        else:
                            logger.warning(f"🤷 User Service received unknown event type: {event_type}. Event: {event}. Skipping.")
                            ch.basic_ack(delivery_tag=method.delivery_tag)

                except json.JSONDecodeError:
                    logger.error(f"🔴 User Service consumer failed to decode JSON: {body}. NACK without requeue.", exc_info=True)
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                except Exception as e:
                    logger.error(f"🔴 User Service consumer unhandled error: {e}", exc_info=True)
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)


            channel.basic_consume(
                queue=USER_SYNC_USER_SERVICE_QUEUE, # Consume from THIS service's unique queue
                on_message_callback=callback,
                auto_ack=False
            )
            channel.start_consuming()

        except pika.exceptions.AMQPConnectionError:
            logger.error("🔌 User Service RabbitMQ connection lost. Retrying in 5 seconds...")
            if channel: 
                try: channel.close() 
                except Exception: pass
            if connection: 
                try: connection.close() 
                except Exception: pass
            channel = None; connection = None
            time.sleep(5)
        except Exception as e:
            logger.error(f"🌩️ User Service consumer thread unexpected error: {e}", exc_info=True)
            if channel: 
                try: channel.close() 
                except Exception: pass
            if connection: 
                try: connection.close() 
                except Exception: pass
            channel = None; connection = None
            time.sleep(5)

# Start the consumer thread
threading.Thread(target=consume_user_events_user_service, daemon=True).start()


if __name__ == '__main__':
    print("User Service starting...")
    app.run(host='0.0.0.0', port=3001, debug=False)