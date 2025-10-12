import type { CategoryViewModel } from "./CategoriesPage";
import CategoryRow from "./CategoryRow";

interface CategoryListProps {
  categories: CategoryViewModel[];
  onEdit: (category: CategoryViewModel) => void;
  onDelete: (category: CategoryViewModel) => void;
  loading: boolean;
}

const CategoryList = ({ categories, onEdit, onDelete, loading }: CategoryListProps) => {
  if (loading) {
    return <div className="text-center py-8">Loading categories...</div>;
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No categories found. Create your first category using the form below.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" role="table">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-4">Name</th>
            <th className="text-left py-2 px-4">Tag</th>
            <th className="text-right py-2 px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              indentLevel={category.level}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CategoryList;
