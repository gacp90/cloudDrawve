const axios = require('axios');
const codigosBackend = require('../json/backend-codigos.json'); // Tu diccionario recién generado

// Normalizador para la ciudad, departamento y país
const normalizarTexto = (texto) => {
    if (!texto) return '';
    return String(texto).normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-zA-Z0-9\s]/g, "") 
        .toUpperCase()
        .trim()
        .replace(/\s+/g, " ");
};

const obtenerTokenSkydropx = async () => {
    const response = await axios.post('https://app.skydropx.com/api/v1/oauth/token', {
        grant_type: 'client_credentials',
        client_id: process.env.CC_SKYDROPX,
        client_secret: process.env.CS_SKYDROPX
    });
    return response.data.access_token;
};

// Petición a la V2
const intentarCrearGuiaV2 = async (carrierName, serviceName, payloadBase, config) => {
    const payloadFinal = { ...payloadBase };
    payloadFinal.quotation.carrier = {
        name: carrierName,
        service_name: serviceName
    };
    const response = await axios.post('https://api.skydropx.com/v2/shipments', payloadFinal, config);
    return response.data;
};

const generarGuiaSkydropx = async (datosVenta) => {
    try {
        // ==========================================
        // REGLA 1: Excluir Donaciones
        // ==========================================
        if (datosVenta.donar === true) {
            return { exito: false, omitido: true, mensaje: 'Es donación, no requiere envío.' };
        }

        // ==========================================
        // REGLA 2: Solo envíos en Colombia
        // ==========================================
        const paisCliente = normalizarTexto(datosVenta.pais);
        if (paisCliente !== 'COLOMBIA') {
            return { exito: false, omitido: true, mensaje: 'Envío internacional, no aplica Skydropx local.' };
        }

        // ==========================================
        // REGLA 3: Cálculo de Volumen (Máximo 10)
        // ==========================================
        const qty = datosVenta.item?.qty || 1;
        const cantidadGuantes = qty > 10 ? 10 : qty; // Tope máximo de seguridad
        
        const pesoKgRaw = cantidadGuantes * 0.030;
        const pesoTotalKg = pesoKgRaw < 1 ? 1 : pesoKgRaw; // Mínimo 1 KG
        
        // Base 4cm de alto. Por cada guante extra, sube 1cm el paquete
        const altoPaquete = 2 + (cantidadGuantes - 1); 

        // ==========================================
        // REGLA 4: Diccionario de Códigos Postales
        // ==========================================
        const deptoNorm = normalizarTexto(datosVenta.departamento);
        const ciudadNorm = normalizarTexto(datosVenta.ciudad);
        const llaveBusqueda = `${deptoNorm}-${ciudadNorm}`;
        
        // Si no lo encuentra (zona sin cobertura), manda el paquete a la bodega principal de Bogotá por defecto
        const codigoPostalFinal = codigosBackend[llaveBusqueda] || "110111";

        // ==========================================
        // GENERACIÓN DEL PAYLOAD
        // ==========================================
        const token = await obtenerTokenSkydropx();
        const config = { 
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } 
        };

        const payloadBase = {
            "timeout": 15,
            "sync_label_creation": true,
            "quotation": {
                "printing_format": "thermal",
                "include_order_detail": false,
                "declared_amount": datosVenta.monto || 45000,
                "address_from": {
                    "address_template_id": "1edee2d2-26b0-46c7-bed3-30c0577d2d90",
                    "name": "Somosprime Co",
                    "company": "SOMOSPRIME.CO",
                    "street1": "CALLE 61B SUR 40-20",
                    "postal_code": "055450", // Sabaneta
                    "area_level1": "ANTIOQUIA",
                    "area_level2": "SABANETA",
                    "country_code": "CO",
                    "phone": "3106963870",
                    "email": "contacto@somosprime.co",
                    "tax_id_number": "1110054029"
                },
                "address_to": {
                    "country_code": "CO",
                    "postal_code": codigoPostalFinal,
                    "area_level1": datosVenta.departamento || "N/A",
                    "area_level2": datosVenta.ciudad || "N/A",
                    "name": datosVenta.nombre,
                    "street1": datosVenta.direccion,
                    "company": datosVenta.nombre,
                    "phone": datosVenta.telefono,
                    "email": datosVenta.correo || "contacto@somosprime.co",
                    "reference": datosVenta.direccion
                },
                "parcels": [{
                    "weight": pesoTotalKg,
                    "height": altoPaquete,
                    "width": 6,
                    "length": 15,
                    "package_number": "1",
                    "package_content": `${cantidadGuantes}x ${datosVenta.item?.name || "Artículos"}`,
                    "package_type": "4G"
                }]
            }
        };

        // ==========================================
        // ESTRATEGIA DE REINTENTOS AUTOMÁTICOS
        // ==========================================
        console.log('=========================================================')
        console.log('Envio: ',JSON.stringify(payloadBase))
        console.log('=========================================================')
        let resultData = null;
        try {
            // Intento 1: Servientrega
            resultData = await intentarCrearGuiaV2('servientrega', 'standard_sin_contraentrega', payloadBase, config);
        } catch (errorServientrega) {
            console.log(`[Skydropx] Servientrega falló. Intentando Envía...`);
            
            try {
                // Intento 2: Envía (Fallback)
                resultData = await intentarCrearGuiaV2('envia', 'paquete_terrestre', payloadBase, config);
            } catch (errorEnvia) {
                // CAPTURAMOS EL MOTIVO REAL DE LA API Y LO ENVIAMOS AL ERROR
                const motivoServientrega = JSON.stringify(errorServientrega.response?.data?.errors || errorServientrega.message);
                const motivoEnvia = JSON.stringify(errorEnvia.response?.data?.errors || errorEnvia.message);
                
                throw new Error(`Servientrega rechazó: ${motivoServientrega} | Envía rechazó: ${motivoEnvia}`);
            }
        }

        if (resultData && resultData.data && resultData.data[0]) {
            const envioInfo = resultData.data[0];
            return {
                exito: true,
                guiaUrl: envioInfo.label_url,
                tracking: envioInfo.master_tracking_number,
                trackingUrl: envioInfo.packages[0]?.tracking_url_provider || null,
                carrier: envioInfo.rate?.provider_name || 'Desconocido'
            };
        }

        return { exito: false, error: 'Respuesta vacía de Skydropx' };

    } catch (error) {
        console.error('Error Fatal Skydropx V2:', error.response?.data?.errors || error.message);
        return { exito: false, error: error.message };
    }
};

module.exports = { generarGuiaSkydropx };