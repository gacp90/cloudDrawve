const { Schema, model } = require('mongoose');

const paymentsSchema = Schema({

    descripcion: {
        type: String,
        require: true,
    },

    referencia: {
        type: String,
        require: true,
    },

    nombre: {
        type: String,
        require: true,
    },

    cuenta: {
        type: String,
        require: true,
    },

    tasa: {
        type: Number,
        require: true,
    },

    monto: {
        type: Number,
        require: true,
    },

    equivalencia: {
        type: Number,
        require: true,
    },

    img: {
        type: String
    },

    cliente: {
        type: Schema.Types.ObjectId,
        ref: 'Clientes'
    },

    admin: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        require: true
    },

    ticket: {
        type: Schema.Types.ObjectId,
        ref: 'Tickets',
        require: true
    },

    vendedor: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        require: true
    },

    method: {
        type: Schema.Types.ObjectId,
        ref: 'Methods',
        require: true
    },

    rifa: {
        type: Schema.Types.ObjectId,
        ref: 'Rifas',
        require: true
    },

    ruta: {
        type: Schema.Types.ObjectId,
        ref: 'Rutas'
    },

    estado: {
        type: String,
        default: 'Pendiente'
    },

    status: {
        type: Boolean,
        default: true
    },

    fecha: {
        type: Date,
        default: Date.now()
    },

});

paymentsSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.payid = _id;
    return object;

});

module.exports = model('Payments', paymentsSchema);