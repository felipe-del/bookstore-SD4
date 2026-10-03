const amqp = require('amqplib');
const connect = () => amqp.connect(process.env.CLOUDAMQP_URL);

// Envía un mensaje persistente a la cola y espera la confirmación del broker.
async function publish(queue, message) {
  const conn = await connect();
  try {
    const ch = await conn.createConfirmChannel();
    await ch.assertQueue(queue, { durable: true });
    ch.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
      contentType: 'application/json'
    });
    await ch.waitForConfirms();
  } finally {
    await conn.close().catch(() => {});
  }
}

// Lee hasta `max` mensajes y ejecuta fn(mensajes). Si fn termina bien -> ack; si falla -> se reencolan.
async function consume(queue, max, fn) {
  const conn = await connect();
  try {
    const ch = await conn.createChannel();
    await ch.assertQueue(queue, { durable: true });
    const raw = [];
    for (let i = 0; i < max; i++) {
      const m = await ch.get(queue, { noAck: false });
      if (!m) break;
      raw.push(m);
    }
    if (!raw.length) return 0;
    try {
      await fn(raw.map((m) => JSON.parse(m.content.toString())));
      raw.forEach((m) => ch.ack(m));
    } catch (err) {
      raw.forEach((m) => ch.nack(m, false, true));
      throw err;
    }
    return raw.length;
  } finally {
    await conn.close().catch(() => {});
  }
}
module.exports = { publish, consume };
