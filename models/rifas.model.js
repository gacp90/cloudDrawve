const { Schema, model } = require('mongoose');

const ImgSchema = Schema({

    img: {
        type: String
    },

    fecha: {
        type: Date,
        default: Date.now()
    }

});

const MetodosSchema = Schema({

    name: {
        type: String
    },

    descripcion: {
        type: String
    },

    cuenta: {
        type: String
    },

    tasa: {
        type: Number
    }

});

const MontosSchema = Schema({
    monto: {
        type: Number
    },
    
    qty: {
        type: Number,
        default: 0
    }    
});

const BtnsSchema = Schema({
    name: {
        type: String
    },

    monto: {
        type: Number
    },
    
    qty: {
        type: Number,
        default: 0
    },

    color: {
        type: String,
        default: '#000'
    },

    fondo: {
        type: String,
        default: '#fff'
    }
    
});

const PremiosSchema = Schema({

    name: {
        type: String
    },

    descripcion: {
        type: String
    },

    fecha: {
        type: Date
    }

});

const RifasSchema = Schema({

    name: {
        type: String,
        require: true,
    },

    monto: {
        type: Number,
        require: true,
    },

    promocion: {
        type: Number,
        default: 0
    },

    montos: [MontosSchema],

    comision: {
        type: Number,
        default: 0
    },

    numeros: {
        type: Number,
        require: true,
    },

    loteria: {
        type: String,
        require: true,
    },

    fecha: {
        type: Date,
        require: true,
    },

    descripcion: {
        type: String,
        require: true,
    },

    metodos: [MetodosSchema],

    premios: [PremiosSchema],

    img: [ImgSchema],

    portada: ImgSchema,

    estado: {
        type: String,
        default: 'Pendiente'
    },

    admin: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    abierta: {
        type: Boolean,
        default: true
    },

    visible: {
        type: Boolean,
        default: false
    },

    lista: {
        type: Boolean,
        default: true
    },

    botones: [BtnsSchema],

    min: {
        type: Number,
        default: 1
    },
    max: {
        type: Number,
        default: 50     
    },

    status: {
        type: Boolean,
        default: true
    },

});

RifasSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.rifid = _id;
    return object;

});

module.exports = model('Rifas', RifasSchema);