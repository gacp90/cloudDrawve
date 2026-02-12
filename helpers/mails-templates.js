const generarHtmlTickets = (venta) => {
    
    console.log(venta.rifa.admin);
    

    try {
        const listaTickets = venta.tickets.map(t => 
        `<span style="background-color: #f3b111; color: #000; padding: 8px 12px; border-radius: 5px; font-weight: bold; margin: 5px; display: inline-block; font-family: monospace; font-size: 16px;">
           #${String(t.ticket.numero).padStart(3, '0')}
        </span>`
    ).join('');

    // 2. Construir URL de la imagen 9:16
    // Ajusta 'process.env.BASE_URL' a tu dominio (ej: https://rifari.com)
    const urlPortada = venta.rifa.portada?.img 
        ? `${process.env.BASE_URL}/api/uploads/portada/${venta.rifa.portada.img}`
        : null;

    const imagenHtml = urlPortada 
        ? `<div style="text-align: center; margin-bottom: 25px;">
             <img src="${urlPortada}" alt="Flyer Rifa" style="width: 100%; max-width: 280px; border-radius: 12px; box-shadow: 0 10px 20px rgba(0,0,0,0.5);">
           </div>` 
        : '';

    return `

    <div style="background-color: #000000; color: #ffffff; padding: 40px 20px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; border-radius: 0; max-width: 600px; margin: auto;">
        
        ${imagenHtml}

        <div style="text-align: center;">
            <h1 style="color: #f3b111; font-size: 28px; margin-bottom: 10px;">¡TRANSACCIÓN EXITOSA!</h1>
            <p style="font-size: 18px; color: #ffffff; margin-bottom: 30px;">Hola <strong>${venta.nombre}</strong>, gracias por la compra. Tus boletas, han sido reservadas exitosamente para el sorteo de ${venta.rifa.name}.</p>
        </div>
        
        <div style="background-color: #1a1a1a; padding: 30px; border-radius: 15px; text-align: center; border: 1px solid #333; margin-bottom: 30px;">
            <p style="color: #888; font-size: 14px; margin-bottom: 15px; letter-spacing: 2px;">TUS NÚMEROS</p>
            ${listaTickets}
        </div>

        <div style="border-top: 1px solid #333; padding-top: 20px; color: #666; font-size: 13px;">
            <p style="margin: 5px 0;"><strong>Referencia:</strong> <a href="${process.env.LOCAL_URL}/verificar-pago/${venta._id || venta.vid}" target="_blank" style="color: #3bb7ff;">${venta._id || venta.vid} <small>(Verificar Pago)</small>   </a> </p>
            <p style="margin: 5px 0;"><strong>Sorteo:</strong> ${venta.rifa.name || 'Sorteo Rifari'}</p>
            <p style="margin: 5px 0;"><strong>Cantidad:</strong> ${venta.tickets.length}</p>
        </div>

        <p style="text-align: center; color: #f3b111; font-size: 14px; margin-top: 40px;">
            ¡Gracias por confiar en ${venta.rifa.admin.empresa}! Te deseamos mucha suerte.
            <br>Enviado automáticamente por ${process.env.LOCAL_URL}, software desarrollado por <a href="https://rifari.com" target="_blank" style="color: #f3b111;">rifari.com</a>
        </p>
        
    </div>
    `;
        
    } catch (error) {
        console.log(error);
        return false;
    }
    
};

module.exports = { generarHtmlTickets };