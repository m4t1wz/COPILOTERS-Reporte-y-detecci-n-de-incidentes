# Imagen de producción del backend NEXO MAP (DESPLIEGUE_TASKS.md, DEP-01).
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Usuario sin privilegios
RUN useradd --create-home --uid 10001 nexo && chown -R nexo /app
USER nexo

# El hosting define PORT. --proxy-headers toma la IP real del cliente (X-Forwarded-For) para que el límite de
# pedidos por IP (core/security.py) no se aplique a toda la plataforma como si fuera un solo cliente.
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
