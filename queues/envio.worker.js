const { Worker } = require('bullmq');
const connection = require('../config/redis');
const Venta = require('../models/ventas.model'); // Tu modelo de Mongoose
const { generarGuiaSkydropx } = require('../helpers/skydropx');

const worker = new Worker('colaEnvios', async (job) => {
    const { ventaId } = job.data;
    console.log(`[Worker] Procesando envío para venta: ${ventaId}`);

    const venta = await Venta.findById(ventaId);
    if (!venta) return;

    const resultadoEnvio = await generarGuiaSkydropx(venta);

    if (resultadoEnvio.exito) {
        venta.guia = resultadoEnvio.guiaUrl;
        venta.trackingNumber = resultadoEnvio.tracking;
        venta.trackingUrl = resultadoEnvio.trackingUrl;
        venta.carrier = resultadoEnvio.carrier;
        venta.statusEnvio = 'Guía Generada';
        await venta.save();
        console.log(`[Worker] Guía generada exitosamente para: ${ventaId}`);

    } else if (resultadoEnvio.omitido) {
        // Si fue donación o internacional, lo marcamos como completado para no reintentar
        venta.statusEnvio = 'No requiere envío físico';
        await venta.save();
        console.log(`[Worker] Venta ${ventaId} omitida: ${resultadoEnvio.mensaje}`);

    } else {
        // Si fue un error real de red o de Skydropx
        throw new Error(`Skydropx falló: ${resultadoEnvio.error}`);
    }
}, { connection });

worker.on('failed', (job, err) => {
    console.error(`[Worker] Error en el trabajo ${job.id}: ${err.message}`);
});

module.exports = worker;