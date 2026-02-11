const cron = require('node-cron');
const axios = require('axios'); // ¡No olvides importar axios!
const Venta = require('../models/ventas.model');
const Ticket = require('../models/ticket.model');

const verifyWompi = () => {
    // Ejecutamos cada 10 o 15 minutos para mantener la DB fresca
    cron.schedule('*/15 * * * *', async () => {
        console.log('--- Iniciando barrido de verificación Wompi ---');
        
        const ahora = new Date();
        const tiempoGraciaVerificacion = new Date(ahora - 5 * 60 * 1000); // 5 min para empezar a verificar
        const tiempoLimiteExpiracion = new Date(ahora - 30 * 60 * 1000); // 30 min para liberar tickets

        try {
            // Buscamos solo las que están en el limbo
            const pendientes = await Venta.find({ 
                estado: { $in: ['Pendiente', 'Rechazado'] },
                fecha: { $lt: tiempoGraciaVerificacion } 
            });

            for (const venta of pendientes) {
                try {
                    // 1. INTENTAR RECUPERAR: Consultamos a Wompi
                    const { data } = await axios.get(`https://production.wompi.co/v1/transactions?reference=${venta._id}`, {
                        headers: { Authorization: `Bearer ${process.env.WOMPI_PRV_KEY}` }
                    });

                    const transaccion = data.data[0];

                    if (transaccion && transaccion.status === 'APPROVED') {
                        venta.estado = 'Pagado';
                        venta.wompi_id = transaccion.id;
                        await venta.save();

                        await Ticket.updateMany(
                            { _id: { $in: venta.tickets.map(t => t.ticket) } },
                            { $set: { estado: 'Vendido', disponible: false } }
                        );
                        console.log(`[RECUPERADA] Venta ${venta._id} pagada en Wompi.`);
                        continue; // Saltamos a la siguiente venta, esta ya se salvó
                    }

                    // 2. EXPIRAR: Si no está pagada y ya pasó el tiempo límite
                    if (venta.fecha < tiempoLimiteExpiracion) {
                        const ids = venta.tickets.map(t => t.ticket);
                        
                        await Ticket.updateMany(
                            { _id: { $in: ids } },
                            { 
                                $set: { 
                                    estado: 'Disponible',
                                    disponible: true,
                                    ganador: false,
                                    status: true,
                                    pagos: [],
                                    // Limpiamos datos del cliente para que el ticket sea nuevo
                                    cedula: undefined, nombre: undefined, telefono: undefined,
                                    codigo: undefined, direccion: undefined, ruta: undefined,
                                    vendedor: undefined, cliente: undefined, nota: undefined
                                },
                                $unset: { nombre: 1, telefono: 1, cedula: 1 } // Asegura eliminación
                            }
                        );

                        venta.estado = 'Expirado';
                        await venta.save();
                        console.log(`[EXPIRADA] Venta ${venta._id} y tickets liberados.`);
                    }

                } catch (err) {
                    console.error(`Error procesando venta ${venta._id}:`, err.message);
                }
            }
        } catch (error) {
            console.error('Error general en CRON Wompi:', error);
        }
    });
};

module.exports = { verifyWompi };