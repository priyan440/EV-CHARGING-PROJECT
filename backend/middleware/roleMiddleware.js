/**
 * Normalize role string for robust comparison
 * e.g. "CUSTOMER" -> "USER", "OWNER" -> "STATION_OWNER"
 */
export const normalizeRole = (role) => {
  if (!role) return "";
  const r = role.toUpperCase().trim();
  if (r === "CUSTOMER" || r === "USER") return "USER";
  if (r === "OWNER" || r === "STATION_OWNER") return "STATION_OWNER";
  if (r === "ADMIN") return "ADMIN";
  return r;
};

/**
 * Middleware generator for role-based authorization
 * @param  {...string} allowedRoles - e.g. 'ADMIN', 'STATION_OWNER'
 */
export const authorizeRoles = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required before role verification.",
      });
    }

    const userRole = normalizeRole(req.user.role);

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role "${req.user.role}" does not have permission to access this resource.`,
      });
    }

    next();
  };
};

export default { authorizeRoles, normalizeRole };
