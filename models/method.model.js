const { Schema, model } = require('mongoose');

const methodSchema = Schema({

    moneda: {
        type: String,
        required: true
    },
        
    nombre: {
        type: String,
        required: true,
    },

    cuenta: {
        type: String,
        required: true,
    },

    tasa: {
        type: Number,
        required: true,
    },

    saldo: {
        type: Number,
        required: true,
        default: 0
    },

    comision: {
        type: Number,
        required: true,
    },

    admin: {
        type: Schema.Types.ObjectId,
        ref: 'User'
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

methodSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.metid = _id;
    return object;

});

module.exports = model('Methods', methodSchema, 'methods');