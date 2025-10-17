import type { AccountDTO } from "../../types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";

interface DeleteConfirmationModalProps {
  account: AccountDTO;
  onConfirm: (id: number) => void;
  onClose: () => void;
  isDeleting: boolean;
}

export default function DeleteConfirmationModal({
  account,
  onConfirm,
  onClose,
  isDeleting,
}: DeleteConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm(account.id);
  };

  return (
    <Dialog open={true} onOpenChange={onClose} data-testid="delete-account-modal">
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="delete-modal-title">Delete Account</DialogTitle>
          <DialogDescription data-testid="delete-modal-description">
            Are you sure you want to delete the account &quot;{account.name}&quot;?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4" data-testid="delete-modal-body">
          <p className="text-sm text-gray-500">
            This will soft-delete the account. The account will be hidden from views but its data will be preserved. Any
            transactions associated with this account will remain in the database.
          </p>
        </div>

        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            data-testid="delete-modal-cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            data-testid="delete-modal-confirm"
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
