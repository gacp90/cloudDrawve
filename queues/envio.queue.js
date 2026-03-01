const { Queue } = require('bullmq');
const connection = require('../config/redis');

const envioQueue = new Queue('colaEnvios', { connection });

const agregarVentaAColaEnvio = async (ventaId) => {
    // Agregamos la tarea a la cola
    await envioQueue.add('generarGuia', { ventaId }, {
        attempts: 3, // Si Skydropx falla, reintenta 3 veces
        removeOnComplete: true,
        removeOnFail: 1000,
        backoff: {
            type: 'exponential',
            delay: 10000 // Espera 10 segundos antes del primer reintento
        }
    });
};

module.exports = { agregarVentaAColaEnvio };