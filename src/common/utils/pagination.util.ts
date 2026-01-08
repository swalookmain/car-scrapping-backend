export const getPagination = (page = 1, limit = 10) => {
  const safePage = Math.max(Number(page), 1);
  const safeLimit = Math.min(Number(limit), 100);

  const skip = (safePage - 1) * safeLimit;

  return {
    page: safePage,
    limit: safeLimit,
    skip,
  };
};
