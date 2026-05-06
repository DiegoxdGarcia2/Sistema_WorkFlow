FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema para sklearn y pandas
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Eliminar archivos sensibles que no deben estar en la imagen
RUN rm -f .env .env.example

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
