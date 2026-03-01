const { Worker } = require('bullmq');
const connection = require('../config/redis');
const Venta = require('../models/ventas.model'); // Tu modelo de Mongoose
const { generarGuiaSkydropx } = require('../helpers/skydropx');

const worker = new Worker('colaEnvios', async (job) => {
    const { ventaId } = job.data;
    console.log(`[Worker] Procesando envío para venta: ${ventaId}`);

    const venta = await Venta.findById(ventaId);
    if (!venta) return;

    // 1. Llamada a Skydropx (la que demora)
    const urlPDF = await generarGuiaSkydropx(venta);

    if (urlPDF) {
        // 2. Actualizamos la DB con el resultado exitoso
        venta.guia = urlPDF; // O venta.envio.urlGuia según tu modelo
        venta.statusEnvio = 'Guía Generada';
        await venta.save();
        console.log(`[Worker] Guía generada exitosamente para: ${ventaId}`);
    } else {
        // Si no devuelve URL, lanzamos error para que BullMQ reintente según la config
        throw new Error('Skydropx no devolvió URL de guía');
    }
}, { connection });

worker.on('failed', (job, err) => {
    console.error(`[Worker] Error en el trabajo ${job.id}: ${err.message}`);
});

module.exports = worker;