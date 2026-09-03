const MAX_LIMIT = 100;

const readPagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(query.limit, 10) || 25),
  );
  return { page, limit, skip: (page - 1) * limit };
};

const paginatedResponse = (res, { items, totalItems, page, limit }) =>
  res.json({
    items,
    page,
    limit,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / limit)),
  });

module.exports = { readPagination, paginatedResponse };
