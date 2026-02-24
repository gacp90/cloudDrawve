const { Schema, model } = require('mongoose');

const TickestSchema = Schema({
    ticket: {
        type: Schema.Types.ObjectId,
        ref: 'Tickets'
    },
});

const ItemsSchema = Schema({
    producto: { 
        type: Schema.Types.ObjectId, 
        ref: 'products' 
    },
    
    tallaSeleccionada: { 
        type: String 
    },

    colorSeleccionado: { 
        type: String 
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

    direccion: {
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

    items: [ItemsSchema],

    nota: {
        type: String
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