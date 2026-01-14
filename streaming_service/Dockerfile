FROM python:3.12-slim

RUN apt-get update && \
    apt-get install -y \
    git \
    ffmpeg

WORKDIR /app

COPY . /app

RUN pip install --no-cache-dir -r requirements.txt

# Use the GitHub token to install the private repo

RUN pip install --no-cache-dir git+https://github.com/TaoufikRefak/auth_lib.git@main#egg=auth_lib

EXPOSE 3010

CMD ["python", "app.py"]