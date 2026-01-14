# Dockerfile inside the course_service directory
FROM python:3.12-slim

WORKDIR /app
RUN apt-get update && apt-get install -y git ffmpeg

# Load the environment variable


COPY .env .env
COPY . /app

RUN mkdir -p /app/hls
VOLUME /app/hls

RUN pip install --no-cache-dir flask flask_sqlalchemy pika requests python-dotenv werkzeug circuitbreaker

# Use the GitHub token to install the private repo
RUN pip install --no-cache-dir git+https://github.com/TaoufikRefak/auth_lib.git@main#egg=auth_lib

EXPOSE 3002

CMD ["python", "app.py"]
