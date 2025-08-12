module.exports = function (req, res, next) {
  const allowedOrigins = [
    'https://rifasaurinegro.com',
    'https://www.rifasaurinegro.com',
    'https://admin.rifasaurinegro.com',
    'https://www.admin.rifasaurinegro.com',
    'https://ganaconbeltran.com',
    'https://www.ganaconbeltran.com',
    'https://admin.ganaconbeltran.com',
    'https://www.admin.ganaconbeltran.com',
    'http://localhost:4200',
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
