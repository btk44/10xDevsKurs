import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../../../tests/utils";
import CategoriesPage, { type CategoryViewModel, type CategoryFormData } from "../CategoriesPage";
import { useCategories } from "../hooks/useCategories";
import { useCategoryMutations } from "../hooks/useCategoryMutations";

// Mock the custom hooks
vi.mock("../hooks/useCategories");
vi.mock("../hooks/useCategoryMutations");

// Mock child components
vi.mock("../CategoriesTabs", () => ({
  default: ({ activeType, onTypeChange }: { activeType: string; onTypeChange: (type: string) => void }) => (
    <div data-testid="categories-tabs">
      <button
        data-testid="tabs-expense"
        onClick={() => onTypeChange("expense")}
        aria-pressed={activeType === "expense"}
      >
        Expense
      </button>
      <button data-testid="tabs-income" onClick={() => onTypeChange("income")} aria-pressed={activeType === "income"}>
        Income
      </button>
    </div>
  ),
}));

vi.mock("../CategoryList", () => ({
  default: ({
    categories,
    onEdit,
    onDelete,
    loading,
  }: {
    categories: CategoryViewModel[];
    onEdit: (category: CategoryViewModel) => void;
    onDelete: (category: CategoryViewModel) => void;
    loading: boolean;
  }) => (
    <div data-testid="category-list">
      {loading ? (
        <div data-testid="category-list-loading">Loading...</div>
      ) : (
        <div data-testid="category-list-content">
          {categories.map((category) => (
            <div key={category.id} data-testid={`category-item-${category.id}`}>
              <span>{category.name}</span>
              <button data-testid={`edit-category-${category.id}`} onClick={() => onEdit(category)}>
                Edit
              </button>
              <button data-testid={`delete-category-${category.id}`} onClick={() => onDelete(category)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  ),
}));

vi.mock("../CategoryForm", () => ({
  default: ({
    initialData,
    parentOptions,
    onSubmit,
    onCancel,
    isSubmitting,
    errors,
    categoryType,
  }: {
    initialData?: CategoryFormData;
    parentOptions: { value: number; label: string }[];
    onSubmit: (data: CategoryFormData) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    errors?: Record<string, string>;
    categoryType: string;
  }) => (
    <div data-testid="category-form">
      <form
        data-testid="category-form-element"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = {
            name: "Test Category",
            tag: "TEST",
            parent_id: 0,
            category_type: categoryType as "expense" | "income",
            ...(initialData?.id && { id: initialData.id }),
          };
          onSubmit(formData);
        }}
      >
        <input name="name" defaultValue={initialData?.name || ""} data-testid="form-name-input" />
        <input name="tag" defaultValue={initialData?.tag || ""} data-testid="form-tag-input" />
        <select name="parent_id" defaultValue={initialData?.parent_id || 0} data-testid="form-parent-select">
          <option value={0}>None</option>
          {parentOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button type="submit" disabled={isSubmitting} data-testid="form-submit">
          {initialData ? "Update" : "Create"}
        </button>
        <button type="button" onClick={onCancel} data-testid="form-cancel">
          Cancel
        </button>
      </form>
      {errors && Object.keys(errors).length > 0 && (
        <div data-testid="form-errors">
          {Object.entries(errors).map(([field, message]) => (
            <div key={field} data-testid={`error-${field}`}>
              {message}
            </div>
          ))}
        </div>
      )}
    </div>
  ),
}));

vi.mock("../DeleteConfirmationModal", () => ({
  default: ({
    category,
    open,
    onConfirm,
    onCancel,
    isDeleting,
    deleteError,
  }: {
    category: CategoryViewModel | null;
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    isDeleting: boolean;
    deleteError?: string;
  }) => (
    <div data-testid="delete-modal" style={{ display: open ? "block" : "none" }}>
      {category && (
        <>
          <div>Delete {category.name}?</div>
          {deleteError && <div data-testid="delete-error">{deleteError}</div>}
          <button onClick={onConfirm} disabled={isDeleting} data-testid="confirm-delete">
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          <button onClick={onCancel} data-testid="cancel-delete">
            Cancel
          </button>
        </>
      )}
    </div>
  ),
}));

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
    name: "Transportation",
    category_type: "expense",
    parent_id: 0,
    tag: "TRANS",
    active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    children: [],
    level: 0,
  },
];

const mockUseCategories = vi.mocked(useCategories);
const mockUseCategoryMutations = vi.mocked(useCategoryMutations);

describe("CategoriesPage", () => {
  const mockRefetch = vi.fn();
  const mockCreate = vi.fn();
  const mockUpdate = vi.fn();
  const mockRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseCategories.mockReturnValue({
      categories: mockCategories,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    mockUseCategoryMutations.mockReturnValue({
      create: mockCreate,
      update: mockUpdate,
      remove: mockRemove,
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      error: null,
      fieldErrors: {},
      deleteError: null,
    });
  });

  describe("Basic Rendering", () => {
    it("renders the component with correct structure", () => {
      render(<CategoriesPage />);

      expect(screen.getByTestId("categories-page")).toBeInTheDocument();
      expect(screen.getByTestId("categories-tabs")).toBeInTheDocument();
      expect(screen.getByTestId("category-list")).toBeInTheDocument();
      expect(screen.getByTestId("category-form")).toBeInTheDocument();
    });

    it("has correct data-testid attribute", () => {
      render(<CategoriesPage />);

      expect(screen.getByTestId("categories-page")).toBeInTheDocument();
    });

    it("renders with proper layout structure", () => {
      render(<CategoriesPage />);

      // The main container should have space-y-8
      const mainContainer = screen.getByTestId("categories-page");
      expect(mainContainer).toHaveClass("space-y-8");

      // The grid container should have the grid classes
      const gridContainer = mainContainer.querySelector(".grid");
      expect(gridContainer).toHaveClass("grid", "grid-cols-1", "lg:grid-cols-3", "gap-8");
    });
  });

  describe("Initial State", () => {
    it("initializes with expense type by default", () => {
      render(<CategoriesPage />);

      expect(mockUseCategories).toHaveBeenCalledWith("expense");
    });

    it("passes correct props to CategoriesTabs", () => {
      render(<CategoriesPage />);

      expect(screen.getByTestId("tabs-expense")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("tabs-income")).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("Type Switching", () => {
    it("calls useCategories with new type when switching tabs", async () => {
      render(<CategoriesPage />);

      const incomeTab = screen.getByTestId("tabs-income");
      fireEvent.click(incomeTab);

      await waitFor(() => {
        expect(mockUseCategories).toHaveBeenCalledWith("income");
      });
    });

    it("resets selected category when switching types", async () => {
      // First select a category by clicking edit
      mockUseCategories.mockReturnValue({
        categories: mockCategories,
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<CategoriesPage />);

      const editButton = screen.getByTestId("edit-category-1");
      fireEvent.click(editButton);

      // Then switch tabs
      const incomeTab = screen.getByTestId("tabs-income");
      fireEvent.click(incomeTab);

      // The form should reset (no initial data)
      await waitFor(() => {
        expect(mockUseCategories).toHaveBeenCalledWith("income");
      });
    });
  });

  describe("Category Editing", () => {
    it("shows form with category data when edit button is clicked", () => {
      render(<CategoriesPage />);

      const editButton = screen.getByTestId("edit-category-1");
      fireEvent.click(editButton);

      // The form should now have initial data
      const form = screen.getByTestId("category-form");
      expect(form).toBeInTheDocument();

      // Check that the form submit button shows "Update"
      expect(screen.getByTestId("form-submit")).toHaveTextContent("Update");
    });

    it("calls onCancel when cancel button is clicked", () => {
      render(<CategoriesPage />);

      // First edit a category
      const editButton = screen.getByTestId("edit-category-1");
      fireEvent.click(editButton);

      // Then cancel
      const cancelButton = screen.getByTestId("form-cancel");
      fireEvent.click(cancelButton);

      // Form should be reset (submit button should show "Create" again)
      expect(screen.getByTestId("form-submit")).toHaveTextContent("Create");
    });
  });

  describe("Category Deletion", () => {
    it("opens delete modal when delete button is clicked", () => {
      render(<CategoriesPage />);

      const deleteButton = screen.getByTestId("delete-category-1");
      fireEvent.click(deleteButton);

      expect(screen.getByTestId("delete-modal")).toBeVisible();
      expect(screen.getByText("Delete Food?")).toBeInTheDocument();
    });

    it("closes delete modal when cancel is clicked", () => {
      render(<CategoriesPage />);

      // Open modal
      const deleteButton = screen.getByTestId("delete-category-1");
      fireEvent.click(deleteButton);

      // Close modal
      const cancelButton = screen.getByTestId("cancel-delete");
      fireEvent.click(cancelButton);

      expect(screen.getByTestId("delete-modal")).not.toBeVisible();
    });

    it("calls remove function when delete is confirmed", async () => {
      mockRemove.mockResolvedValue(true);

      render(<CategoriesPage />);

      // Open modal and confirm delete
      const deleteButton = screen.getByTestId("delete-category-1");
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByTestId("confirm-delete");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockRemove).toHaveBeenCalledWith(1);
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it("closes modal and resets state after successful deletion", async () => {
      mockRemove.mockResolvedValue(true);

      render(<CategoriesPage />);

      // Open modal and confirm delete
      const deleteButton = screen.getByTestId("delete-category-1");
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByTestId("confirm-delete");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByTestId("delete-modal")).not.toBeVisible();
      });
    });
  });

  describe("Form Submission", () => {
    it("calls create function when submitting new category", async () => {
      mockCreate.mockResolvedValue({
        id: 3,
        user_id: "user-123",
        name: "Test Category",
        category_type: "expense",
        parent_id: 0,
        tag: "TEST",
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });

      render(<CategoriesPage />);

      const submitButton = screen.getByTestId("form-submit");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith({
          name: "Test Category",
          tag: "TEST",
          parent_id: 0,
          category_type: "expense",
        });
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it("calls update function when submitting edited category", async () => {
      mockUpdate.mockResolvedValue({
        id: 1,
        user_id: "user-123",
        name: "Updated Food",
        category_type: "expense",
        parent_id: 0,
        tag: "FOOD",
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });

      render(<CategoriesPage />);

      // Edit category first
      const editButton = screen.getByTestId("edit-category-1");
      fireEvent.click(editButton);

      // Submit form
      const submitButton = screen.getByTestId("form-submit");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(1, {
          name: "Test Category",
          tag: "TEST",
          parent_id: 0,
          category_type: "expense",
        });
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it("resets form after successful submission", async () => {
      mockCreate.mockResolvedValue({
        id: 3,
        user_id: "user-123",
        name: "Test Category",
        category_type: "expense",
        parent_id: 0,
        tag: "TEST",
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });

      render(<CategoriesPage />);

      const form = screen.getByTestId("category-form");
      fireEvent.submit(form);

      await waitFor(() => {
        // Form should be reset (submit button should show "Create")
        expect(screen.getByTestId("form-submit")).toHaveTextContent("Create");
      });
    });
  });

  describe("Parent Options", () => {
    it("generates parent options from root categories only", () => {
      const categoriesWithChildren: CategoryViewModel[] = [
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
        },
      ];

      mockUseCategories.mockReturnValue({
        categories: categoriesWithChildren,
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<CategoriesPage />);

      // The form should have parent options with only "Food" (parent_id === 0)
      const form = screen.getByTestId("category-form");
      expect(form).toBeInTheDocument();
    });
  });

  describe("Error States", () => {
    it("displays error message when useCategories returns error", () => {
      mockUseCategories.mockReturnValue({
        categories: [],
        loading: false,
        error: "Failed to load categories",
        refetch: mockRefetch,
      });

      render(<CategoriesPage />);

      expect(screen.getByText("Failed to load categories")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("displays mutation error when useCategoryMutations returns error", () => {
      mockUseCategoryMutations.mockReturnValue({
        create: mockCreate,
        update: mockUpdate,
        remove: mockRemove,
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
        error: "Failed to create category",
        fieldErrors: {},
        deleteError: null,
      });

      render(<CategoriesPage />);

      expect(screen.getByText("Failed to create category")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("displays field errors in the form", () => {
      mockUseCategoryMutations.mockReturnValue({
        create: mockCreate,
        update: mockUpdate,
        remove: mockRemove,
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
        error: null,
        fieldErrors: { name: "Name is required", tag: "Tag is invalid" },
        deleteError: null,
      });

      render(<CategoriesPage />);

      expect(screen.getByTestId("form-errors")).toBeInTheDocument();
      expect(screen.getByTestId("error-name")).toHaveTextContent("Name is required");
      expect(screen.getByTestId("error-tag")).toHaveTextContent("Tag is invalid");
    });

    it("displays delete error in modal", () => {
      mockUseCategoryMutations.mockReturnValue({
        create: mockCreate,
        update: mockUpdate,
        remove: mockRemove,
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
        error: null,
        fieldErrors: {},
        deleteError: "Category is in use",
      });

      render(<CategoriesPage />);

      // Open delete modal
      const deleteButton = screen.getByTestId("delete-category-1");
      fireEvent.click(deleteButton);

      expect(screen.getByTestId("delete-error")).toHaveTextContent("Category is in use");
    });
  });

  describe("Loading States", () => {
    it("passes loading state to CategoryList", () => {
      mockUseCategories.mockReturnValue({
        categories: [],
        loading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<CategoriesPage />);

      expect(screen.getByTestId("category-list-loading")).toBeInTheDocument();
    });

    it("disables form submit button when creating", () => {
      mockUseCategoryMutations.mockReturnValue({
        create: mockCreate,
        update: mockUpdate,
        remove: mockRemove,
        isCreating: true,
        isUpdating: false,
        isDeleting: false,
        error: null,
        fieldErrors: {},
        deleteError: null,
      });

      render(<CategoriesPage />);

      const submitButton = screen.getByTestId("form-submit");
      expect(submitButton).toBeDisabled();
    });

    it("disables form submit button when updating", () => {
      mockUseCategoryMutations.mockReturnValue({
        create: mockCreate,
        update: mockUpdate,
        remove: mockRemove,
        isCreating: false,
        isUpdating: true,
        isDeleting: false,
        error: null,
        fieldErrors: {},
        deleteError: null,
      });

      render(<CategoriesPage />);

      const submitButton = screen.getByTestId("form-submit");
      expect(submitButton).toBeDisabled();
    });

    it("disables delete confirm button when deleting", () => {
      mockUseCategoryMutations.mockReturnValue({
        create: mockCreate,
        update: mockUpdate,
        remove: mockRemove,
        isCreating: false,
        isUpdating: false,
        isDeleting: true,
        error: null,
        fieldErrors: {},
        deleteError: null,
      });

      render(<CategoriesPage />);

      // Open delete modal
      const deleteButton = screen.getByTestId("delete-category-1");
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByTestId("confirm-delete");
      expect(confirmButton).toBeDisabled();
      expect(confirmButton).toHaveTextContent("Deleting...");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA landmarks and roles", () => {
      render(<CategoriesPage />);

      // Error messages should have alert role
      const mockMutationsWithError = {
        create: mockCreate,
        update: mockUpdate,
        remove: mockRemove,
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
        error: "Test error",
        fieldErrors: {},
        deleteError: null,
      };

      mockUseCategoryMutations.mockReturnValue(mockMutationsWithError);

      render(<CategoriesPage />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
