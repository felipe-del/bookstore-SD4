# Tarea 4 – Sistemas Distribuidos: Librería con mensajería diferida (CloudAMQP + Netlify Functions)

Estructura:
- `backend/`  → funciones Netlify (book*, author*, publisher*) + PostgreSQL + CloudAMQP
- `frontend/` → sitio estático (HTML/JS) con las 3 pantallas (Libros, Autores, Editoriales)
- `test-flow.sh` → prueba manual del flujo completo (punto 5)

Patrón: `xInsert/xUpdate/xDelete` solo publican un mensaje en la cola; `xTasks` lee los mensajes
y ejecuta las funciones batch (`insertBatch`, `updateBatch`, `deleteBatch` en `backend/netlify/lib/entity.js`)
dentro de una transacción. Si algo falla, los mensajes se reencolan (nack).

Colas: `bookstore` (libros), `authors`, `publishers`.

## A. Preparar servicios (una sola vez)
1. **CloudAMQP**: crear cuenta -> New Instance (plan Little Lemur, gratis) -> abrir "Details" y copiar la *AMQP URL*.
   En "RabbitMQ Manager" -> Queues -> Add queue: nombre `bookstore`, Durability *Durable*. Repetir con `authors` y `publishers`.
2. **PostgreSQL**: crear un proyecto gratis en https://neon.tech (o Supabase), copiar la connection string.
   Ejecutar `backend/schema.sql` en el SQL Editor.

## B. Probar localmente
```bash
cd backend
npm install
cp .env.example .env        # completar DATABASE_URL y CLOUDAMQP_URL
npm i -g netlify-cli        # una vez
netlify dev                 # API en http://localhost:8888/.netlify/functions
# otra terminal:
cd frontend && npx serve -l 3000     # abrir http://localhost:3000
```
Flujo de prueba (punto 5): `./test-flow.sh` o desde la UI:
1. Libros -> Editar -> "Enviar cambio" (mensaje "encolado").
2. Rabbit Manager -> cola `bookstore` -> Ready = 1 (captura). Get messages para ver el JSON.
3. La lista aún muestra el dato viejo.
4. "Ejecutar tareas de la cola" (o `curl -X POST .../bookTasks`) -> el cambio aparece; cola en 0.
Repetir para Autores y Editoriales.

## C. Publicar
**Backend (Netlify):**
```bash
cd backend
netlify login
netlify init            # o: netlify sites:create
netlify env:set DATABASE_URL "..."
netlify env:set CLOUDAMQP_URL "..."
netlify env:set DB_SSL true
netlify env:set QUEUE_BOOKS bookstore
netlify env:set QUEUE_AUTHORS authors
netlify env:set QUEUE_PUBLISHERS publishers
netlify deploy --prod
```
Probar: `https://SU-SITIO.netlify.app/.netlify/functions/bookList`

**Frontend (Vercel / GitHub Pages):** editar `frontend/config.js`:
`window.API_BASE = 'https://SU-SITIO.netlify.app/.netlify/functions';`
- Vercel: importar el repo, *Root Directory* = `frontend`, sin build.
- GitHub Pages: subir el contenido de `frontend/` a la rama que publica.

## D. Entregables (checklist)
- [ ] Repositorio (GitHub) con `backend/` y `frontend/`
- [ ] URL del backend en Netlify y URL del frontend publicado
- [ ] Captura: cola `bookstore` en CloudAMQP con mensajes de bookInsert / bookUpdate / bookDelete (punto 1)
- [ ] Capturas de `authors` y `publishers` con mensajes en cola (puntos 2 y 3)
- [ ] Capturas de la prueba del punto 5: mensaje encolado -> BD sin cambio -> bookTasks (respuesta JSON) -> BD con cambio -> cola en 0
- [ ] Nunca subir `.env` (ya está en `.gitignore`); rotar la clave de CloudAMQP si se filtra
