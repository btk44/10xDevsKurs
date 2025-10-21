import { Button } from "../ui/button";
import type { PaginationDTO } from "../../types";

interface PaginationProps {
  pagination: PaginationDTO;
  onPageChange: (page: number) => void;
}

/**
 * Pagination component
 * Displays pagination controls for navigating through pages of data
 */
export default function Pagination({ pagination, onPageChange }: PaginationProps) {
  const { page, total_pages } = pagination;

  // Don't render pagination if there's only one page
  if (total_pages <= 1) {
    return null;
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];

    // Always show first page
    pages.push(1);

    // Calculate range around current page
    const startPage = Math.max(2, page - 1);
    const endPage = Math.min(total_pages - 1, page + 1);

    // Add ellipsis after first page if needed
    if (startPage > 2) {
      pages.push("ellipsis-start");
    }

    // Add pages around current page
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis before last page if needed
    if (endPage < total_pages - 1) {
      pages.push("ellipsis-end");
    }

    // Always show last page if there are multiple pages
    if (total_pages > 1) {
      pages.push(total_pages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-between" data-testid="pagination">
      <div className="text-sm text-gray-500" data-testid="pagination-info">
        Page {page} of {total_pages}
      </div>

      <div className="flex space-x-1">
        {/* Previous button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          data-testid="pagination-previous"
        >
          Previous
        </Button>

        {/* Page numbers */}
        <div className="hidden sm:flex space-x-1">
          {pageNumbers.map((pageNumber, index) => {
            if (pageNumber === "ellipsis-start" || pageNumber === "ellipsis-end") {
              return (
                <div
                  key={`${pageNumber}-${index}`}
                  className="flex items-center px-2"
                  data-testid={`pagination-ellipsis-${pageNumber}`}
                >
                  ...
                </div>
              );
            }

            return (
              <Button
                key={pageNumber}
                variant={pageNumber === page ? "default" : "outline"}
                size="sm"
                onClick={() => pageNumber !== page && onPageChange(pageNumber as number)}
                className="min-w-[2rem]"
                data-testid={`pagination-page-${pageNumber}`}
              >
                {pageNumber}
              </Button>
            );
          })}
        </div>

        {/* Next button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === total_pages}
          data-testid="pagination-next"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
