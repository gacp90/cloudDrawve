const { Schema, model } = require('mongoose');

const RutasSchema = Schema({

    name: {
        type: String,
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

});

RutasSchema.method('toJSON', function() {

    const { __v, _id, ...object } = this.toObject();
    object.ruid = _id;
    return object;

});

module.exports = model('Rutas', RutasSchema);