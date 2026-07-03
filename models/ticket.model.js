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

const MetodoSchema = Schema({
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
})

const ParticipacionSchema = Schema({
    cliente: {
        type: Schema.Types.ObjectId,
        ref: 'Clientes',
        required: true
    },
    // Datos denormalizados para envíos masivos rápidos por WhatsApp API
    nombre: { type: String, required: true },
    cedula: { type: String, required: true },
    telefono: { type: String, required: true },
    codigo: { type: String }, // Ej: +58, +57
    
    // Contabilidad Individual (Ej: $10)
    montoAsignado: { 
        type: Number,
        required: true
    },
    // Cuánto ha pagado ESTA persona de sus $10
    totalPagado: { 
        type: Number,
        default: 0
    },
    // Estado de ESTA persona (Ej: 'Debe', 'Pagado')
    estadoDeuda: {
        type: String,
        default: 'Debe'
    }
});

const PagosSchema = Schema({

    descripcion: {
        type: String
    },

    estado: {
        type: String,
        default: 'Pendiente'
    },

    monto: {
        type: Number
    },

    equivalencia: {
        type: Number
    },

    metodo: MetodoSchema,

    web: {
        type: Boolean,
        defaul: false
    },

    referencia:{
        type: String,
        unique: true,
        sparse: true 
    },

    img: {
        type: String
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

    correo: {
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

    cobrador: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    cliente: {
        type: Schema.Types.ObjectId,
        ref: 'Clientes'
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

    sms: {
        type: Boolean,
        default: false
    },

    totalPagado: { type: Number, default: 0 },

    img: [ImgSchema],

    compradores: [ParticipacionSchema],
    
    compartido: {
        type: Boolean,
        default: false
    },

    status: {
        type: Boolean,
        default: true
    },

    fecha: {
        type: Date
    },

});

TicketsSchema.index({ rifa: 1, estado: 1 });
TicketsSchema.index({ rifa: 1, numero: 1 });

TicketsSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.tid = _id;
    return object;

});

module.exports = model('Tickets', TicketsSchema);