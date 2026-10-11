/**
 * Reusable backend pagination helper utility.
 * Guarantees standard pagination parameters, integer coercion, bounds checking,
 * and standard response envelope across EV user, station owner, admin, and technician routes.
 */

export const parsePagination = (req, defaultLimit = 10, maxLimit = 100) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  let limit = parseInt(req.query.limit || req.query.pageSize, 10) || defaultLimit;
  if (limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const offset = (page - 1) * limit;
  const search = req.query.search ? String(req.query.search).trim() : (req.query.q ? String(req.query.q).trim() : "");
  const status = req.query.status ? String(req.query.status).trim() : "";
  const sortBy = req.query.sortBy ? String(req.query.sortBy).trim() : "";
  const sortOrder = (req.query.sortOrder || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

  return { page, limit, offset, search, status, sortBy, sortOrder };
};

export const buildPaginationMeta = (totalItems, page, limit) => {
  const safeTotal = Math.max(0, parseInt(totalItems, 10) || 0);
  const totalPages = Math.ceil(safeTotal / limit) || 1;
  const safePage = Math.min(page, totalPages);

  return {
    page: safePage,
    limit,
    totalItems: safeTotal,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1,
  };
};

export const paginateArray = (items = [], page = 1, limit = 10) => {
  const safeItems = Array.isArray(items) ? items : [];
  const totalItems = safeItems.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const safePage = Math.max(1, Math.min(page, totalPages));
  const offset = (safePage - 1) * limit;
  const paginatedData = safeItems.slice(offset, offset + limit);

  return {
    data: paginatedData,
    pagination: {
      page: safePage,
      limit,
      totalItems,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
  };
};

export default { parsePagination, buildPaginationMeta, paginateArray };
