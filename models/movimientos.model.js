const { Schema, model } = require('mongoose');

const MovimientosSchema = Schema({

    monto: {
        type: Number,
        require: true,
    },

    descripcion: {
        type: String,
        require: true
    },

    type: {
        type: String,
        required: true
    },

    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    rifa: {
        type: Schema.Types.ObjectId,
        ref: 'Rifas',
        require: true
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

MovimientosSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.moid = _id;
    return object;

});

module.exports = model('Movimientos', MovimientosSchema);