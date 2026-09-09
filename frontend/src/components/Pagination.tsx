import type { PaginationMeta } from '../types';

interface PaginationProps {
  meta?: PaginationMeta;
  onPageChange: (newPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ meta, onPageChange }) => {
  if (!meta || meta.totalPages <= 1) return null;

  const startItem = (meta.page - 1) * meta.limit + 1;
  const endItem = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="pagination">
      <div>
        Showing <strong>{startItem}</strong> - <strong>{endItem}</strong> of <strong>{meta.total}</strong> results
      </div>
      <div className="pagination-controls">
        <button
          className="btn btn-secondary btn-sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          ← Previous
        </button>
        <span style={{ margin: '0 8px', fontSize: '13px' }}>
          Page <strong>{meta.page}</strong> of <strong>{meta.totalPages}</strong>
        </span>
        <button
          className="btn btn-secondary btn-sm"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
};
