import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../../../tests/utils";
import CategoryForm from "../CategoryForm";
import type { CategoryFormData, CategoryOption } from "../CategoriesPage";
import type { CategoryType } from "../../../types";

// Mock props
const mockOnSubmit = vi.fn();
const mockOnCancel = vi.fn();

const mockParentOptions: CategoryOption[] = [
  { value: 1, label: "Food" },
  { value: 2, label: "Transportation" },
  { value: 3, label: "Entertainment" },
];

const mockInitialData: CategoryFormData = {
  id: 1,
  name: "Test Category",
  tag: "TEST",
  parent_id: 1,
  category_type: "expense",
};

const defaultProps = {
  parentOptions: mockParentOptions,
  onSubmit: mockOnSubmit,
  onCancel: mockOnCancel,
  isSubmitting: false,
  errors: {},
  categoryType: "expense" as CategoryType,
};

describe("CategoryForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial Rendering", () => {
    it("renders create form correctly when no initialData provided", () => {
      render(<CategoryForm {...defaultProps} />);

      expect(screen.getByTestId("category-form-container")).toBeInTheDocument();
      expect(screen.getByTestId("category-form")).toBeInTheDocument();
      expect(screen.getByText("Create New Category")).toBeInTheDocument();

      // Check form fields
      expect(screen.getByTestId("category-name-input")).toBeInTheDocument();
      expect(screen.getByTestId("category-tag-input")).toBeInTheDocument();
      expect(screen.getByTestId("category-parent-select")).toBeInTheDocument();

      // Check buttons
      expect(screen.getByTestId("category-cancel-button")).toBeInTheDocument();
      expect(screen.getByTestId("category-submit-button")).toHaveTextContent("Create Category");
    });

    it("renders edit form correctly when initialData is provided", () => {
      render(<CategoryForm {...defaultProps} initialData={mockInitialData} />);

      expect(screen.getByText("Edit Category")).toBeInTheDocument();
      expect(screen.getByTestId("category-submit-button")).toHaveTextContent("Update Category");

      // Check that form is pre-filled with initial data
      expect(screen.getByTestId("category-name-input")).toHaveValue("Test Category");
      expect(screen.getByTestId("category-tag-input")).toHaveValue("TEST");
      expect(screen.getByTestId("category-parent-select")).toHaveValue("1");
    });

    it("renders all required form fields with correct labels", () => {
      render(<CategoryForm {...defaultProps} />);

      expect(screen.getByLabelText("Category Name *")).toBeInTheDocument();
      expect(screen.getByLabelText("Tag (Optional)")).toBeInTheDocument();
      expect(screen.getByLabelText("Parent Category")).toBeInTheDocument();
    });

    it("renders parent options correctly", () => {
      render(<CategoryForm {...defaultProps} />);

      const select = screen.getByTestId("category-parent-select");
      expect(select).toHaveValue("0"); // Default to "None (Main Category)"

      // Check all options are present
      expect(screen.getByText("None (Main Category)")).toBeInTheDocument();
      expect(screen.getByText("Food")).toBeInTheDocument();
      expect(screen.getByText("Transportation")).toBeInTheDocument();
      expect(screen.getByText("Entertainment")).toBeInTheDocument();
    });

    it("shows max length hint for tag field", () => {
      render(<CategoryForm {...defaultProps} />);

      expect(screen.getByText("Max 10 characters")).toBeInTheDocument();
    });

    it("sets maxLength attribute on tag input", () => {
      render(<CategoryForm {...defaultProps} />);

      const tagInput = screen.getByTestId("category-tag-input");
      expect(tagInput).toHaveAttribute("maxLength", "10");
    });
  });

  describe("Form State Management", () => {
    it("initializes with empty form data in create mode", () => {
      render(<CategoryForm {...defaultProps} />);

      expect(screen.getByTestId("category-name-input")).toHaveValue("");
      expect(screen.getByTestId("category-tag-input")).toHaveValue("");
      expect(screen.getByTestId("category-parent-select")).toHaveValue("0");
    });

    it("updates form data when initialData changes", () => {
      const { rerender } = render(<CategoryForm {...defaultProps} />);

      // Initially empty
      expect(screen.getByTestId("category-name-input")).toHaveValue("");

      // Rerender with initialData
      rerender(<CategoryForm {...defaultProps} initialData={mockInitialData} />);

      expect(screen.getByTestId("category-name-input")).toHaveValue("Test Category");
      expect(screen.getByTestId("category-tag-input")).toHaveValue("TEST");
      expect(screen.getByTestId("category-parent-select")).toHaveValue("1");
    });

    it("resets form when initialData changes to undefined", () => {
      const { rerender } = render(<CategoryForm {...defaultProps} initialData={mockInitialData} />);

      // Initially has data
      expect(screen.getByTestId("category-name-input")).toHaveValue("Test Category");

      // Rerender without initialData
      rerender(<CategoryForm {...defaultProps} />);

      expect(screen.getByTestId("category-name-input")).toHaveValue("");
      expect(screen.getByTestId("category-tag-input")).toHaveValue("");
      expect(screen.getByTestId("category-parent-select")).toHaveValue("0");
    });

    it("updates category_type when categoryType prop changes", () => {
      const { rerender } = render(<CategoryForm {...defaultProps} categoryType="expense" />);

      // Hidden input should have expense value
      expect(screen.getByDisplayValue("expense")).toBeInTheDocument();

      // Change to income
      rerender(<CategoryForm {...defaultProps} categoryType="income" />);

      expect(screen.getByDisplayValue("income")).toBeInTheDocument();
    });
  });

  describe("Input Handling", () => {
    it("updates name field when user types", () => {
      render(<CategoryForm {...defaultProps} />);

      const nameInput = screen.getByTestId("category-name-input");
      fireEvent.change(nameInput, { target: { value: "New Category" } });

      expect(nameInput).toHaveValue("New Category");
    });

    it("updates tag field when user types", () => {
      render(<CategoryForm {...defaultProps} />);

      const tagInput = screen.getByTestId("category-tag-input");
      fireEvent.change(tagInput, { target: { value: "NEW TAG" } });

      expect(tagInput).toHaveValue("NEW TAG");
    });

    it("updates parent select when user changes selection", () => {
      render(<CategoryForm {...defaultProps} />);

      const select = screen.getByTestId("category-parent-select");
      fireEvent.change(select, { target: { value: "2" } });

      expect(select).toHaveValue("2");
    });

    it("clears field error when user starts typing in that field", () => {
      render(<CategoryForm {...defaultProps} errors={{ name: "Name is required" }} />);

      expect(screen.getByText("Name is required")).toBeInTheDocument();

      const nameInput = screen.getByTestId("category-name-input");
      fireEvent.change(nameInput, { target: { value: "a" } });

      expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
    });

    it("handles empty tag value correctly", () => {
      render(<CategoryForm {...defaultProps} initialData={{ ...mockInitialData, tag: undefined }} />);

      const tagInput = screen.getByTestId("category-tag-input");
      expect(tagInput).toHaveValue("");
    });
  });

  describe("Form Validation", () => {
    it("shows error when name is empty", async () => {
      render(<CategoryForm {...defaultProps} />);

      const form = screen.getByTestId("category-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("Name is required")).toBeInTheDocument();
      });
    });

    it("shows error when name exceeds 100 characters", async () => {
      render(<CategoryForm {...defaultProps} />);

      const nameInput = screen.getByTestId("category-name-input");
      const longName = "a".repeat(101);
      fireEvent.change(nameInput, { target: { value: longName } });

      const form = screen.getByTestId("category-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("Name must be 100 characters or less")).toBeInTheDocument();
      });
    });

    it("shows error when tag exceeds 10 characters", async () => {
      render(<CategoryForm {...defaultProps} />);

      const nameInput = screen.getByTestId("category-name-input");
      fireEvent.change(nameInput, { target: { value: "Valid Name" } });

      const tagInput = screen.getByTestId("category-tag-input");
      fireEvent.change(tagInput, { target: { value: "TOOLONGTAGTOOLONG" } }); // 18 characters

      const form = screen.getByTestId("category-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("Tag must be 10 characters or less")).toBeInTheDocument();
      });
    });

    it("shows error when category tries to be its own parent", async () => {
      render(<CategoryForm {...defaultProps} initialData={mockInitialData} />);

      const select = screen.getByTestId("category-parent-select");
      fireEvent.change(select, { target: { value: "1" } }); // Same as category id

      const form = screen.getByTestId("category-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("Category cannot be its own parent")).toBeInTheDocument();
      });
    });

    it("passes validation with valid data", async () => {
      render(<CategoryForm {...defaultProps} />);

      const nameInput = screen.getByTestId("category-name-input");
      fireEvent.change(nameInput, { target: { value: "Valid Category" } });

      const tagInput = screen.getByTestId("category-tag-input");
      fireEvent.change(tagInput, { target: { value: "VALID" } });

      const form = screen.getByTestId("category-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "Valid Category",
          tag: "VALID",
          parent_id: 0,
          category_type: "expense",
        });
      });
    });
  });

  describe("Form Submission", () => {
    it("calls onSubmit with correct data in create mode", async () => {
      render(<CategoryForm {...defaultProps} />);

      const nameInput = screen.getByTestId("category-name-input");
      fireEvent.change(nameInput, { target: { value: "New Category" } });

      const tagInput = screen.getByTestId("category-tag-input");
      fireEvent.change(tagInput, { target: { value: "NEW" } });

      const select = screen.getByTestId("category-parent-select");
      fireEvent.change(select, { target: { value: "2" } });

      const form = screen.getByTestId("category-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "New Category",
          tag: "NEW",
          parent_id: 2,
          category_type: "expense",
        });
      });
    });

    it("calls onSubmit with correct data in edit mode", async () => {
      render(<CategoryForm {...defaultProps} initialData={mockInitialData} />);

      const nameInput = screen.getByTestId("category-name-input");
      fireEvent.change(nameInput, { target: { value: "Updated Category" } });

      // Change parent to a different valid option
      const select = screen.getByTestId("category-parent-select");
      fireEvent.change(select, { target: { value: "2" } });

      const form = screen.getByTestId("category-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          id: 1,
          name: "Updated Category",
          tag: "TEST",
          parent_id: 2,
          category_type: "expense",
        });
      });
    });

    it("submits undefined tag when tag is empty", async () => {
      render(<CategoryForm {...defaultProps} />);

      const nameInput = screen.getByTestId("category-name-input");
      fireEvent.change(nameInput, { target: { value: "Category without tag" } });

      const tagInput = screen.getByTestId("category-tag-input");
      fireEvent.change(tagInput, { target: { value: "" } });

      const form = screen.getByTestId("category-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "Category without tag",
          tag: undefined,
          parent_id: 0,
          category_type: "expense",
        });
      });
    });

    it("does not submit when validation fails", () => {
      render(<CategoryForm {...defaultProps} />);

      const form = screen.getByTestId("category-form");
      fireEvent.submit(form);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("disables submit button when isSubmitting is true", () => {
      render(<CategoryForm {...defaultProps} isSubmitting={true} />);

      const submitButton = screen.getByTestId("category-submit-button");
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Saving...");
    });

    it("enables submit button when form is valid and not submitting", () => {
      render(<CategoryForm {...defaultProps} />);

      const nameInput = screen.getByTestId("category-name-input");
      fireEvent.change(nameInput, { target: { value: "Valid Name" } });

      const submitButton = screen.getByTestId("category-submit-button");
      expect(submitButton).not.toBeDisabled();
    });

    it("disables submit button when form is invalid", () => {
      render(<CategoryForm {...defaultProps} />);

      const submitButton = screen.getByTestId("category-submit-button");
      expect(submitButton).toBeDisabled();
    });
  });

  describe("Button Actions", () => {
    it("calls onCancel when cancel button is clicked", () => {
      render(<CategoryForm {...defaultProps} />);

      const cancelButton = screen.getByTestId("category-cancel-button");
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error Display", () => {
    it("displays prop errors correctly", () => {
      const errors = {
        name: "Name validation error",
        tag: "Tag validation error",
        parent_id: "Parent validation error",
      };

      render(<CategoryForm {...defaultProps} errors={errors} />);

      expect(screen.getByText("Name validation error")).toBeInTheDocument();
      expect(screen.getByText("Tag validation error")).toBeInTheDocument();
      expect(screen.getByText("Parent validation error")).toBeInTheDocument();
    });

    it("applies error styling to inputs with errors", () => {
      render(<CategoryForm {...defaultProps} errors={{ name: "Error" }} />);

      const nameInput = screen.getByTestId("category-name-input");
      expect(nameInput).toHaveClass("border-red-500");
    });

    it("does not apply error styling to inputs without errors", () => {
      render(<CategoryForm {...defaultProps} errors={{ name: "Error" }} />);

      const tagInput = screen.getByTestId("category-tag-input");
      expect(tagInput).toHaveClass("border-gray-300");
      expect(tagInput).not.toHaveClass("border-red-500");
    });

    it("clears local errors when prop errors change", () => {
      const { rerender } = render(<CategoryForm {...defaultProps} />);

      // First submit to create local errors
      const form = screen.getByTestId("category-form");
      fireEvent.submit(form);

      expect(screen.getByText("Name is required")).toBeInTheDocument();

      // Then provide prop errors
      rerender(<CategoryForm {...defaultProps} errors={{ tag: "Prop error" }} />);

      expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
      expect(screen.getByText("Prop error")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("sets aria-invalid and aria-describedby on inputs with errors", () => {
      render(<CategoryForm {...defaultProps} errors={{ name: "Error", tag: "Tag error" }} />);

      const nameInput = screen.getByTestId("category-name-input");
      expect(nameInput).toHaveAttribute("aria-invalid", "true");
      expect(nameInput).toHaveAttribute("aria-describedby", "name-error");

      const tagInput = screen.getByTestId("category-tag-input");
      expect(tagInput).toHaveAttribute("aria-invalid", "true");
      expect(tagInput).toHaveAttribute("aria-describedby", "tag-error");
    });

    it("does not set aria-invalid on inputs without errors", () => {
      render(<CategoryForm {...defaultProps} errors={{ name: "Error" }} />);

      const tagInput = screen.getByTestId("category-tag-input");
      expect(tagInput).toHaveAttribute("aria-invalid", "false");
      expect(tagInput).not.toHaveAttribute("aria-describedby");
    });

    it("provides unique IDs for error messages", () => {
      render(<CategoryForm {...defaultProps} errors={{ name: "Error", tag: "Tag error" }} />);

      const nameError = screen.getByText("Error");
      const tagError = screen.getByText("Tag error");

      expect(nameError).toHaveAttribute("id", "name-error");
      expect(tagError).toHaveAttribute("id", "tag-error");
    });

    it("disables self-selection in parent dropdown for edit mode", () => {
      render(<CategoryForm {...defaultProps} initialData={mockInitialData} />);

      const option = screen.getByRole("option", { name: "Food" });
      expect(option).toBeDisabled();
    });

    it("does not disable parent options for create mode", () => {
      render(<CategoryForm {...defaultProps} />);

      const option = screen.getByRole("option", { name: "Food" });
      expect(option).not.toBeDisabled();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty parentOptions array", () => {
      render(<CategoryForm {...defaultProps} parentOptions={[]} />);

      const select = screen.getByTestId("category-parent-select");
      expect(select).toHaveValue("0");

      // Should only have the "None" option
      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent("None (Main Category)");
    });

    it("handles categoryType changes correctly", () => {
      const { rerender } = render(<CategoryForm {...defaultProps} categoryType="expense" />);

      expect(screen.getByDisplayValue("expense")).toBeInTheDocument();

      rerender(<CategoryForm {...defaultProps} categoryType="income" />);

      expect(screen.getByDisplayValue("income")).toBeInTheDocument();
    });

    it("resets form when categoryType changes in create mode", () => {
      const { rerender } = render(<CategoryForm {...defaultProps} categoryType="expense" />);

      const nameInput = screen.getByTestId("category-name-input");
      fireEvent.change(nameInput, { target: { value: "Test Category" } });

      expect(screen.getByTestId("category-name-input")).toHaveValue("Test Category");

      rerender(<CategoryForm {...defaultProps} categoryType="income" />);

      // Form should be reset when categoryType changes in create mode
      expect(screen.getByTestId("category-name-input")).toHaveValue("");
      expect(screen.getByDisplayValue("income")).toBeInTheDocument();
    });
  });
});
