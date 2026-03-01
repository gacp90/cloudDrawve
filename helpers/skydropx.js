const axios = require('axios');

const generarGuiaSkydropx = async (datosEnvio) => {
    try {
        const url = 'https://api.skydropx.com.co/api/generate';
        const pesoTotalKg = Number((datosEnvio.item.qty * 0.030).toFixed(3));

        const payload = {
            "data": [{
                "nombre": "SOMOSPRIME.CO",
                "telefono": "3106963870",
                "correo": "contacto@somosprimne.co",
                "direccion": "CALLE 61B SUR 40-20",
                "ciudad": "SABANETA, ANTIOQUIA",
                "puntoDeReferencia": "Oficina",  
                "nombreDestinatario": datosEnvio.nombre,
                "destinatarioTelefono": datosEnvio.telefono,
                "destinatarioCorreo": datosEnvio.correo,
                "destinatarioDireccion": datosEnvio.direccion,
                "destinatarioCiudad": `${datosEnvio.ciudad.toUpperCase().trim()}, ${datosEnvio.departamento.toUpperCase().trim()}`,
                "destinatarioPuntoDeReferencia": datosEnvio.direccion,
                "contenidoDelPaquete": `${datosEnvio.item.qty} Guantes MIKITMUA - Talla ${datosEnvio.item.size}`,
                "sucursalInter": "",
                "alto": 4,  
                "largo": 30,
                "ancho": 20,
                "peso": 1,
                "valorADeclarar": datosEnvio.monto,
                "valorContraentrega": 0,
                "paquetera": "ENVIA"
            }]
        };

        console.log(payload);
        

        const resp = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer 9f63558182501a184636c09a1f60956d12e6114f373e80c3e0137748de3ac9be`,
                'Content-Type': 'application/json'
            }
        });

        console.log(resp);
        

        if (resp.data && resp.data.length > 0) {
            return resp.data[0].guia; 
        }
        
        return null;

    } catch (error) {
        console.error('Error en Skydropx:', error.response?.data || error.message);
        return null;
    }
};

module.exports = { generarGuiaSkydropx };