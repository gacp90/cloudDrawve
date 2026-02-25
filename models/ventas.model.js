const { Schema, model } = require('mongoose');

const TickestSchema = Schema({
    ticket: {
        type: Schema.Types.ObjectId,
        ref: 'Tickets'
    },
});

const ItemsSchema = Schema({
        
    name: { 
        type: String 
    },

    size: { 
        type: String 
    },

    color: { 
        type: String 
    },
    
    price: { 
        type: Number,
    },

    digital: { 
        type: Number,
        default: false
    },

    qty: { 
        type: Number, 
        default: 1 
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

    pais: {
        type: String
    },

    departamento: {
        type: String
    },

    ciudad: {
        type: String
    },
    
    direccion: {
        type: String
    },

    guia: {
        type: String
    },

    correo: {
        type: String
    },
    
    signature: {
        type: String
    },

    amountInCents: {
        type: Number
    },

    deliveryprice: {
        type: Number
    },

    rifa: {
        type: Schema.Types.ObjectId,
        ref: 'Rifas',
        require: true
    },

    wompi: {
        type: Boolean
    },

    wompi_id: {
        type: String
    },

    estado: {
        type: String,
        default: 'Pendiente'
    },

    item: ItemsSchema,

    nota: {
        type: String
    },

    donar: {
        type: Boolean,
        default: false
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