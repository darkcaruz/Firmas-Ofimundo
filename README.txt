FIRMAS OFIMUNDO - DOCKER

1. Copiar todo el contenido de esta carpeta a:
   /opt/firmas-ofimundo

2. Reemplazar:
   public/firmas/cesar_caruz.html
   por el HTML real:
   C:\FirmasOfimundo\FirmasGeneradas\cesar_caruz.html

3. Levantar:
   docker compose build
   docker compose up -d

4. Probar:
   curl http://127.0.0.1:3002/health
   curl "http://127.0.0.1:3002/api/signature?email=ccaruz@ofimundo.cl"
