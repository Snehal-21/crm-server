// RBAC permissions matrix
const PERMISSIONS = {
  admin: [
    'lead:read', 'lead:write', 'lead:delete',
    'user:read', 'user:write',
    'dashboard:read',
    'notification:read'
  ],
  manager: [
    'lead:read', 'lead:write',
    'user:read',
    'dashboard:read',
    'notification:read'
  ],
  sales: [
    'lead:read', 'lead:write',
    'notification:read'
  ]
};

/**
 * Check if a role has a specific permission
 */
const hasPermission = (role, permission) => {
  const rolePerms = PERMISSIONS[role] || [];
  return rolePerms.includes(permission);
};

module.exports = { PERMISSIONS, hasPermission };
