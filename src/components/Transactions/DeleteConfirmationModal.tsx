import type { TransactionDTO } from "../../types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";

interface DeleteConfirmationModalProps {
  transaction: TransactionDTO | null;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
  deleteError?: Error | string;
}

const DeleteConfirmationModal = ({
  transaction,
  open,
  onConfirm,
  onCancel,
  isDeleting,
  deleteError,
}: DeleteConfirmationModalProps) => {
  if (!transaction) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()} data-testid="delete-transaction-modal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle data-testid="delete-transaction-modal-title">Delete Transaction</DialogTitle>
          <DialogDescription data-testid="delete-transaction-modal-description">
            Are you sure you want to delete this transaction?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4" data-testid="delete-transaction-modal-body">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Date:</span>
                <div>{new Date(transaction.transaction_date).toLocaleDateString()}</div>
              </div>
              <div>
                <span className="font-medium">Account:</span>
                <div>{transaction.account_name}</div>
              </div>
              <div>
                <span className="font-medium">Category:</span>
                <div>{transaction.category_name}</div>
              </div>
              <div>
                <span className="font-medium">Amount:</span>
                <div className={transaction.category_type === "expense" ? "text-red-600" : "text-green-600"}>
                  {new Intl.NumberFormat("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(transaction.amount)}{" "}
                  {transaction.currency_code}
                </div>
              </div>
            </div>
            {transaction.comment && (
              <div className="mt-2">
                <span className="font-medium">Comment:</span>
                <div className="text-sm text-gray-600">{transaction.comment}</div>
              </div>
            )}
          </div>
        </div>

        {deleteError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p>{typeof deleteError === "string" ? deleteError : deleteError.message}</p>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
            data-testid="delete-transaction-modal-cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            data-testid="delete-transaction-modal-confirm"
          >
            {isDeleting ? "Deleting..." : "Delete Transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmationModal;
