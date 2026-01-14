# auth_service.py (Updated)

import time
from flask import Flask, request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
import pika
import json
import logging
import jwt
from auth_lib import generate_token, decode_token, requires_role
from circuitbreaker import circuit
import threading
import os
import secrets
from datetime import datetime, timedelta
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# App configuration (Use environment variables!)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default_secure_key') # Load from env
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URI', 'sqlite:///auth.db') # Load from env
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- RabbitMQ Configuration ---
RABBITMQ_HOST = os.environ.get('RABBITMQ_HOST', 'rabbitmq') # Load from env
USER_EVENTS_EXCHANGE = 'user_events_exchange' # New exchange name
USER_SYNC_AUTH_QUEUE = 'user_sync_auth_queue' # New queue name for auth service consumer
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
RESET_LINK_BASE = os.environ.get('RESET_LINK_BASE', 'http://localhost:3000/reset-password')
FROM_EMAIL = os.environ.get('FROM_EMAIL', 'refaktaoufik@gmail.com')
# Database model for Authentication Service
class AuthUser(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    branch_id = db.Column(db.Integer, nullable=True)
    reset_token = db.Column(db.String(100), nullable=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)
# Create the database tables if they don't exist
with app.app_context():
    db.create_all()


def send_reset_email(email, token):
    """Send password reset email using SendGrid"""
    if not SENDGRID_API_KEY:
        logger.error("SendGrid not configured. Cannot send email.")
        return False

    reset_link = f"{RESET_LINK_BASE}?token={token}"
    message = Mail(
        from_email=FROM_EMAIL,
        to_emails=email,
        subject='Password Reset Request',
        html_content=f'''
            <p>You requested a password reset. Click the link below:</p>
            <p><a href="{reset_link}">Reset Password</a></p>
            <p>This link expires in 15 minutes.</p>
        '''
    )
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        if response.status_code == 202:
            logger.info(f"Password reset email sent to {email}")
            return True
        logger.error(f"Email send failed with status: {response.status_code}")
        return False
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        return False
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
        channel.exchange_declare(exchange=exchange, exchange_type='fanout', durable=True)

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

@app.route('/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({"message": "Email is required"}), 400

    user = AuthUser.query.filter_by(email=email).first()
    if user:
        # Generate secure token (32 bytes random)
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = datetime.utcnow() + timedelta(minutes=15)
        db.session.commit()

        # Send email (non-blocking)
        try:
            threading.Thread(target=send_reset_email, args=(email, token)).start()
        except Exception as e:
            logger.error(f"Error queueing email: {str(e)}")

    # Always return same message for security
    return jsonify({
        "message": "If the email exists, a reset link will be sent"
    }), 200

@app.route('/auth/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('new_password')

    if not token or not new_password:
        return jsonify({"message": "Token and new password required"}), 400

    if len(new_password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400

    user = AuthUser.query.filter_by(reset_token=token).first()
    if not user or user.reset_token_expires < datetime.utcnow():
        return jsonify({"message": "Invalid or expired token"}), 400

    # Update password and clear reset token
    user.password = generate_password_hash(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.session.commit()

    return jsonify({"message": "Password updated successfully"}), 200
# Route to register a new user
@app.route('/auth/register', methods=['POST'])
# Consider adding requires_role(['admin']) if only admins can register users
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')
    branch_id = data.get('branch_id')
    name = data.get('name', 'New User')

    if not email or not password or not role:
        return jsonify({"message": "Email, password, and role are required"}), 400
    if not isinstance(email, str) or '@' not in email:
         return jsonify({"message": "Invalid email format"}), 400
    if not isinstance(password, str) or len(password) < 6:
         return jsonify({"message": "Password must be at least 6 characters long"}), 400

    valid_roles = ['student', 'teacher', 'admin', 'moderator']
    if role not in valid_roles:
        return jsonify({"message": f"Invalid role '{role}'. Valid roles are {valid_roles}"}), 400

    if role in ['student', 'teacher'] and (branch_id is None or not isinstance(branch_id, int)):
        return jsonify({"message": "Branch ID (integer) is required for students and teachers"}), 400
    if role in ['admin', 'moderator'] and branch_id is not None and not isinstance(branch_id, int):
         return jsonify({"message": "Invalid branch_id format for this role, must be integer or null"}), 400


    if AuthUser.query.filter_by(email=email).first():
        return jsonify({"message": "User with this email already exists"}), 409 # Conflict

    hashed_password = generate_password_hash(password)
    new_user = AuthUser(email=email, password=hashed_password, role=role, branch_id=branch_id)
    db.session.add(new_user)

    try:
        db.session.commit()
        # Publish USER_CREATED event to the EXCHANGE
        publish_message(USER_EVENTS_EXCHANGE, '', { # Use exchange, empty routing key
            "event": "USER_CREATED",
            "user_id": new_user.id,
            "email": new_user.email,
            "role": new_user.role,
            "branch_id": new_user.branch_id,
            "name": name
        })
        logger.info(f"User {new_user.email} registered successfully (ID: {new_user.id})")
        return jsonify({"message": "User registered successfully", "user_id": new_user.id}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error during user registration or event publishing: {e}", exc_info=True)
        return jsonify({"message": "An error occurred during registration"}), 500

# Route to log in and get a JWT token using auth_lib
@app.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    user = AuthUser.query.filter_by(email=email).first()
    if user and check_password_hash(user.password, password):
        token_payload = {
            'user_id': user.id,
            'role': user.role,
            'branch_id': user.branch_id if user.branch_id is not None else None
        }
        token = generate_token(
            payload=token_payload,
            expires_in=3600 # 1 hour
        )
        logger.info(f"User {user.email} logged in successfully (ID: {user.id})")
        return jsonify({"token": token}), 200

    return jsonify({"message": "Invalid email or password"}), 401

# Route to validate a token
@app.route('/auth/validate', methods=['POST'])
def validate_token():
    auth_header = request.headers.get('Authorization')
    token = None
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(" ")[1]
    elif request.get_data():
         token = request.get_data(as_text=True).strip()
         if token.startswith('Bearer '):
             token = token.split(" ")[1]

    if not token:
        return jsonify({"message": "Token is required"}), 400

    try:
        decoded_token = decode_token(token)
        # Optional: Verify user still exists in Auth DB
        # user_id_from_token = decoded_token.get('user_id')
        # if user_id_from_token is None or not AuthUser.query.get(user_id_from_token):
        #     return jsonify({"message": "Invalid token (user not found)"}), 401
        return jsonify({"message": "Token is valid", "payload": decoded_token}), 200
    except jwt.ExpiredSignatureError:
        logger.warning("Token validation failed: ExpiredSignatureError")
        return jsonify({"message": "Token has expired"}), 401
    except jwt.InvalidTokenError as e:
        logger.warning(f"Token validation failed: InvalidTokenError - {str(e)}")
        return jsonify({"message": f"Invalid token: {str(e)}"}), 401
    except Exception as e:
        logger.error(f"Unexpected error during token validation: {str(e)}", exc_info=True)
        return jsonify({"message": "Token validation failed due to internal error"}), 500


# RabbitMQ Consumer for user synchronization (Auth Service)
# This consumer receives events to keep the AuthUser table in sync if users
# are modified/deleted by the User Service (e.g., by an admin).
def consume_user_events_auth_service():
    logger.info("Starting Auth Service RabbitMQ consumer thread")
    connection = None
    channel = None
    while True:
        try:
            if connection is None or connection.is_closed:
                logger.info("Auth Service attempting to connect to RabbitMQ...")
                connection = pika.BlockingConnection(
                    pika.ConnectionParameters(
                        host=RABBITMQ_HOST,
                        heartbeat=600,
                        blocked_connection_timeout=300
                    )
                )
                channel = connection.channel()

                # Declare the exchange - MUST match publisher and other consumers
                channel.exchange_declare(exchange=USER_EVENTS_EXCHANGE, exchange_type='fanout', durable=True)

                # Declare THIS service's unique queue
                result = channel.queue_declare(
                    queue=USER_SYNC_AUTH_QUEUE,
                    durable=True,
                    arguments={'x-queue-type': 'quorum'} # Quorum queue for reliability
                )
                # Bind THIS service's queue to the exchange
                queue_name = result.method.queue
                channel.queue_bind(
                    exchange=USER_EVENTS_EXCHANGE,
                    queue=queue_name,
                    routing_key='' # Bind with empty routing key for fanout
                )

                channel.basic_qos(prefetch_count=1)
                logger.info(f"Auth Service RabbitMQ connection established and queue '{queue_name}' bound to exchange '{USER_EVENTS_EXCHANGE}'.")

            def callback(ch, method, properties, body):
                try:
                    with app.app_context():
                        event = json.loads(body)
                        event_type = event.get('event')
                        user_id = event.get('user_id')
                        logger.info(f"🔄 Auth Service received event: {event_type} for user ID: {user_id}")

                        # Note: The Auth Service's consumer only needs to react to UPDATED and DELETED
                        # events to keep its data consistent with the User Service (which is
                        # the source of truth for user profile data). USER_CREATED is handled
                        # by the /auth/register endpoint itself publishing the event.
                        # However, it's robust to still process CREATED events here
                        # as an idempotent sync mechanism in case AuthUser is deleted out-of-band,
                        # but the main logic should be for UPDATED/DELETED from User service.

                        if event_type == 'USER_CREATED':
                            # Sync the user ID from the User service into the AuthUser table
                            # ONLY if it doesn't exist. This handles the case where Auth creates it first,
                            # but also allows User service to be the source of truth for IDs created elsewhere.
                            existing_user = db.session.get(AuthUser, user_id) # Use db.session.get
                            if existing_user:
                                logger.warning(f"⚠️ USER_CREATED event received for existing AuthUser {user_id}. Skipping creation.")
                            else:
                                # Validate required fields from event
                                email = event.get('email')
                                if user_id is None or not email:
                                    logger.error(f"🚨 Invalid USER_CREATED event received: Missing user_id or email. Event: {event}. NACK without requeue.")
                                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                                    return # Exit callback

                                role_str = event.get('role', 'student')
                                valid_roles = ['student', 'teacher', 'admin', 'moderator']
                                if role_str not in valid_roles:
                                    logger.warning(f"⚠️ Invalid role '{role_str}' in USER_CREATED event for user {user_id}. Defaulting to 'student'.")
                                    role_str = 'student'

                                # Create AuthUser record. Password is NOT synced here.
                                new_auth_user = AuthUser(
                                    id=user_id, # Set ID from event
                                    email=email,
                                    password='PASSWORD_MANAGED_BY_AUTH', # Placeholder
                                    role=role_str,
                                    branch_id=event.get('branch_id')
                                )

                                try:
                                    db.session.add(new_auth_user)
                                    db.session.commit()
                                    logger.info(f"✅ Successfully synced AuthUser {new_auth_user.id} from USER_CREATED event.")
                                except Exception as db_error:
                                    db.session.rollback()
                                    logger.error(f"💥 Database error during Auth Service USER_CREATED sync for user {user_id}: {db_error}", exc_info=True)
                                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
                                    return # Exit callback

                        elif event_type == 'USER_UPDATED':
                            user = AuthUser.query.get(user_id)
                            if user:
                                updated = False
                                if 'email' in event:
                                    if isinstance(event['email'], str) and '@' in event['email']:
                                         existing_user = AuthUser.query.filter(AuthUser.email == event['email'], AuthUser.id != user_id).first()
                                         if existing_user:
                                            logger.warning(f"⚠️ Email '{event['email']}' already exists in USER_UPDATED event for AuthUser {user_id}. Skipping email update.")
                                         else:
                                            user.email = event['email']
                                            updated = True
                                    else:
                                         logger.warning(f"⚠️ Invalid email format in USER_UPDATED event for AuthUser {user_id}. Skipping email update.")
                                if 'role' in event:
                                    role_str = event['role']
                                    valid_roles = ['student', 'teacher', 'admin', 'moderator']
                                    if role_str in valid_roles:
                                        user.role = role_str
                                        updated = True
                                    else:
                                         logger.warning(f"⚠️ Invalid role '{role_str}' in USER_UPDATED event for AuthUser {user_id}. Skipping role update.")
                                if 'branch_id' in event:
                                     if isinstance(event['branch_id'], (int, type(None))):
                                        user.branch_id = event['branch_id']
                                        updated = True
                                     else:
                                         logger.warning(f"⚠️ Invalid branch_id format in USER_UPDATED event for AuthUser {user_id}. Skipping branch_id update.")

                                if updated:
                                    try:
                                        db.session.commit()
                                        logger.info(f"✅ Successfully updated AuthUser {user.id} from event.")
                                    except Exception as e:
                                        db.session.rollback()
                                        logger.error(f"💥 Database error during Auth Service USER_UPDATED sync for user {user_id}: {e}", exc_info=True)
                                        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
                                        return # Exit callback
                                else:
                                     logger.info(f"🔄 No fields updated for AuthUser {user_id} from event (maybe no changes or invalid data).")
                            else:
                                logger.warning(f"⚠️ USER_UPDATED event received for non-existent AuthUser {user_id}. Skipping update.")


                        elif event_type == 'USER_DELETED':
                            user = AuthUser.query.get(user_id)
                            if user:
                                try:
                                    db.session.delete(user)
                                    db.session.commit()
                                    logger.info(f"✅ Successfully deleted AuthUser {user_id} from event.")
                                except Exception as e:
                                    db.session.rollback()
                                    logger.error(f"💥 Database error during Auth Service USER_DELETED sync for user {user_id}: {e}", exc_info=True)
                                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
                                    return # Exit callback
                            else:
                                logger.warning(f"⚠️ USER_DELETED event received for non-existent AuthUser {user_id}. Skipping deletion.")

                        else:
                            logger.warning(f"🤷 Auth Service received unknown event type: {event_type}. Event: {event}. Skipping.")

                except json.JSONDecodeError:
                    logger.error(f"🔴 Auth Service consumer failed to decode JSON: {body}. NACK without requeue.", exc_info=True)
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                except Exception as e:
                    logger.error(f"🔴 Auth Service consumer unhandled error: {e}", exc_info=True)
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
                else:
                    # ACK only if everything in the try block was successful
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    logger.info("🟢 Auth Service event processed successfully")

            channel.basic_consume(
                queue=USER_SYNC_AUTH_QUEUE, # Consume from THIS service's queue
                on_message_callback=callback,
                auto_ack=False
            )
            channel.start_consuming() # This call blocks

        except pika.exceptions.AMQPConnectionError:
            logger.error("🔌 Auth Service RabbitMQ connection lost. Retrying in 5 seconds...")
            if channel:
                try: channel.close()
                except Exception: pass
            if connection: 
                try: connection.close() 
                except Exception: pass
            channel = None; connection = None
            time.sleep(5)
        except Exception as e:
            logger.error(f"🌩️ Auth Service consumer thread unexpected error: {e}", exc_info=True)
            if channel: 
                try: channel.close() 
                except Exception: pass
            if connection: 
                try: connection.close()
                except Exception: pass
            channel = None; connection = None
            time.sleep(5)


# Main application entry point
if __name__ == '__main__':
    # Start RabbitMQ consumer in a separate thread
    consumer_thread = threading.Thread(target=consume_user_events_auth_service, daemon=True)
    consumer_thread.start()
    print("Auth Service starting...")
    app.run(host='0.0.0.0', port=3000, debug=False)