import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../../../tests/utils";
import userEvent from "@testing-library/user-event";
import CategoryRow from "../CategoryRow";
import type { CategoryViewModel } from "../CategoriesPage";

describe("CategoryRow", () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  const mockCategory: CategoryViewModel = {
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
  };

  const defaultProps = {
    category: mockCategory,
    indentLevel: 0,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders category name and actions", () => {
      render(<CategoryRow {...defaultProps} />);

      expect(screen.getByText("Food")).toBeInTheDocument();
      expect(screen.getByTestId(`category-edit-button-${mockCategory.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`category-delete-button-${mockCategory.id}`)).toBeInTheDocument();
    });

    it("renders tag when present", () => {
      render(<CategoryRow {...defaultProps} />);

      expect(screen.getByText("FOOD")).toBeInTheDocument();
    });

    it("does not render tag when null", () => {
      const categoryWithoutTag = { ...mockCategory, tag: null };
      render(<CategoryRow {...defaultProps} category={categoryWithoutTag} />);

      expect(screen.queryByText("FOOD")).not.toBeInTheDocument();
    });

    it("applies correct styling for root level categories", () => {
      render(<CategoryRow {...defaultProps} />);

      const nameElement = screen.getByText("Food");
      expect(nameElement).toHaveClass("font-medium");
    });

    it("applies correct styling for child categories", () => {
      render(<CategoryRow {...defaultProps} indentLevel={1} />);

      const nameElement = screen.getByText("Food");
      expect(nameElement).toHaveClass("font-normal");
    });
  });

  describe("Indentation", () => {
    it("does not show indent arrow for root level", () => {
      render(<CategoryRow {...defaultProps} />);

      expect(screen.queryByRole("img", { hidden: true })).not.toBeInTheDocument();
    });

    it("shows indent arrow for child categories", () => {
      render(<CategoryRow {...defaultProps} indentLevel={1} />);

      // The SVG arrow should be present
      const arrowSvg = document.querySelector("svg");
      expect(arrowSvg).toBeInTheDocument();
    });
  });

  describe("User interactions", () => {
    it("calls onEdit when edit button is clicked", async () => {
      const user = userEvent.setup();
      render(<CategoryRow {...defaultProps} />);

      const editButton = screen.getByTestId(`category-edit-button-${mockCategory.id}`);

      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledTimes(1);
      expect(mockOnEdit).toHaveBeenCalledWith(mockCategory);
    });

    it("calls onDelete when delete button is clicked", async () => {
      const user = userEvent.setup();
      render(<CategoryRow {...defaultProps} />);

      const deleteButton = screen.getByTestId(`category-delete-button-${mockCategory.id}`);

      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith(mockCategory);
    });
  });

  describe("Accessibility", () => {
    it("has proper aria-label for edit button", () => {
      render(<CategoryRow {...defaultProps} />);

      const editButton = screen.getByTestId(`category-edit-button-${mockCategory.id}`);
      expect(editButton).toHaveAttribute("aria-label", "Edit Food");
    });

    it("has proper aria-label for delete button", () => {
      render(<CategoryRow {...defaultProps} />);

      const deleteButton = screen.getByTestId(`category-delete-button-${mockCategory.id}`);
      expect(deleteButton).toHaveAttribute("aria-label", "Delete Food");
    });

    it("renders as table row element", () => {
      render(<CategoryRow {...defaultProps} />);

      const row = screen.getByTestId(`category-row-${mockCategory.id}`);
      expect(row.tagName).toBe("TR");
    });
  });

  describe("Button styling", () => {
    it("applies correct styling to delete button", () => {
      render(<CategoryRow {...defaultProps} />);

      const deleteButton = screen.getByTestId(`category-delete-button-${mockCategory.id}`);
      expect(deleteButton).toHaveClass("text-red-600", "hover:text-red-800", "hover:bg-red-50");
    });

    it("applies ghost variant styling to edit button", () => {
      render(<CategoryRow {...defaultProps} />);

      const editButton = screen.getByTestId(`category-edit-button-${mockCategory.id}`);
      // The button component applies complex classes, just verify it's not the destructive variant
      expect(editButton).not.toHaveClass("bg-destructive");
      expect(editButton).toHaveClass("hover:bg-accent");
    });
  });

  describe("Data attributes", () => {
    it("has correct data-testid for row", () => {
      render(<CategoryRow {...defaultProps} />);

      expect(screen.getByTestId(`category-row-${mockCategory.id}`)).toBeInTheDocument();
    });

    it("has correct data-testid for buttons", () => {
      render(<CategoryRow {...defaultProps} />);

      expect(screen.getByTestId(`category-edit-button-${mockCategory.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`category-delete-button-${mockCategory.id}`)).toBeInTheDocument();
    });
  });
});
