const Ticket = require('../models/ticket.model');

/** =====================================================================
 *  CREATE TICKET
=========================================================================*/
const createTickets = async(monto, rifa, numeros) => {

    for (let i = 0; i < numeros; i++) {

        if (i < 10) {

            const ticket = {
                numero: `00${i}`,
                monto,
                rifa
            }

            const ticketSave = new Ticket(ticket);
            await ticketSave.save();

        } else if (i < 100) {
            const ticket = {
                numero: `0${i}`,
                monto,
                rifa
            }

            const ticketSave = new Ticket(ticket);
            await ticketSave.save();
        } else {
            const ticket = {
                numero: `${i}`,
                monto,
                rifa
            }

            const ticketSave = new Ticket(ticket);
            await ticketSave.save();
        }

    }

    return true;

};


// EXPORT
module.exports = {
    createTickets
};