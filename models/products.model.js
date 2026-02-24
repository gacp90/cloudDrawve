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

const ProductoSchema = Schema({
    code: { 
        type: String, 
        required: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    precio: { 
        type: Number, 
        required: true 
    },
    qty: { 
        type: Number, 
        required: true 
    },
    tipo: { 
        type: String, 
        default: 'Fisico' 
    }, // 'Fisico' o 'Digital'
    
    // Arrays de opciones disponibles
    tallas: [{ type: String }],  // Ejemplo: ['S', 'M', 'L', 'XL']
    colores: [{ type: String }], // Ejemplo: ['Negro', 'Azul', 'Rojo']
    
    rifa: { 
        type: Schema.Types.ObjectId, 
        ref: 'Rifas' 
    },
    admin: { 
        type: Schema.Types.ObjectId, 
        ref: 'User' 
    },
    img: [ImgSchema],
    status: {
        type: Boolean,
        default: true
    },
    fecha: {
        type: Date,
        default: Date.now
    }
});

ProductoSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.pid = _id;
    return object;

});

module.exports = model('products', ProductoSchema); 