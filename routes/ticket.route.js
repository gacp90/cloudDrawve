/** =====================================================================
 *  TICKET ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const expressFileUpload = require('express-fileupload');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { getTicket, getTicketId, createTicket, updateTicket, searchTicket, getTicketPaid, paymentsTicketOnline, restoreTicket, ticketGanador, updateVendedor, saveTicketsMasives, exportTicketsPDF } = require('../controllers/tickets.controller');

const router = Router();

router.use(expressFileUpload());

/** =====================================================================
 *  POST TICKETS
=========================================================================*/
router.post('/query', getTicket);

/** =====================================================================
 *  GET TICKET ID
=========================================================================*/
router.get('/:id', validarJWT, getTicketId);

/** =====================================================================
 *  GET TICKET INGRESOS
=========================================================================*/
router.get('/ingresos/:rifa', validarJWT, getTicketPaid);

/** =====================================================================
 *  POST EXPORT TICKETS AVAILABLE
=========================================================================*/
router.get('/pdf/:rifaId', exportTicketsPDF);

/** =====================================================================
 *  GET SEARCH TICKET
=========================================================================*/
router.get('/search/:rifa/:busqueda', searchTicket);

/** =====================================================================
 *  POST CREATE TICKET
=========================================================================*/
router.post('/', [
        validarJWT,
        check('monto', 'El monto es olbigatorio').not().isEmpty(),
        validarCampos
    ],
    createTicket
);

/** =====================================================================
 *  POST TICKET GANADOR
=========================================================================*/
router.post('/ganador', [
        validarJWT,
        check('tid', 'El ticket es obligatorio').not().isEmpty(),
        check('rifid', 'Falta Información de la rifa').not().isEmpty(),
        validarCampos
    ],
    ticketGanador
);

/** =====================================================================
 *  POST MASIVES TICKETS
=========================================================================*/
router.post('/send/masive', validarJWT, saveTicketsMasives);

/** =====================================================================
 *  PUT TICKET
=========================================================================*/
router.put('/:id', validarJWT, updateTicket);

/** =====================================================================
 *  PUT VENDEDOR TICKET
=========================================================================*/
router.put('/vendedor/:id', validarJWT, updateVendedor);

/** =====================================================================
 *  RESTORE TICKET
=========================================================================*/
router.delete('/restore/:id', validarJWT, restoreTicket);

/** =====================================================================
 *  PUT PAYMENT ONLINE
=========================================================================*/
router.post('/payments/online', paymentsTicketOnline)

// EXPORT
module.exports = router;