const { hasPermission } = require('../config/rbac');

/**
 * RBAC middleware — checks if user's role has the required permission
 * Usage: authorize('lead:write')
 */
const authorize = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        message: `Access denied. Required permission: ${permission}`,
        yourRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Restrict access to specific roles only
 * Usage: restrictTo('admin', 'manager')
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

module.exports = { authorize, restrictTo };
