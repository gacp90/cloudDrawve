const { Schema, model } = require('mongoose');

const SmsSchema = Schema({

    number: { type: String, required: true },

    message: { type: String, required: true },

    type: { type: String, enum: ['sms', 'call'], default: 'sms' },

    // 👇 QUIÉN ENVÍA EL MENSAJE
    sender: {
        type: String,
        enum: ['admin', 'client'],  // admin = tú / client = cliente
        required: true,
        default: 'admin'
    },

    cliente: {
        type: Schema.Types.ObjectId,
        ref: 'Clientes'
    },

    admin: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    fecha: {
        type: Date,
        default: Date.now
    },

    visto: {
        type: Boolean,
        default: false
    },

    status: {
        type: Boolean,
        default: true
    }

});

SmsSchema.method('toJSON', function () {
    const { __v, _id, ...object } = this.toObject();
    object.smsid = _id;
    return object;
});

module.exports = model('Sms', SmsSchema);
