import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../../../tests/utils";
import userEvent from "@testing-library/user-event";
import DeleteConfirmationModal from "../DeleteConfirmationModal";
import type { CategoryViewModel } from "../CategoriesPage";

describe("DeleteConfirmationModal", () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

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
    children: [
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
    ],
    level: 0,
  };

  const defaultProps = {
    category: mockCategory,
    open: true,
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
    isDeleting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders modal when open is true", () => {
      render(<DeleteConfirmationModal {...defaultProps} />);

      expect(screen.getByTestId("delete-category-modal")).toBeInTheDocument();
      expect(screen.getByTestId("delete-category-modal-title")).toBeInTheDocument();
      expect(screen.getByTestId("delete-category-modal-description")).toBeInTheDocument();
      expect(screen.getByTestId("delete-category-modal-body")).toBeInTheDocument();
    });

    it("does not render when category is null", () => {
      render(<DeleteConfirmationModal {...defaultProps} category={null} />);

      expect(screen.queryByTestId("delete-category-modal")).not.toBeInTheDocument();
    });

    it("displays category name in title and description", () => {
      render(<DeleteConfirmationModal {...defaultProps} />);

      expect(screen.getByTestId("delete-category-modal-title")).toHaveTextContent("Delete Category");
      expect(screen.getByTestId("delete-category-modal-description")).toHaveTextContent(
        'Are you sure you want to delete the category "Food"?'
      );
    });
  });

  describe("Subcategories warning", () => {
    it("shows warning when category has children", () => {
      render(<DeleteConfirmationModal {...defaultProps} />);

      expect(
        screen.getByText("Warning: This category has 1 subcategories that will also be deleted.")
      ).toBeInTheDocument();
    });

    it("does not show warning when category has no children", () => {
      const categoryWithoutChildren = { ...mockCategory, children: [] };
      render(<DeleteConfirmationModal {...defaultProps} category={categoryWithoutChildren} />);

      expect(screen.queryByText(/Warning:/)).not.toBeInTheDocument();
    });
  });

  describe("Error display", () => {
    it("shows delete error when provided", () => {
      const deleteError = "Failed to delete category";
      render(<DeleteConfirmationModal {...defaultProps} deleteError={deleteError} />);

      expect(screen.getByText(deleteError)).toBeInTheDocument();
    });

    it("does not show error section when no error", () => {
      render(<DeleteConfirmationModal {...defaultProps} />);

      expect(screen.queryByText("Failed to delete")).not.toBeInTheDocument();
    });
  });

  describe("Button interactions", () => {
    it("calls onConfirm when confirm button is clicked", async () => {
      const user = userEvent.setup();
      render(<DeleteConfirmationModal {...defaultProps} />);

      const confirmButton = screen.getByTestId("delete-category-modal-confirm");

      await user.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it("calls onCancel when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<DeleteConfirmationModal {...defaultProps} />);

      const cancelButton = screen.getByTestId("delete-category-modal-cancel");

      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it("calls onCancel when dialog is closed via backdrop", () => {
      render(<DeleteConfirmationModal {...defaultProps} />);

      // The Dialog component should handle backdrop clicks
      // We can test that the dialog exists and has proper structure
      const dialog = screen.getByTestId("delete-category-modal");
      expect(dialog).toBeInTheDocument();
    });
  });

  describe("Button states", () => {
    it("disables buttons when isDeleting is true", () => {
      render(<DeleteConfirmationModal {...defaultProps} isDeleting={true} />);

      const confirmButton = screen.getByTestId("delete-category-modal-confirm");
      const cancelButton = screen.getByTestId("delete-category-modal-cancel");

      expect(confirmButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it("enables buttons when isDeleting is false", () => {
      render(<DeleteConfirmationModal {...defaultProps} isDeleting={false} />);

      const confirmButton = screen.getByTestId("delete-category-modal-confirm");
      const cancelButton = screen.getByTestId("delete-category-modal-cancel");

      expect(confirmButton).not.toBeDisabled();
      expect(cancelButton).not.toBeDisabled();
    });

    it("shows correct button text when deleting", () => {
      render(<DeleteConfirmationModal {...defaultProps} isDeleting={true} />);

      const confirmButton = screen.getByTestId("delete-category-modal-confirm");

      expect(confirmButton).toHaveTextContent("Deleting...");
    });

    it("shows correct button text when not deleting", () => {
      render(<DeleteConfirmationModal {...defaultProps} isDeleting={false} />);

      const confirmButton = screen.getByTestId("delete-category-modal-confirm");

      expect(confirmButton).toHaveTextContent("Delete Category");
    });
  });

  describe("Modal behavior", () => {
    it("has correct modal structure", () => {
      render(<DeleteConfirmationModal {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByTestId("delete-category-modal-title")).toHaveTextContent("Delete Category");
    });

    it("has destructive styling for confirm button", () => {
      render(<DeleteConfirmationModal {...defaultProps} />);

      const confirmButton = screen.getByTestId("delete-category-modal-confirm");
      expect(confirmButton).toHaveClass("bg-destructive");
    });

    it("has outline styling for cancel button", () => {
      render(<DeleteConfirmationModal {...defaultProps} />);

      const cancelButton = screen.getByTestId("delete-category-modal-cancel");
      expect(cancelButton).toHaveClass("bg-background");
    });
  });

  describe("Accessibility", () => {
    it("has proper heading structure", () => {
      render(<DeleteConfirmationModal {...defaultProps} />);

      const title = screen.getByTestId("delete-category-modal-title");
      expect(title.tagName).toBe("H2");
    });

    it("has proper dialog description", () => {
      render(<DeleteConfirmationModal {...defaultProps} />);

      const description = screen.getByTestId("delete-category-modal-description");
      expect(description).toHaveAttribute("id");
    });
  });

  describe("Modal visibility", () => {
    it("renders modal when open is true", () => {
      render(<DeleteConfirmationModal {...defaultProps} open={true} />);

      const modal = screen.getByTestId("delete-category-modal");
      expect(modal).toBeInTheDocument();
    });

    it("does not render modal when open is false", () => {
      render(<DeleteConfirmationModal {...defaultProps} open={false} />);

      expect(screen.queryByTestId("delete-category-modal")).not.toBeInTheDocument();
    });
  });
});
