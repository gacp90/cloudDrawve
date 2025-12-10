const { Schema, model } = require('mongoose');

const UserSchema = Schema({

    email: {
        type: String,
        require: true,
        unique: true
    },

    name: {
        type: String,
        require: true
    },

    phone: {
        type: String
    },

    tasabs: {
        type: Number
    },

    tasacop: {
        type: Number
    },

    empresa: {
        type: String
    },

    password: {
        type: String,
        require: true
    },
    role: {
        type: String,
        default: 'ADMIN',
        require: true
    },

    img: {
        type: String
    },

    status: {
        type: Boolean,
        default: true
    },

    admin: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    fecha: {
        type: Date,
        default: Date.now
    },

    referralCode: {
        type: String
    },

    referredBy: {
        type: String
    },

    walletBalance: {
        type: Number,
        default: 0
    },

    whatsapp: {
        type: Boolean,
        default: false
    },
    
    wp: {
        type: String
    },

    wati: {
        type: Boolean,
        default: false
    },

    watilink: {
        type: String,
        default: 'empty'
    },

    watitoken: {
        type: String,
        default: 'empty'
    },

    termica: {
        type: Boolean,
        default: false
    },

    gsm: {
        type: Boolean,
        default: false
    },

    moroso: {
        type: Boolean,
        default: false
    },
    
    msg: {
        type: String
    }

});

UserSchema.method('toJSON', function() {

    const { __v, _id, password, ...object } = this.toObject();
    object.uid = _id;
    return object;

});

module.exports = model('User', UserSchema);