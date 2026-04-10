FROM python:3.11-slim

WORKDIR /app
COPY . .
RUN pip install --no-cache-dir fastapi uvicorn pydantic
EXPOSE 8090
CMD ["python", "cuti_api.py"]
