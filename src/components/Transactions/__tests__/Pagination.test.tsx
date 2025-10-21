import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "../../../../tests/utils";
import Pagination from "../Pagination";
import type { PaginationDTO } from "../../../types";

describe("Pagination", () => {
  const mockOnPageChange = vi.fn();

  const createPaginationDTO = (page: number, total_pages: number): PaginationDTO => ({
    page,
    limit: 10,
    total_items: total_pages * 10,
    total_pages,
  });

  beforeEach(() => {
    mockOnPageChange.mockClear();
  });

  describe("Rendering Behavior", () => {
    it("does not render when total_pages is 1", () => {
      const pagination = createPaginationDTO(1, 1);
      const { container } = render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      expect(container.firstChild).toBeNull();
    });

    it("does not render when total_pages is 0", () => {
      const pagination = createPaginationDTO(1, 0);
      const { container } = render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      expect(container.firstChild).toBeNull();
    });

    it("renders pagination when total_pages > 1", () => {
      const pagination = createPaginationDTO(1, 2);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      expect(screen.getByTestId("pagination")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-info")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-previous")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-next")).toBeInTheDocument();
    });
  });

  describe("Pagination Info Display", () => {
    it("displays correct page information", () => {
      const pagination = createPaginationDTO(3, 10);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      expect(screen.getByTestId("pagination-info")).toHaveTextContent("Page 3 of 10");
    });

    it("displays correct info for first page", () => {
      const pagination = createPaginationDTO(1, 5);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      expect(screen.getByTestId("pagination-info")).toHaveTextContent("Page 1 of 5");
    });

    it("displays correct info for last page", () => {
      const pagination = createPaginationDTO(10, 10);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      expect(screen.getByTestId("pagination-info")).toHaveTextContent("Page 10 of 10");
    });
  });

  describe("Previous Button", () => {
    it("is disabled on first page", () => {
      const pagination = createPaginationDTO(1, 5);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      const previousButton = screen.getByTestId("pagination-previous");
      expect(previousButton).toBeDisabled();
    });

    it("is enabled when not on first page", () => {
      const pagination = createPaginationDTO(2, 5);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      const previousButton = screen.getByTestId("pagination-previous");
      expect(previousButton).not.toBeDisabled();
    });

    it("calls onPageChange with page - 1 when clicked", () => {
      const pagination = createPaginationDTO(3, 5);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      const previousButton = screen.getByTestId("pagination-previous");
      fireEvent.click(previousButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
      expect(mockOnPageChange).toHaveBeenCalledTimes(1);
    });
  });

  describe("Next Button", () => {
    it("is disabled on last page", () => {
      const pagination = createPaginationDTO(5, 5);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      const nextButton = screen.getByTestId("pagination-next");
      expect(nextButton).toBeDisabled();
    });

    it("is enabled when not on last page", () => {
      const pagination = createPaginationDTO(3, 5);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      const nextButton = screen.getByTestId("pagination-next");
      expect(nextButton).not.toBeDisabled();
    });

    it("calls onPageChange with page + 1 when clicked", () => {
      const pagination = createPaginationDTO(2, 5);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      const nextButton = screen.getByTestId("pagination-next");
      fireEvent.click(nextButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(3);
      expect(mockOnPageChange).toHaveBeenCalledTimes(1);
    });
  });

  describe("Page Numbers Display", () => {
    it("shows page numbers container with responsive classes", () => {
      const pagination = createPaginationDTO(1, 3);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      const pageNumbersContainer = screen.getByTestId("pagination-previous").nextElementSibling;
      expect(pageNumbersContainer).toHaveClass("hidden", "sm:flex", "space-x-1");
    });

    it("highlights current page with default variant", () => {
      const pagination = createPaginationDTO(2, 3);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      const currentPageButton = screen.getByTestId("pagination-page-2");
      expect(currentPageButton).toHaveClass("bg-primary", "text-primary-foreground"); // default variant
    });

    it("shows other pages with outline variant", () => {
      const pagination = createPaginationDTO(2, 3);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      const page1Button = screen.getByTestId("pagination-page-1");
      const page3Button = screen.getByTestId("pagination-page-3");

      // Check that outline variant has border and background classes
      expect(page1Button).toHaveClass("border");
      expect(page1Button).toHaveClass("bg-background");
      expect(page3Button).toHaveClass("border");
      expect(page3Button).toHaveClass("bg-background");

      // Check that current page (page 2) does NOT have outline variant classes
      const page2Button = screen.getByTestId("pagination-page-2");
      expect(page2Button).toHaveClass("bg-primary");
      expect(page2Button).toHaveClass("text-primary-foreground");
    });
  });

  describe("Page Number Interactions", () => {
    it("calls onPageChange with correct page number when page button is clicked", () => {
      const pagination = createPaginationDTO(1, 5);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      const page2Button = screen.getByTestId("pagination-page-2");
      fireEvent.click(page2Button);

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
      expect(mockOnPageChange).toHaveBeenCalledTimes(1);
    });

    it("does not call onPageChange when clicking current page", () => {
      const pagination = createPaginationDTO(2, 5);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      const currentPageButton = screen.getByTestId("pagination-page-2");
      fireEvent.click(currentPageButton);

      expect(mockOnPageChange).not.toHaveBeenCalled();
    });
  });

  describe("Page Number Generation Logic", () => {
    it("shows all pages for small page counts (2 pages)", () => {
      const pagination = createPaginationDTO(1, 2);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      expect(screen.getByTestId("pagination-page-1")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-2")).toBeInTheDocument();
    });

    it("shows all pages for 3 pages", () => {
      const pagination = createPaginationDTO(2, 3);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      expect(screen.getByTestId("pagination-page-1")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-2")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-3")).toBeInTheDocument();
    });

    it("shows ellipsis for larger page counts - middle pages", () => {
      const pagination = createPaginationDTO(5, 10);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      expect(screen.getByTestId("pagination-page-1")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-ellipsis-ellipsis-start")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-4")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-5")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-6")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-ellipsis-ellipsis-end")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-10")).toBeInTheDocument();
    });

    it("shows ellipsis at start when on later pages", () => {
      const pagination = createPaginationDTO(8, 10);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      expect(screen.getByTestId("pagination-page-1")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-ellipsis-ellipsis-start")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-7")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-8")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-9")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-10")).toBeInTheDocument();
    });

    it("shows no ellipsis when pages fit in range", () => {
      const pagination = createPaginationDTO(3, 5);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      expect(screen.getByTestId("pagination-page-1")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-2")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-3")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-4")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-5")).toBeInTheDocument();

      expect(screen.queryByTestId("pagination-ellipsis-ellipsis-start")).not.toBeInTheDocument();
      expect(screen.queryByTestId("pagination-ellipsis-ellipsis-end")).not.toBeInTheDocument();
    });
  });

  describe("Ellipsis Display", () => {
    it("displays ellipsis as '...' text", () => {
      const pagination = createPaginationDTO(5, 10);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      const ellipsisStart = screen.getByTestId("pagination-ellipsis-ellipsis-start");
      const ellipsisEnd = screen.getByTestId("pagination-ellipsis-ellipsis-end");

      expect(ellipsisStart).toHaveTextContent("...");
      expect(ellipsisEnd).toHaveTextContent("...");
    });

    it("positions ellipsis correctly in flex container", () => {
      const pagination = createPaginationDTO(5, 10);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      const ellipsisStart = screen.getByTestId("pagination-ellipsis-ellipsis-start");
      const ellipsisEnd = screen.getByTestId("pagination-ellipsis-ellipsis-end");

      expect(ellipsisStart).toHaveClass("flex", "items-center", "px-2");
      expect(ellipsisEnd).toHaveClass("flex", "items-center", "px-2");
    });
  });

  describe("Edge Cases", () => {
    it("handles page 1 of many pages correctly", () => {
      const pagination = createPaginationDTO(1, 8);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      expect(screen.getByTestId("pagination-page-1")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-2")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-ellipsis-ellipsis-end")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-8")).toBeInTheDocument();

      // Page 3 should not be shown
      expect(screen.queryByTestId("pagination-page-3")).not.toBeInTheDocument();
    });

    it("handles last page of many pages correctly", () => {
      const pagination = createPaginationDTO(10, 10);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      expect(screen.getByTestId("pagination-page-1")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-ellipsis-ellipsis-start")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-9")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-10")).toBeInTheDocument();

      // Page 8 should not be shown
      expect(screen.queryByTestId("pagination-page-8")).not.toBeInTheDocument();
    });

    it("handles exactly 4 pages (boundary case)", () => {
      const pagination = createPaginationDTO(2, 4);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      expect(screen.getByTestId("pagination-page-1")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-2")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-3")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-4")).toBeInTheDocument();

      expect(screen.queryByTestId("pagination-ellipsis-ellipsis-start")).not.toBeInTheDocument();
      expect(screen.queryByTestId("pagination-ellipsis-ellipsis-end")).not.toBeInTheDocument();
    });

    it("handles exactly 6 pages (boundary case)", () => {
      const pagination = createPaginationDTO(3, 6);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      expect(screen.getByTestId("pagination-page-1")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-2")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-3")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-4")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-ellipsis-ellipsis-end")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-6")).toBeInTheDocument();

      // Page 5 should not be shown
      expect(screen.queryByTestId("pagination-page-5")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper test IDs for all interactive elements", () => {
      const pagination = createPaginationDTO(2, 5);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      expect(screen.getByTestId("pagination")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-info")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-previous")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-next")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-1")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-2")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-3")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-ellipsis-ellipsis-end")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-page-5")).toBeInTheDocument();
    });

    it("uses semantic button elements", () => {
      const pagination = createPaginationDTO(2, 3);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      const previousButton = screen.getByTestId("pagination-previous");
      const nextButton = screen.getByTestId("pagination-next");
      const pageButton = screen.getByTestId("pagination-page-1");

      expect(previousButton.tagName).toBe("BUTTON");
      expect(nextButton.tagName).toBe("BUTTON");
      expect(pageButton.tagName).toBe("BUTTON");
    });

    it("has minimum width for page number buttons", () => {
      const pagination = createPaginationDTO(2, 3);
      render(<Pagination pagination={pagination} onPageChange={mockOnPageChange} />);

      const pageButton = screen.getByTestId("pagination-page-1");
      expect(pageButton).toHaveClass("min-w-[2rem]");
    });
  });
});
