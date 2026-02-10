const { Schema, model } = require('mongoose');

const TickestSchema = Schema({
    ticket: {
        type: Schema.Types.ObjectId,
        ref: 'Tickets'
    },
});

const VentasSchema = Schema({

    tickets: [TickestSchema],

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

    correo: {
        type: String
    },

    rifa: {
        type: Schema.Types.ObjectId,
        ref: 'Rifas',
        require: true
    },

    wompi: {
        type: Boolean
    },

    referencia: {
        type: String
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
        default: Date.now
    }

});

VentasSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.vid = _id;
    return object;

});

module.exports = model('ventas', VentasSchema);