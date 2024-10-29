const { Schema, model } = require('mongoose');

const PagosSchema = Schema({

    descripcion: {
        type: String
    },

    estado: {
        type: String,
        default: 'Confirmado'
    },

    monto: {
        type: Number
    },

    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    fecha: {
        type: Date,
        default: Date.now
    }

});

const TicketsSchema = Schema({

    numero: {
        type: String,
        require: true,
    },

    monto: {
        type: Number,
        require: true,
    },

    nombre: {
        type: String
    },

    codigo: {
        type: String
    },

    telefono: {
        type: String
    },

    cedula: {
        type: String
    },

    direccion: {
        type: String
    },

    ruta: {
        type: Schema.Types.ObjectId,
        ref: 'Rutas'
    },

    rifa: {
        type: Schema.Types.ObjectId,
        ref: 'Rifas',
        require: true
    },

    estado: {
        type: String,
        default: 'Disponible'
    },

    vendedor: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    pagos: [PagosSchema],

    nota: {
        type: String
    },

    disponible: {
        type: Boolean,
        default: true
    },

    ganador: {
        type: Boolean,
        default: false
    },

    status: {
        type: Boolean,
        default: true
    },

});

TicketsSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.tid = _id;
    return object;

});

module.exports = model('Tickets', TicketsSchema);