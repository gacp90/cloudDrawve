// middleware/validateHost.js
module.exports = function (req, res, next) {
  const allowedHosts = [
    'rifasaurinegro.com',
    'www.rifasaurinegro.com',
    'admin.rifasaurinegro.com',
    'www.admin.rifasaurinegro.com',
    'localhost'
  ];

  const hostHeader = req.headers.host.split(':')[0]; // elimina puerto si lo trae

  if (!allowedHosts.includes(hostHeader)) {
    return res.status(403).send('Dominio no autorizado');
  }

  next();
};
