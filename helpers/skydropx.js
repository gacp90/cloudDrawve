const axios = require('axios');

// 1. Autenticación Correcta (V1)
const obtenerTokenSkydropx = async () => {
    const response = await axios.post('https://app.skydropx.com/api/v1/oauth/token', {
        grant_type: 'client_credentials',
        client_id: process.env.CC_SKYDROPX,
        client_secret: process.env.CS_SKYDROPX
    });
    return response.data.access_token;
};

const generarGuiaSkydropx = async (datosVenta) => {
    try {
        const token = await obtenerTokenSkydropx();
        const config = { 
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } 
        };
        
        const pesoTotalKg = Number((datosVenta.item.qty * 0.030).toFixed(3));
        
        // 2. Crear el Shipment para obtener cotizaciones (Rates)
        const payloadShipment = {
            "address_from": {
                "province": "Antioquia",
                "city": "Sabaneta",
                "name": "SOMOSPRIME.CO",
                "zip": "055450", // Skydropx V1 es estricto con los códigos postales
                "country": "CO",
                "address1": "CALLE 61B SUR 40-20",
                "company": "SOMOSPRIME",
                "phone": "3106963870",
                "email": "contacto@somosprime.co"
            },
            "address_to": {
                "province": datosVenta.departamento,
                "city": datosVenta.ciudad,
                "name": datosVenta.nombre,
                "zip": "000000", // Idealmente, pide el código postal en el checkout
                "country": "CO",
                "address1": datosVenta.direccion,
                "company": "Cliente",
                "phone": datosVenta.telefono,
                "email": datosVenta.correo,
                "reference": datosVenta.direccion
            },
            "parcels": [{
                "weight": pesoTotalKg < 1 ? 1 : pesoTotalKg,
                "distance_unit": "CM",
                "mass_unit": "KG",
                "length": 30,
                "height": 4,
                "width": 20
            }]
        };

        const shipmentReq = await axios.post('https://app.skydropx.com/api/v1/shipments', payloadShipment, config);
        
        // 3. Filtrar las tarifas para encontrar "ENVIA" (como hacían en el Legacy)
        const rates = shipmentReq.data.included.filter(item => item.type === 'rates');
        const tarifaEnvia = rates.find(rate => rate.attributes.provider.toUpperCase() === 'ENVIA');
        
        // Si no está ENVIA disponible por alguna razón, toma la primera opción (la más barata suele ser la 0)
        const rateId = tarifaEnvia ? tarifaEnvia.id : rates[0].id;

        // 4. Generar la etiqueta oficial (Label)
        const labelReq = await axios.post('https://app.skydropx.com/api/v1/labels', {
            "rate_id": rateId,
            "label_format": "pdf"
        }, config);

        if (labelReq.data && labelReq.data.data) {
            return {
                exito: true,
                guiaUrl: labelReq.data.data.attributes.label_url,
                tracking: labelReq.data.data.attributes.tracking_number
            };
        }

        return { exito: false, error: 'Respuesta vacía al generar guía' };

    } catch (error) {
        // En V1, Skydropx devuelve arreglos de errores detallados en error.response.data.errors
        console.error('Error Skydropx V1:', error.response?.data?.errors || error.message);
        return { exito: false, error: error.message };
    }
};

module.exports = { generarGuiaSkydropx };