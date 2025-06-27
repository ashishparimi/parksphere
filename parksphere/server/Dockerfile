# Backend Dockerfile
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY parksphere/server/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY parksphere/server/ .

# Create directory for database if it doesn't exist
RUN mkdir -p /app/data

# Copy the pre-populated databases
COPY parksphere/server/*.db /app/

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main_world:app", "--host", "0.0.0.0", "--port", "8000"]