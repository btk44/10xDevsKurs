import { useState, useMemo } from "react";
import type { CategoryType } from "../../types";
import CategoriesTabs from "./CategoriesTabs";
import CategoryList from "./CategoryList";
import CategoryForm from "./CategoryForm";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { useCategories } from "./hooks/useCategories";
import { useCategoryMutations } from "./hooks/useCategoryMutations";

export interface CategoryViewModel {
  id: number;
  user_id: string;
  name: string;
  category_type: CategoryType;
  parent_id: number;
  tag: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  children: CategoryViewModel[];
  level: number;
}

export interface CategoryOption {
  value: number;
  label: string;
}

export interface CategoryFormData {
  id?: number;
  name: string;
  tag?: string;
  parent_id: number;
  category_type: CategoryType;
}

const CategoriesPage = () => {
  const [activeType, setActiveType] = useState<CategoryType>("expense");
  const { categories, loading, error, refetch } = useCategories(activeType);
  const [selectedCategory, setSelectedCategory] = useState<CategoryViewModel | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryViewModel | null>(null);

  const {
    create,
    update,
    remove,
    isCreating,
    isUpdating,
    isDeleting,
    error: mutationError,
    fieldErrors,
    deleteError,
  } = useCategoryMutations();

  // Generate parent options for the form
  const parentOptions = useMemo(() => {
    // Only main categories (parent_id === 0) can be parents
    return categories
      .filter((category) => category.parent_id === 0)
      .map((category) => ({
        value: category.id,
        label: category.name,
      }));
  }, [categories]);

  const handleTypeChange = (type: CategoryType) => {
    setActiveType(type);
    setSelectedCategory(null);
  };

  const handleEditCategory = (category: CategoryViewModel) => {
    setSelectedCategory(category);
  };

  const handleDeleteCategory = (category: CategoryViewModel) => {
    setDeleteTarget(category);
    setShowDeleteModal(true);
  };

  const handleCancelForm = () => {
    setSelectedCategory(null);
  };

  const handleSubmitForm = async (formData: CategoryFormData) => {
    if (formData.id) {
      // Update existing category
      const { id, ...updateData } = formData;
      const result = await update(id, updateData);
      if (result) {
        setSelectedCategory(null);
        refetch();
      }
    } else {
      // Create new category
      const result = await create(formData);
      if (result) {
        setSelectedCategory(null);
        refetch();
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      const success = await remove(deleteTarget.id);
      if (success) {
        setShowDeleteModal(false);
        setDeleteTarget(null);
        refetch();
      }
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  // Create form initial data from selected category
  const formInitialData = useMemo(() => {
    if (!selectedCategory) return undefined;

    return {
      id: selectedCategory.id,
      name: selectedCategory.name,
      tag: selectedCategory.tag || "",
      parent_id: selectedCategory.parent_id,
      category_type: selectedCategory.category_type,
    };
  }, [selectedCategory]);

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <CategoriesTabs activeType={activeType} onTypeChange={handleTypeChange} />
      </div>

      {(error || mutationError) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <p>{error || mutationError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="mb-8">
            <CategoryList
              categories={categories}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
              loading={loading}
            />
          </div>
        </div>

        <div className="lg:col-span-1">
          <CategoryForm
            initialData={formInitialData}
            parentOptions={parentOptions}
            onSubmit={handleSubmitForm}
            onCancel={handleCancelForm}
            isSubmitting={isCreating || isUpdating}
            errors={fieldErrors}
            categoryType={activeType}
          />
        </div>
      </div>

      <DeleteConfirmationModal
        category={deleteTarget}
        open={showDeleteModal}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDeleting={isDeleting}
        deleteError={deleteError || undefined}
      />
    </div>
  );
};

export default CategoriesPage;
