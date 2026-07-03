FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema para sklearn, pandas y WeasyPrint
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 shared-mime-info && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Eliminar archivos sensibles que no deben estar en la imagen
RUN rm -f .env .env.example

EXPOSE 8000

CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
