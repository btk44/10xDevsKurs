import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import type { CategoryViewModel } from "./CategoriesPage";

interface DeleteConfirmationModalProps {
  category: CategoryViewModel | null;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
  deleteError?: string;
}

const DeleteConfirmationModal = ({
  category,
  open,
  onConfirm,
  onCancel,
  isDeleting,
  deleteError,
}: DeleteConfirmationModalProps) => {
  if (!category) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent data-testid="delete-category-modal">
        <DialogHeader>
          <DialogTitle data-testid="delete-category-modal-title">Delete Category</DialogTitle>
          <DialogDescription data-testid="delete-category-modal-description">
            Are you sure you want to delete the category &quot;{category.name}&quot;?
            {category.children.length > 0 && (
              <div className="mt-2 text-amber-600 font-medium">
                Warning: This category has {category.children.length} subcategories that will also be deleted.
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4" data-testid="delete-category-modal-body">
          {deleteError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p>{deleteError}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
            data-testid="delete-category-modal-cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            data-testid="delete-category-modal-confirm"
          >
            {isDeleting ? "Deleting..." : "Delete Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmationModal;
