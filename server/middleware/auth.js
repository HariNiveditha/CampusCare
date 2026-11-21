const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwt');

/**
 * Verify JWT token middleware
 * Extracts Bearer token from Authorization header or fallbacks and verifies it.
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader =
      req.headers.authorization ||
      req.headers.Authorization ||
      req.headers['x-access-token'];

    if (!authHeader) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    let token = '';
    if (authHeader.startsWith('Bearer ') || authHeader.startsWith('bearer ')) {
      token = authHeader.substring(7).trim();
    } else {
      token = authHeader.trim();
    }

    if (!token || token === '' || token === 'null' || token === 'undefined') {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    let secret;
    try {
      secret = getJwtSecret();
    } catch (configError) {
      console.error(configError.message);
      return res.status(500).json({ message: 'Internal server configuration error.' });
    }

    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ message: 'Token expired. Please log in again.' });
        }
        return res.status(401).json({ message: 'Invalid token.' });
      }

      // Attach authenticated user information
      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role || 'student',
      };
      // Maintain backwards compatibility with legacy routes
      req.userId = decoded.id;

      next();
    });
  } catch (error) {
    return res.status(500).json({ message: 'Authentication error', error: error.message });
  }
};

/**
 * Role-Based Access Control (RBAC) middleware factory
 * @param  {...string} allowedRoles
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. Not authenticated.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
};

// Convenience role helpers
const requireAdmin = authorizeRoles('admin');
const requireStudent = authorizeRoles('student', 'admin');

module.exports = {
  verifyToken,
  authorizeRoles,
  requireAdmin,
  requireStudent,
};
