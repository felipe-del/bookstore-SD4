#!/usr/bin/env bash
# Prueba manual del flujo completo (Tarea 4, punto 5).
# Uso: ./test-flow.sh [BASE_URL]   (por defecto http://localhost:8888/.netlify/functions)
API="${1:-http://localhost:8888/.netlify/functions}"

echo "1) Estado inicial de los libros:"
curl -s "$API/bookList"; echo; echo

echo "2) Enviando actualización del libro id=1 (solo se encola)..."
curl -s -X PUT "$API/bookUpdate" -H 'Content-Type: application/json' \
  -d '{"id":1,"title":"Cien años de soledad (ed. TAREA4)","author_id":1,"publisher_id":1,"year":1967}'; echo; echo

echo ">> AHORA: abra el RabbitMQ Manager de CloudAMQP, cola 'bookstore' -> debe haber 1 mensaje Ready."
read -p ">> Presione ENTER cuando lo haya verificado (captura de pantalla)..." _

echo "3) BD todavía SIN cambios (debe mostrar el título antiguo):"
curl -s "$API/bookList"; echo; echo

echo "4) Invocando manualmente bookTasks..."
curl -s -X POST "$API/bookTasks"; echo; echo

echo "5) BD después de bookTasks (debe mostrar el título nuevo):"
curl -s "$API/bookList"; echo
echo ">> En el Manager la cola debe volver a 0 mensajes."
