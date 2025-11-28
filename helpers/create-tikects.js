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

/** =====================================================================
 *  CREATE TICKETS (con agrupación)
=========================================================================*/
const createTicketsAgrupado = async (monto, rifa, totalNumeros, grupo = 2) => {

    if (grupo !== 2) {
        throw new Error('Este patrón solo soporta grupo = 2');
    }

    const numLength = (totalNumeros - 1).toString().length;

    const mitad = totalNumeros / 2; // 500 si total es 1000

    const ticketsArray = [];

    for (let i = 0; i < mitad; i++) {

        const n1 = i.toString().padStart(numLength, '0');

        // Aquí está el truco: +1 y modulo
        const n2Index = (i + mitad + 1) % totalNumeros;

        const n2 = n2Index.toString().padStart(numLength, '0');

        ticketsArray.push({
            numero: `${n1}-${n2}`,
            monto,
            rifa
        });
    }

    await Ticket.insertMany(ticketsArray);
    return true;
};



// EXPORT
module.exports = {
    createTickets,
    createTicketsAgrupado
};