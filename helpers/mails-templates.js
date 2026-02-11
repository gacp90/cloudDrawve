const generarHtmlTickets = (venta) => {
    const listaTickets = venta.tickets.map(t => 
        `<span style="background-color: #f3b111; color: #000; padding: 5px 10px; border-radius: 5px; font-weight: bold; margin: 5px; display: inline-block;">
            ${String(t.numero).padStart(3, '0')}
        </span>`
    ).join('');

    return `
    <div style="background-color: #121212; color: #ffffff; padding: 20px; font-family: sans-serif; border-radius: 10px;">
        <h1 style="color: #f3b111;">¡Pago Confirmado!</h1>
        <p>Hola <strong>${venta.nombre}</strong>,</p>
        <p>Tu pago por la rifa ha sido procesado exitosamente. Aquí tienes tus números:</p>
        <div style="background-color: #1e1e1e; padding: 20px; border-radius: 10px; text-align: center;">
            ${listaTickets}
        </div>
        <p style="margin-top: 20px;">ID de Venta: <small>${venta._id}</small></p>
        <p>¡Mucho éxito en el sorteo!</p>
        <hr style="border: 0.5px solid #333;">
        <footer style="font-size: 12px; color: #777;">Enviado automáticamente por somosprime.co, software desarrollado por <a href="https://rifari.com" target="_blank" style="color: #f3b111;">rifari.com</a></footer>
    </div>
    `;
};

module.exports = { generarHtmlTickets };