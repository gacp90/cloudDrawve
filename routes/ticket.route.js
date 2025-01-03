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
const { getTicket, getTicketId, createTicket, updateTicket, searchTicket, getTicketPaid, paymentsTicketOnline } = require('../controllers/tickets.controller');

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
 *  PUT TICKET
=========================================================================*/
router.put('/:id', validarJWT, updateTicket);

/** =====================================================================
 *  PUT PAYMENT ONLINE
=========================================================================*/
router.post('/payments/online', paymentsTicketOnline)

// EXPORT
module.exports = router;