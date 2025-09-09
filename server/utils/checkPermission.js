const dbUtils = require('./dbUtils');
const { verifyToken } = require('./tokenUtils');

/**
 * Checks if user has one of the allowed permissions.
 * @param {string|number} id - User ID to check.
 * @param {string[]} allowedPermissions - Array of allowed permission strings.
 * @returns {Promise<{allowed: boolean, permission?: string, error?: string}>}
 */
async function checkPermission(id, allowedPermissions) {
    // console.log('checkPermission received:', { id, allowedPermissions });
    if (!id || !Array.isArray(allowedPermissions)) {
        return { allowed: false, error: 'Missing id or allowedPermissions' };
    }
    const users = await dbUtils.return_sql('SELECT permission FROM users WHERE id=?', [id]);
  if (!users.length) {
    return { allowed: false, error: 'User not found' };
  }
  const permission = users[0].permission;
//   console.log(`checkPermission: user id ${id} has permission ${permission}, allowed: ${allowedPermissions.join(', ')}`);
  if (allowedPermissions.includes(permission)) {
    return { allowed: true, permission };
  } else {
    return { allowed: false, error: `Insufficient permission, permission: ${permission}, required: ${allowedPermissions.join(', ')}` };
  }
}

module.exports = { checkPermission };
