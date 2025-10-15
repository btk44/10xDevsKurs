import { Button } from "../ui/button";
import type { CategoryViewModel } from "./CategoriesPage";

interface CategoryRowProps {
  category: CategoryViewModel;
  indentLevel: number;
  onEdit: (category: CategoryViewModel) => void;
  onDelete: (category: CategoryViewModel) => void;
}

const CategoryRow = ({ category, indentLevel, onEdit, onDelete }: CategoryRowProps) => {
  const handleEdit = () => {
    onEdit(category);
  };

  const handleDelete = () => {
    onDelete(category);
  };

  return (
    <tr className="border-b hover:bg-gray-50" data-testid={`category-row-${category.id}`}>
      <td className="py-2 px-4">
        <div className="flex items-center">
          {/* Indent based on level */}
          {indentLevel > 0 && (
            <div className="w-6 h-6 mr-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          )}
          <span className={indentLevel > 0 ? "font-normal" : "font-medium"}>{category.name}</span>
        </div>
      </td>
      <td className="py-2 px-4">
        {category.tag && (
          <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">{category.tag}</span>
        )}
      </td>
      <td className="py-2 px-4 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEdit}
          className="mr-2"
          aria-label={`Edit ${category.name}`}
          data-testid={`category-edit-button-${category.id}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-1"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="text-red-600 hover:text-red-800 hover:bg-red-50"
          aria-label={`Delete ${category.name}`}
          data-testid={`category-delete-button-${category.id}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-1"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
          Delete
        </Button>
      </td>
    </tr>
  );
};

export default CategoryRow;
