const fs = require('fs');

// MODELS
const User = require('../models/users.model');
const Rifa = require('../models/rifas.model');

/** =====================================================================
 *  DELETE IMAGE
=========================================================================*/
const deleteImage = (path) => {

    // VALIDATE IMAGE
    if (fs.existsSync(path)) {
        // DELET IMAGE OLD
        fs.unlinkSync(path);
    }

};

/** =====================================================================
 *  DELETE IMAGE
=========================================================================*/


/** =====================================================================
 *  UPDATE IMAGE 
=========================================================================*/
const updateImage = async(tipo, id, nameFile, desc) => {

    let pathOld = '';

    switch (tipo) {
        case 'rifa':

            const rifa = await Rifa.findById(id);
            if (!rifa) {
                return false;
            }

            rifa.img.push({
                img: nameFile,
                fecha: new Date(Date.now())
            })

            await rifa.save();
            return true;



            // BREAK PRODUCT
            break;

        case 'user':

            // SEARCH USER BY ID
            const user = await User.findById(id);
            if (!user) {
                return false;
            }

            // VALIDATE IMAGE
            pathOld = `./uploads/user/${ user.img }`;
            deleteImage(pathOld);

            // SAVE IMAGE
            user.img = nameFile;
            await user.save();
            return true;

            break;

        default:
            break;
    }


};
/** =====================================================================
 *  UPDATE IMAGE
=========================================================================*/

// EXPORT
module.exports = {
    updateImage
};