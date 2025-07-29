const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

/** =====================================================================
 *  ENVIAR CORREOS
=========================================================================*/
const sendMail = async(email, subject, html, msg) => {

    email = email.toLowerCase();
    email = email.trim();

    try {

        let transporter = nodemailer.createTransport({
            pool: true,
            host: "smtp.zoho.com",
            port: 465,
            secure: true, // use TLS
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAILP,
            },
        });

        const mailOptions = {
            from: '"Rifari" <contacto@rifari.com>', // sender address (who sends)
            to: email, // list of receivers (who receives)
            subject, // Subject line
            html,
        };

        // send mail with defined transport object
        await transporter.sendMail(mailOptions, async(error, info) => {
            if (error) {
                console.log(error);
                return false;
            }

            return true;

        });


    } catch (error) {
        console.log(error);
        return false;

    }

}

// EXPORT
module.exports = {
    sendMail
};