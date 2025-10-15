import { useState, useEffect } from "react";
import type { CategoryType } from "../../types";
import { Button } from "../ui/button";
import type { CategoryFormData, CategoryOption } from "./CategoriesPage";

interface CategoryFormProps {
  initialData?: CategoryFormData;
  parentOptions: CategoryOption[];
  onSubmit: (data: CategoryFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  errors?: Record<string, string>;
  categoryType: CategoryType;
}

export default function CategoryForm({
  initialData,
  parentOptions,
  onSubmit,
  onCancel,
  isSubmitting,
  errors = {},
  categoryType,
}: CategoryFormProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    tag: "",
    parent_id: 0,
    category_type: categoryType,
  });

  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  // Reset form when initialData changes (edit mode or cancel)
  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name,
        tag: initialData.tag || "",
        parent_id: initialData.parent_id,
        category_type: initialData.category_type,
      });
    } else {
      setFormData({
        name: "",
        tag: "",
        parent_id: 0,
        category_type: categoryType,
      });
    }
    setLocalErrors({});
  }, [initialData, categoryType]);

  // Update form when category type changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      category_type: categoryType,
    }));
  }, [categoryType]);

  // Map API errors to form fields
  useEffect(() => {
    setLocalErrors(errors);
  }, [errors]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "parent_id" ? Number(value) : value,
    }));

    // Clear local error when field is edited
    if (localErrors[name]) {
      setLocalErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.length > 100) {
      newErrors.name = "Name must be 100 characters or less";
    }

    // Validate tag
    if (formData.tag && formData.tag.length > 10) {
      newErrors.tag = "Tag must be 10 characters or less";
    }

    // Validate parent_id
    if (formData.id && formData.parent_id === formData.id) {
      newErrors.parent_id = "Category cannot be its own parent";
    }

    setLocalErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({
      ...formData,
      tag: formData.tag || undefined,
    });
  };

  const isFormValid = formData.name.trim() !== "";
  const isEditing = !!initialData?.id;

  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm" data-testid="category-form-container">
      <h2 className="text-xl font-semibold mb-4">{isEditing ? "Edit Category" : "Create New Category"}</h2>

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="category-form">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Category Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md ${localErrors.name ? "border-red-500" : "border-gray-300"}`}
            aria-invalid={!!localErrors.name}
            aria-describedby={localErrors.name ? "name-error" : undefined}
            data-testid="category-name-input"
          />
          {localErrors.name && (
            <p id="name-error" className="mt-1 text-sm text-red-600">
              {localErrors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="tag" className="block text-sm font-medium mb-1">
            Tag (Optional)
          </label>
          <input
            id="tag"
            name="tag"
            type="text"
            value={formData.tag || ""}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md ${localErrors.tag ? "border-red-500" : "border-gray-300"}`}
            maxLength={10}
            aria-invalid={!!localErrors.tag}
            aria-describedby={localErrors.tag ? "tag-error" : undefined}
            data-testid="category-tag-input"
          />
          {localErrors.tag && (
            <p id="tag-error" className="mt-1 text-sm text-red-600">
              {localErrors.tag}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">Max 10 characters</p>
        </div>

        <div>
          <label htmlFor="parent_id" className="block text-sm font-medium mb-1">
            Parent Category
          </label>
          <select
            id="parent_id"
            name="parent_id"
            value={formData.parent_id}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md ${
              localErrors.parent_id ? "border-red-500" : "border-gray-300"
            }`}
            aria-invalid={!!localErrors.parent_id}
            aria-describedby={localErrors.parent_id ? "parent-error" : undefined}
            data-testid="category-parent-select"
          >
            <option value={0}>None (Main Category)</option>
            {parentOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={formData.id === option.value} // Prevent selecting self as parent
              >
                {option.label}
              </option>
            ))}
          </select>
          {localErrors.parent_id && (
            <p id="parent-error" className="mt-1 text-sm text-red-600">
              {localErrors.parent_id}
            </p>
          )}
        </div>

        {/* Hidden field for category_type */}
        <input type="hidden" name="category_type" value={formData.category_type} />

        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="category-cancel-button">
            Cancel
          </Button>
          <Button type="submit" disabled={!isFormValid || isSubmitting} data-testid="category-submit-button">
            {isSubmitting ? "Saving..." : isEditing ? "Update Category" : "Create Category"}
          </Button>
        </div>
      </form>
    </div>
  );
}
