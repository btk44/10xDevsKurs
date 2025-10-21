import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../../../tests/utils";
import CategoryList from "../CategoryList";
import type { CategoryViewModel } from "../CategoriesPage";

describe("CategoryList", () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  const mockCategories: CategoryViewModel[] = [
    {
      id: 1,
      user_id: "user-123",
      name: "Food",
      category_type: "expense",
      parent_id: 0,
      tag: "FOOD",
      active: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      children: [],
      level: 0,
    },
    {
      id: 2,
      user_id: "user-123",
      name: "Groceries",
      category_type: "expense",
      parent_id: 1,
      tag: null,
      active: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      children: [],
      level: 1,
    },
  ];

  const defaultProps = {
    categories: mockCategories,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    loading: false,
  };

  describe("Loading state", () => {
    it("renders loading message when loading is true", () => {
      render(<CategoryList {...defaultProps} loading={true} />);

      expect(screen.getByTestId("categories-loading")).toBeInTheDocument();
      expect(screen.getByText("Loading categories...")).toBeInTheDocument();
    });

    it("does not render table when loading", () => {
      render(<CategoryList {...defaultProps} loading={true} />);

      expect(screen.queryByTestId("categories-table")).not.toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("renders empty message when no categories", () => {
      render(<CategoryList {...defaultProps} categories={[]} />);

      expect(screen.getByTestId("categories-empty")).toBeInTheDocument();
      expect(
        screen.getByText("No categories found. Create your first category using the form below.")
      ).toBeInTheDocument();
    });

    it("does not render table when empty", () => {
      render(<CategoryList {...defaultProps} categories={[]} />);

      expect(screen.queryByTestId("categories-table")).not.toBeInTheDocument();
    });
  });

  describe("Data rendering", () => {
    it("renders table with categories when data is available", () => {
      render(<CategoryList {...defaultProps} />);

      expect(screen.getByTestId("categories-list")).toBeInTheDocument();
      expect(screen.getByTestId("categories-table")).toBeInTheDocument();
      expect(screen.getByText("Food")).toBeInTheDocument();
      expect(screen.getByText("Groceries")).toBeInTheDocument();
    });

    it("renders table headers", () => {
      render(<CategoryList {...defaultProps} />);

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Tag")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("passes correct props to CategoryRow components", () => {
      render(<CategoryList {...defaultProps} />);

      // Check that CategoryRow components receive correct props
      expect(screen.getByTestId("category-row-1")).toBeInTheDocument();
      expect(screen.getByTestId("category-row-2")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper table role", () => {
      render(<CategoryList {...defaultProps} />);

      const table = screen.getByTestId("categories-table");
      expect(table).toHaveAttribute("role", "table");
    });

    it("renders semantic table structure", () => {
      render(<CategoryList {...defaultProps} />);

      expect(screen.getByRole("table")).toBeInTheDocument();
      const rowgroups = screen.getAllByRole("rowgroup");
      expect(rowgroups).toHaveLength(2); // thead and tbody
    });
  });

  describe("Integration with CategoryRow", () => {
    it("passes onEdit and onDelete handlers to CategoryRow", () => {
      render(<CategoryList {...defaultProps} />);

      // These would be tested more thoroughly in CategoryRow tests
      // but we can verify the structure is correct
      expect(screen.getByTestId("category-edit-button-1")).toBeInTheDocument();
      expect(screen.getByTestId("category-delete-button-1")).toBeInTheDocument();
    });
  });

  describe("Data-testid attributes", () => {
    it("has correct data-testid for loading state", () => {
      render(<CategoryList {...defaultProps} loading={true} />);

      expect(screen.getByTestId("categories-loading")).toBeInTheDocument();
    });

    it("has correct data-testid for empty state", () => {
      render(<CategoryList {...defaultProps} categories={[]} />);

      expect(screen.getByTestId("categories-empty")).toBeInTheDocument();
    });

    it("has correct data-testid for list container", () => {
      render(<CategoryList {...defaultProps} />);

      expect(screen.getByTestId("categories-list")).toBeInTheDocument();
    });

    it("has correct data-testid for table", () => {
      render(<CategoryList {...defaultProps} />);

      expect(screen.getByTestId("categories-table")).toBeInTheDocument();
    });
  });

  describe("Conditional rendering", () => {
    it("renders loading over empty when both conditions are true", () => {
      render(<CategoryList {...defaultProps} loading={true} categories={[]} />);

      expect(screen.getByTestId("categories-loading")).toBeInTheDocument();
      expect(screen.queryByTestId("categories-empty")).not.toBeInTheDocument();
      expect(screen.queryByTestId("categories-list")).not.toBeInTheDocument();
    });

    it("renders data over empty when loading is false", () => {
      render(<CategoryList {...defaultProps} loading={false} categories={mockCategories} />);

      expect(screen.queryByTestId("categories-loading")).not.toBeInTheDocument();
      expect(screen.queryByTestId("categories-empty")).not.toBeInTheDocument();
      expect(screen.getByTestId("categories-list")).toBeInTheDocument();
    });
  });
});
