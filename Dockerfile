# 1) compila o frontend (web/ -> web/dist)
FROM node:22-slim AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# 2) API Python servindo a API e o frontend compilado na mesma porta
FROM python:3.13-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements-api.txt ./
RUN pip install --no-cache-dir -r requirements-api.txt

COPY api.py lease_lens.db ./
COPY src/ src/
COPY samples/contracts/ samples/contracts/
COPY --from=web /web/dist web/dist

EXPOSE 8000
# o Render (e outros hosts) injeta a porta em $PORT
CMD ["sh", "-c", "uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}"]
