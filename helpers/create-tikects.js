const Ticket = require('../models/ticket.model');

/** =====================================================================
 *  CREATE TICKET
=========================================================================*/
const createTickets = async(monto, rifa, numeros) => {

    // Determina la longitud de los dígitos según el número total de tickets
    const numLength = numeros.toString().length - 1;
    
    // Array para almacenar los tickets
    const ticketsArray = [];

    for (let i = 0; i < numeros; i++) {
        // Genera el número con ceros a la izquierda según su longitud
        const numeroFormateado = i.toString().padStart(numLength, '0');

        // Crea el ticket y agrégalo al array
        ticketsArray.push({
            numero: numeroFormateado,
            monto,
            rifa
        });
    }

    // Inserta todos los tickets en una sola operación
    await Ticket.insertMany(ticketsArray);

    return true;
    
};


// EXPORT
module.exports = {
    createTickets
};