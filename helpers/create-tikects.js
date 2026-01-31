const Ticket = require('../models/ticket.model');

/** =====================================================================
 *  CREATE TICKET
=========================================================================*/
/** =====================================================================
 * CREATE TICKET (OPTIMIZADO PARA MILLONES)
=========================================================================*/
const createTickets = async (monto, rifa, numeros) => {
    
    // Configuración del lote (20,000 es un buen balance entre velocidad y memoria)
    const BATCH_SIZE = 20000; 
    
    // Determina la longitud de los ceros (Ej: 1000000 -> 6 ceros: 000000)
    // Nota: Si numeros es 1000, length es 4, restas 1 = 3. (000 - 999). Correcto.
    const numLength = numeros.toString().length - 1;

    let ticketsBatch = [];
    let totalInsertados = 0;

    console.log(`🔥 Iniciando creación masiva de ${numeros} tickets para la rifa ${rifa}...`);

    for (let i = 0; i < numeros; i++) {
        
        // Genera el número con ceros a la izquierda
        const numeroFormateado = i.toString().padStart(numLength, '0');

        // Agrega al array temporal (Lote)
        ticketsBatch.push({
            numero: numeroFormateado,
            monto,
            rifa
        });

        // --- MOMENTO DE INSERTAR Y LIMPIAR ---
        if (ticketsBatch.length === BATCH_SIZE) {
            // 1. Insertamos el lote actual en BD
            await Ticket.insertMany(ticketsBatch);
            
            // 2. IMPORTANTE: Vaciamos el array para LIBERAR MEMORIA RAM
            ticketsBatch = []; 
            
            // Log opcional para ver progreso en consola del servidor
            totalInsertados += BATCH_SIZE;
            console.log(`... Insertados ${totalInsertados} tickets`);
        }
    }

    // --- INSERTAR EL RESTO ---
    // Si eran 1,000,005 tickets, aquí se insertan los últimos 5 que sobraron
    if (ticketsBatch.length > 0) {
        await Ticket.insertMany(ticketsBatch);
        console.log(`... Insertados últimos ${ticketsBatch.length} tickets`);
    }

    console.log('✅ Creación de tickets finalizada con éxito.');
    return true;

};
// const createTickets = async(monto, rifa, numeros) => {

//     // Determina la longitud de los dígitos según el número total de tickets
//     const numLength = numeros.toString().length - 1;
    
//     // Array para almacenar los tickets
//     const ticketsArray = [];

//     for (let i = 0; i < numeros; i++) {
//         // Genera el número con ceros a la izquierda según su longitud
//         const numeroFormateado = i.toString().padStart(numLength, '0');

//         // Crea el ticket y agrégalo al array
//         ticketsArray.push({
//             numero: numeroFormateado,
//             monto,
//             rifa
//         });
//     }

//     // Inserta todos los tickets en una sola operación
//     await Ticket.insertMany(ticketsArray);

//     return true;
    
// };

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