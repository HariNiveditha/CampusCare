const AuditLog = require('../models/AuditLog');

/**
 * Log an audit event securely without logging sensitive data (passwords, JWTs, etc.)
 */
const logAudit = async ({ user, role, action, entityType, entityId, details = {} }) => {
  try {
    // Sanitize details to avoid logging passwords, secrets, or tokens
    const sanitizedDetails = { ...details };
    delete sanitizedDetails.password;
    delete sanitizedDetails.token;
    delete sanitizedDetails.secret;
    delete sanitizedDetails.confirmPassword;

    let userId = null;
    let username = 'anonymous';
    let userRole = role || 'system';

    if (user) {
      if (typeof user === 'object') {
        userId = user._id || user.id || null;
        username = user.username || username;
        userRole = role || user.role || userRole;
      } else if (typeof user === 'string') {
        username = user;
      }
    }

    const logEntry = new AuditLog({
      user: userId,
      username,
      role: userRole,
      action,
      entityType,
      entityId: entityId ? entityId.toString() : null,
      details: sanitizedDetails,
      timestamp: new Date(),
    });

    await logEntry.save();
    return logEntry;
  } catch (error) {
    // Audit logging should not crash the primary operational request, but should be logged to error stream
    console.error('AuditLog error:', error.message);
    return null;
  }
};

module.exports = {
  logAudit,
};
