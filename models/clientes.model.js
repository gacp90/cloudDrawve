const { Schema, model } = require('mongoose');

const AlertsSchema = Schema({
    titulo: {
        type: String
    },

    msg: {
        type: String
    },

    icon: {
        type: String
    }
})

const ClientesSchema = Schema({

    nombre: {
        type: String,
        require: true,
    },

    codigo: {
        type: String,
    },

    telefono: {
        type: String,
    },

    cedula: {
        type: String,
    },

    direccion: {
        type: String,
    },

    correo: {
        type: String,
    },

    telegram: {
        type: Boolean,
        default: false
    },

    // 🔹 Rifero dueño del cliente
    admin: { 
        type: Schema.Types.ObjectId,
        ref: 'User',
        require: true
    },

    // 🔹 Ruta opcional (igual que en Tickets)
    ruta: { 
        type: Schema.Types.ObjectId,
        ref: 'Rutas',
        default: null
    },

    status: {
        type: Boolean,
        default: true
    },

    sms: {
        type: Boolean,
        default: false
    },
    
    alerts: {
        type: String
    },

    fecha: {
        type: Date,
        default: Date.now
    }

});

// 🔹 Para evitar duplicados de clientes por rifero (ej: misma cédula dos veces)
ClientesSchema.index({ admin: 1, cedula: 1 }, { unique: true, sparse: true });

ClientesSchema.method('toJSON', function () {
    const { __v, _id, ...object } = this.toObject();
    object.cid = _id;
    return object;
});

module.exports = model('Clientes', ClientesSchema);
