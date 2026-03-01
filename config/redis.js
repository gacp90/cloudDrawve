const Redis = require('ioredis');

// Conexión a Redis (asumiendo que está en el mismo VPS)
const connection = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    maxRetriesPerRequest: null // Requerido por BullMQ
});

// EVENTOS PARA VERIFICAR CONEXIÓN
connection.on('connect', () => {
    console.log('✅ Conectado a Redis exitosamente');
});

connection.on('error', (err) => {
    console.error('❌ Error conectando a Redis:', err);
});


module.exports = connection;