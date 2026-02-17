// Middleware de autenticación y autorización
module.exports = {
  ensureAuthenticated: (req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated()) return next();
    return res.status(401).json({ error: 'No autenticado' });
  },

  requireAdmin: (req, res, next) => {
    const role = req.user?.role || 'viewer';
    if (role === 'admin') return next();
    return res.status(403).json({ error: 'No autorizado (se requiere rol admin)' });
  }
};