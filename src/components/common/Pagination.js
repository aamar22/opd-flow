export default function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const startItem = totalItems ? (safePage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(safePage * pageSize, totalItems);

  if (totalItems <= pageSize) return null;

  return (
    <nav className="pagination" aria-label="Table pagination">
      <span>
        Showing {startItem}–{endItem} of {totalItems}
      </span>
      <div>
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage === 1}
        >
          Previous
        </button>
        <span>
          Page {safePage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage === totalPages}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
