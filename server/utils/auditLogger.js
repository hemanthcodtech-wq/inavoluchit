const { AuditLog } = require('../models');

/**
 * Helper to create an immutable audit log entry in the database.
 */
const logAuditEvent = async ({
  req,
  userId,
  userEmail,
  userRole,
  module,
  action,
  recordId = null,
  result = 'Success',
  severity = 'Info',
  details = null
}) => {
  try {
    let finalUserId = userId;
    let finalUserEmail = userEmail;
    let finalUserRole = userRole;

    if (req && req.user) {
      finalUserId = finalUserId || req.user.id;
      finalUserEmail = finalUserEmail || req.user.email;
      if (!finalUserRole) {
        if (req.user.role === 'superadmin') finalUserRole = 'Super Admin';
        else if (req.user.role === 'employee') finalUserRole = 'Employee';
        else finalUserRole = req.user.role || 'User';
      }
    }

    if (!finalUserEmail) {
      finalUserEmail = 'admin@inavolu.com';
    }
    if (!finalUserRole) {
      finalUserRole = 'Super Admin';
    }

    const detailsStr = typeof details === 'object' && details !== null 
      ? JSON.stringify(details) 
      : (details ? String(details) : null);

    const logEntry = await AuditLog.create({
      userId: finalUserId || null,
      userEmail: finalUserEmail,
      userRole: finalUserRole,
      module,
      action,
      recordId: recordId ? String(recordId) : null,
      result,
      severity,
      details: detailsStr
    });

    return logEntry;
  } catch (error) {
    console.error('Failed to record audit log entry:', error);
    return null;
  }
};

module.exports = { logAuditEvent };
