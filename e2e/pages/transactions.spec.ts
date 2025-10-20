import { test, expect } from "@playwright/test";
import {
  TransactionsPage,
  TransactionForm,
  TransactionTable,
  DeleteTransactionDialog,
  AccountsPage,
  AccountForm,
  CategoriesPage,
  CategoryForm,
} from "./index";

test.describe("Transactions Management", () => {
  let transactionsPage: TransactionsPage;
  let transactionForm: TransactionForm;
  let transactionTable: TransactionTable;
  let deleteModal: DeleteTransactionDialog;
  let accountsPage: AccountsPage;
  let accountForm: AccountForm;
  let categoriesPage: CategoriesPage;
  let categoryForm: CategoryForm;

  // Test data variables
  let testAccountName: string;
  let testExpenseCategoryName: string;
  let testIncomeCategoryName: string;

  test.beforeEach(async ({ page }) => {
    transactionsPage = new TransactionsPage(page);
    transactionForm = new TransactionForm(page);
    transactionTable = new TransactionTable(page);
    deleteModal = new DeleteTransactionDialog(page);
    accountsPage = new AccountsPage(page);
    accountForm = new AccountForm(page);
    categoriesPage = new CategoriesPage(page);
    categoryForm = new CategoryForm(page);

    // Login first
    //await loginPage.goto();
    //await loginPage.login(testUsers.standard.email, testUsers.standard.password);

    // Create test account if it doesn't exist
    await accountsPage.goto();
    await accountsPage.page.waitForLoadState("networkidle");
    await accountsPage.waitForAccountsToLoad();

    testAccountName = `Test Account ${Date.now()}`;
    await accountForm.createAccount(testAccountName, "USD - US Dollar", "TEST");
    await page.waitForTimeout(1000);

    // Create test expense category if it doesn't exist
    await categoriesPage.goto();
    await categoriesPage.page.waitForLoadState("networkidle");
    await categoriesPage.switchToExpenseTab();
    await categoriesPage.waitForCategoriesToLoad();

    // Create unique test expense category
    testExpenseCategoryName = `Food ${Date.now()}`;
    await categoryForm.createCategory(testExpenseCategoryName, "FOOD");
    await page.waitForTimeout(500);

    // Create unique test income category
    await categoriesPage.switchToIncomeTab();
    await categoriesPage.waitForCategoriesToLoad();

    testIncomeCategoryName = `Salary ${Date.now()}`;
    await categoryForm.createCategory(testIncomeCategoryName, "SALARY");
    await page.waitForTimeout(500);
  });

  test("should perform full transaction flow: create, edit, cancel delete, then delete", async ({ page }) => {
    // Navigate to transactions page
    await transactionsPage.goto();
    await transactionsPage.page.waitForLoadState("networkidle");

    // Verify transactions page is loaded
    await expect(transactionsPage.container).toBeVisible();

    // Wait for transactions to load
    await transactionsPage.waitForLoadingToDisappear();

    // Get initial transaction count
    const initialCount = await transactionTable.getTransactionCount();

    // Step 1: Create a new transaction and verify it appears in the list
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
    const transactionData = {
      date: today,
      account: testAccountName, // Created in beforeEach
      category: testExpenseCategoryName, // Created in beforeEach
      amount: "50.00",
      comment: `Full flow test transaction ${Date.now()}`,
    };

    await page.waitForLoadState("networkidle");
    await transactionForm.createTransaction(transactionData);

    // Wait for the transaction to appear in the list
    await page.waitForTimeout(1000); // Allow time for the API call and UI update

    // Verify the transaction appears in the list
    await expect(transactionTable.container).toBeVisible();
    expect(
      await transactionTable.isTransactionVisible(
        transactionData.date,
        transactionData.amount,
        transactionData.category
      )
    ).toBe(true);

    // Verify the transaction count increased
    expect(await transactionTable.getTransactionCount()).toBe(initialCount + 1);

    // Step 2: Edit this transaction and verify it is updated
    const transactionId = await transactionTable.getTransactionIdByDetails(
      transactionData.date,
      transactionData.amount,
      transactionData.category
    );
    expect(transactionId).toBeTruthy();

    await transactionTable.clickEditButton(parseInt(transactionId ?? "0"));

    // Verify form is visible and has the correct data
    await expect(transactionForm.isVisible()).resolves.toBe(true);
    const title = await transactionForm.getTitleText();
    expect(title).toContain("Edit");

    // Update the transaction
    const updatedData = {
      date: today,
      account: testAccountName,
      category: testExpenseCategoryName,
      amount: "75.00", // Changed amount
      comment: `${transactionData.comment} - edited`,
    };

    await transactionForm.fillForm(updatedData);
    await transactionForm.submit();

    // Wait for the update to complete
    await page.waitForTimeout(1000);

    // Verify the updated transaction appears in the list
    expect(
      await transactionTable.isTransactionVisible(updatedData.date, updatedData.amount, updatedData.category)
    ).toBe(true);

    // Verify the old transaction is gone
    expect(
      await transactionTable.isTransactionVisible(
        transactionData.date,
        transactionData.amount,
        transactionData.category
      )
    ).toBe(false);

    // Verify count hasn't changed
    expect(await transactionTable.getTransactionCount()).toBe(initialCount + 1);

    // Step 3: Try to delete it but cancel the deletion
    const updatedTransactionId = await transactionTable.getTransactionIdByDetails(
      updatedData.date,
      updatedData.amount,
      updatedData.category
    );
    await transactionTable.clickDeleteButton(parseInt(updatedTransactionId ?? "0"));

    // Wait for modal to appear
    await page.waitForTimeout(1000);

    // Verify modal appears
    await expect(deleteModal.isModalVisible()).resolves.toBe(true);

    // Cancel the deletion
    await deleteModal.cancel();

    // Verify modal is closed
    await expect(deleteModal.isModalVisible()).resolves.toBe(false);

    // Verify the transaction is still in the list
    expect(
      await transactionTable.isTransactionVisible(updatedData.date, updatedData.amount, updatedData.category)
    ).toBe(true);

    // Verify count hasn't changed
    expect(await transactionTable.getTransactionCount()).toBe(initialCount + 1);

    // Step 4: Delete transaction and verify it's removed from the list
    await transactionTable.clickDeleteButton(parseInt(updatedTransactionId ?? "0"));

    // Wait for modal to appear
    await page.waitForTimeout(1000);

    // Verify the delete confirmation modal appears
    await expect(deleteModal.isModalVisible()).resolves.toBe(true);

    // Verify modal content
    const deleteTitle = await deleteModal.getTitle();
    expect(deleteTitle).toContain("Delete");

    const description = await deleteModal.getDescription();
    expect(description).toContain("transaction");

    // Confirm deletion
    await deleteModal.confirm();

    // Wait for deletion to complete
    await page.waitForTimeout(1000);

    // Verify the transaction is no longer in the list
    expect(
      await transactionTable.isTransactionVisible(updatedData.date, updatedData.amount, updatedData.category)
    ).toBe(false);

    // Verify the transaction count decreased
    const finalCount = await transactionTable.getTransactionCount();
    expect(finalCount).toBe(initialCount);

    // Verify modal is closed
    await expect(deleteModal.isModalVisible()).resolves.toBe(false);
  });
});
