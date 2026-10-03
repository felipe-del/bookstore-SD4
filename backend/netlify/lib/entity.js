const { query, withTx } = require('./db');
const { publish, consume } = require('./queue');
const { res, isPreflight, preflight } = require('./http');

const MAX_PER_RUN = 50;

const ENTITIES = {
  books: {
    table: 'books', queue: process.env.QUEUE_BOOKS || 'bookstore',
    fields: ['title', 'author_id', 'publisher_id', 'year'], required: ['title'],
    listSql: `SELECT b.*, a.name AS author_name, p.name AS publisher_name
              FROM books b LEFT JOIN authors a ON a.id = b.author_id
              LEFT JOIN publishers p ON p.id = b.publisher_id ORDER BY b.id`
  },
  authors: {
    table: 'authors', queue: process.env.QUEUE_AUTHORS || 'authors',
    fields: ['name', 'country'], required: ['name'],
    listSql: 'SELECT * FROM authors ORDER BY id'
  },
  publishers: {
    table: 'publishers', queue: process.env.QUEUE_PUBLISHERS || 'publishers',
    fields: ['name', 'city'], required: ['name'],
    listSql: 'SELECT * FROM publishers ORDER BY id'
  }
};

/* ---------- Funciones batch (las que invocan las funciones *Tasks) ---------- */
async function insertBatch(e, client, rows) {
  const cols = e.fields;
  const sql = `INSERT INTO ${e.table} (${cols.join(',')}) VALUES (${cols.map((_, i) => '$' + (i + 1)).join(',')})`;
  for (const r of rows) await client.query(sql, cols.map((c) => r[c] ?? null));
}
async function updateBatch(e, client, rows) {
  const cols = e.fields;
  const sql = `UPDATE ${e.table} SET ${cols.map((c, i) => `${c}=$${i + 1}`).join(',')} WHERE id=$${cols.length + 1}`;
  for (const r of rows) await client.query(sql, [...cols.map((c) => r[c] ?? null), r.id]);
}
async function deleteBatch(e, client, rows) {
  await client.query(`DELETE FROM ${e.table} WHERE id = ANY($1::int[])`, [rows.map((r) => r.id)]);
}
const BATCH = { insert: insertBatch, update: updateBatch, delete: deleteBatch };

/* ---------- Listar (lectura directa de la BD) ---------- */
const list = (name) => async (event) => {
  if (isPreflight(event)) return preflight();
  try {
    return res(200, (await query(ENTITIES[name].listSql)).rows);
  } catch (err) {
    console.error(err);
    return res(500, { error: err.message });
  }
};

/* ---------- Insert / Update / Delete (solo encolan) ---------- */
const write = (name, op) => async (event) => {
  if (isPreflight(event)) return preflight();
  const e = ENTITIES[name];
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return res(400, { error: 'JSON inválido' }); }
  const qs = event.queryStringParameters || {};
  const data = {};
  if (op !== 'delete') {
    e.fields.forEach((f) => { data[f] = body[f] === '' ? null : body[f] ?? null; });
    const missing = e.required.filter((f) => data[f] == null);
    if (missing.length) return res(400, { error: `Faltan campos: ${missing.join(', ')}` });
  }
  if (op !== 'insert') {
    const id = parseInt(body.id ?? qs.id, 10);
    if (!id) return res(400, { error: 'Se requiere id' });
    data.id = id;
  }
  try {
    await publish(e.queue, { entity: name, op, data, ts: new Date().toISOString() });
    return res(202, { queued: true, queue: e.queue, op, data });
  } catch (err) {
    console.error(err);
    return res(500, { error: 'No se pudo encolar: ' + err.message });
  }
};

/* ---------- Tasks: lee la cola y aplica los batches en una transacción ---------- */
const tasks = (name) => async (event) => {
  if (isPreflight(event)) return preflight();
  const e = ENTITIES[name];
  const summary = { queue: e.queue, processed: 0, insert: 0, update: 0, delete: 0 };
  try {
    summary.processed = await consume(e.queue, MAX_PER_RUN, (msgs) =>
      withTx(async (client) => {
        let i = 0;
        while (i < msgs.length) { // agrupa mensajes consecutivos con la misma operación
          const op = msgs[i].op;
          let j = i;
          while (j < msgs.length && msgs[j].op === op) j++;
          const rows = msgs.slice(i, j).map((m) => m.data);
          await BATCH[op](e, client, rows);
          summary[op] += rows.length;
          i = j;
        }
      })
    );
    return res(200, summary);
  } catch (err) {
    console.error(err);
    return res(500, { error: err.message });
  }
};

module.exports = { list, write, tasks, insertBatch, updateBatch, deleteBatch };
