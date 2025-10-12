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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Account</DialogTitle>
          <DialogDescription>Are you sure you want to delete the account "{account.name}"?</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-500">
            This will soft-delete the account. The account will be hidden from views but its data will be preserved. Any
            transactions associated with this account will remain in the database.
          </p>
        </div>

        <DialogFooter className="sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
