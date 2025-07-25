module.exports = function (req, res, next) {
  const allowedOrigins = [
    'https://rifacaracasyei.com',
    'https://www.rifacaracasyei.com',
    'https://admin.rifacaracasyei.com',
    'https://www.admin.rifacaracasyei.com',
    // 'https://ganaconbeltran.com',
    // 'https://www.ganaconbeltran.com',
    // 'https://admin.ganaconbeltran.com',
    // 'https://www.admin.ganaconbeltran.com',
    'http://localhost:4200', // durante desarrollo
    'http://localhost:3000'
  ];

  const origin = req.get('Origin') || '';
  const referer = req.get('Referer') || '';

  const isAllowed =
    allowedOrigins.some(domain => origin.startsWith(domain)) ||
    allowedOrigins.some(domain => referer.startsWith(domain));

  if (!isAllowed && (origin || referer)) {
    return res.status(403).send('Acceso denegado por origen no autorizado');
  }

  next();
};
