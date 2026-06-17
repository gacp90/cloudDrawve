const { Schema, model } = require('mongoose');

const methodSchema = Schema({

    moneda: {
        type: String,
        require: true
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

    comision: {
        type: Number,
        require: true,
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

module.exports = model('Methods', methodSchema);