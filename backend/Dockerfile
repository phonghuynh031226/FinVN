FROM python:3.12-slim

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /app/data/vcb_browser_ids /app/data/bidv_browser_ids && \
    echo "cd9d5bd00fad51bf3ae77007749fb19c" > /app/vcb_browser_id.txt && \
    echo "cd9d5bd00fad51bf3ae77007749fb19c" > /app/data/vcb_browser_ids/fb1edc8841f6cd8a8127ad612c7aeed020fe45ee5ec46ee9646149f465502a89.txt
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app

EXPOSE 8787
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8787}"]
