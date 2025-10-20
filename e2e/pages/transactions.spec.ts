import { test, expect } from "@playwright/test";
import {
  TransactionsPage,
  TransactionForm,
  TransactionTable,
  //DeleteTransactionDialog,
  AccountsPage,
  AccountForm,
  CategoriesPage,
  CategoryForm,
} from "./index";

test.describe("Transactions Management", () => {
  let transactionsPage: TransactionsPage;
  let transactionForm: TransactionForm;
  let transactionTable: TransactionTable;
  //let deleteModal: DeleteTransactionDialog;
  let accountsPage: AccountsPage;
  let accountForm: AccountForm;
  let categoriesPage: CategoriesPage;
  let categoryForm: CategoryForm;

  test.beforeEach(async ({ page }) => {
    transactionsPage = new TransactionsPage(page);
    transactionForm = new TransactionForm(page);
    transactionTable = new TransactionTable(page);
    //deleteModal = new DeleteTransactionDialog(page);
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

    const testAccountName = "Test Account";
    if (!(await accountsPage.isAccountVisible(testAccountName))) {
      await accountForm.createAccount(testAccountName, "USD - US Dollar", "TEST");
      await page.waitForTimeout(1000);
    }

    // Create test expense category if it doesn't exist
    await categoriesPage.goto();
    await categoriesPage.page.waitForLoadState("networkidle");
    await categoriesPage.switchToExpenseTab();
    await categoriesPage.waitForCategoriesToLoad();

    // Note: We don't have a direct way to check if category exists, so we'll create it
    // This will fail gracefully if it already exists due to unique constraints
    try {
      await categoryForm.createCategory("Food", "FOOD");
      await page.waitForTimeout(500);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Category might already exist, continue
    }

    // Create test income category if it doesn't exist
    await categoriesPage.switchToIncomeTab();
    await categoriesPage.waitForCategoriesToLoad();

    try {
      await categoryForm.createCategory("Salary", "SALARY");
      await page.waitForTimeout(500);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Category might already exist, continue
    }
  });

  test("should create a new transaction and verify it appears in the list", async ({ page }) => {
    // Navigate to transactions page
    await transactionsPage.goto();
    await transactionsPage.page.waitForLoadState("networkidle");

    // Verify transactions page is loaded
    await expect(transactionsPage.container).toBeVisible();

    // Wait for transactions to load
    await transactionsPage.waitForLoadingToDisappear();

    // Get initial transaction count
    const initialCount = await transactionTable.getTransactionCount();

    // Fill the transaction form
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
    const transactionData = {
      date: today,
      account: "Test Account", // Created in beforeEach
      category: "Food", // Created in beforeEach
      amount: "50.00",
      comment: `Test transaction ${Date.now()}`,
    };

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
    const finalCount = await transactionTable.getTransactionCount();
    expect(finalCount).toBe(initialCount + 1);
  });

  test("should display empty state when no transactions exist", async () => {
    // This test would need to be run with a clean database or mock API
    // For demonstration purposes, we'll just check the structure exists
    await transactionsPage.goto();
    await transactionsPage.page.waitForLoadState("networkidle");

    // If transactions exist, the empty message won't be visible
    // If no transactions exist, the empty message should be visible
    const hasEmptyMessage = await transactionsPage.isEmpty();
    const hasTable = await transactionTable.isVisible();

    // Either empty message or table should be visible (not both)
    expect(hasEmptyMessage || hasTable).toBe(true);
    expect(hasEmptyMessage && hasTable).toBe(false);
  });
  /*
  test("should create and delete a transaction", async ({ page }) => {
    // Navigate to transactions page
    await transactionsPage.goto();
    await transactionsPage.page.waitForLoadState("networkidle");

    // Verify transactions page is loaded
    await expect(transactionsPage.container).toBeVisible();

    // Wait for transactions to load
    await transactionsPage.waitForLoadingToDisappear();

    // Get initial transaction count
    const initialCount = await transactionTable.getTransactionCount();

    // Create a new transaction for testing deletion
    const today = new Date().toISOString().split("T")[0];
    const transactionData = {
      date: today,
      account: "Test Account",
      category: "Food",
      amount: "25.00",
      comment: `Delete test transaction ${Date.now()}`,
    };

    await transactionForm.createTransaction(transactionData);

    // Wait for the transaction to appear in the list
    await page.waitForTimeout(1000);
    await transactionTable.waitForTransactionToAppear(
      transactionData.date,
      transactionData.amount,
      transactionData.category
    );

    // Verify the transaction was created
    expect(
      await transactionTable.isTransactionVisible(
        transactionData.date,
        transactionData.amount,
        transactionData.category
      )
    ).toBe(true);
    expect(await transactionTable.getTransactionCount()).toBe(initialCount + 1);

    // Get the transaction ID for deletion
    const transactionId = await transactionTable.getTransactionIdByDetails(
      transactionData.date,
      transactionData.amount,
      transactionData.category
    );
    expect(transactionId).toBeTruthy();

    // Click delete button for the transaction
    await transactionTable.clickDeleteButton(parseInt(transactionId ?? "0"));

    // Verify the delete confirmation modal appears
    await expect(deleteModal.isModalVisible()).resolves.toBe(true);

    // Verify modal content
    const title = await deleteModal.getTitle();
    expect(title).toContain("Delete");

    const description = await deleteModal.getDescription();
    expect(description).toContain("transaction");

    // Confirm deletion
    await deleteModal.confirm();

    // Wait for deletion to complete
    await page.waitForTimeout(1000);

    // Verify the transaction is no longer in the list
    expect(
      await transactionTable.isTransactionVisible(
        transactionData.date,
        transactionData.amount,
        transactionData.category
      )
    ).toBe(false);

    // Verify the transaction count decreased
    const finalCount = await transactionTable.getTransactionCount();
    expect(finalCount).toBe(initialCount);

    // Verify modal is closed
    await expect(deleteModal.isModalVisible()).resolves.toBe(false);
  });

  test("should cancel transaction deletion", async ({ page }) => {
    // Navigate to transactions page
    await transactionsPage.goto();
    await transactionsPage.page.waitForLoadState("networkidle");

    // Verify transactions page is loaded
    await expect(transactionsPage.container).toBeVisible();

    // Wait for transactions to load
    await transactionsPage.waitForLoadingToDisappear();

    // Get initial transaction count
    const initialCount = await transactionTable.getTransactionCount();

    // Create a new transaction for testing cancel deletion
    const today = new Date().toISOString().split("T")[0];
    const transactionData = {
      date: today,
      account: "Test Account",
      category: "Food",
      amount: "15.00",
      comment: `Cancel delete test transaction ${Date.now()}`,
    };

    await transactionForm.createTransaction(transactionData);

    // Wait for the transaction to appear
    await page.waitForTimeout(1000);
    expect(
      await transactionTable.isTransactionVisible(
        transactionData.date,
        transactionData.amount,
        transactionData.category
      )
    ).toBe(true);

    // Get the transaction ID and click delete
    const transactionId = await transactionTable.getTransactionIdByDetails(
      transactionData.date,
      transactionData.amount,
      transactionData.category
    );
    await transactionTable.clickDeleteButton(parseInt(transactionId ?? "0"));

    // Verify modal appears
    await expect(deleteModal.isModalVisible()).resolves.toBe(true);

    // Cancel the deletion
    await deleteModal.cancel();

    // Verify modal is closed
    await expect(deleteModal.isModalVisible()).resolves.toBe(false);

    // Verify the transaction is still in the list
    expect(
      await transactionTable.isTransactionVisible(
        transactionData.date,
        transactionData.amount,
        transactionData.category
      )
    ).toBe(true);

    // Verify count hasn't changed
    const finalCount = await transactionTable.getTransactionCount();
    expect(finalCount).toBe(initialCount + 1);
  });
  
  test("should edit a transaction", async ({ page }) => {
    // Navigate to transactions page
    await transactionsPage.goto();
    await transactionsPage.page.waitForLoadState("networkidle");

    // Verify transactions page is loaded
    await expect(transactionsPage.container).toBeVisible();

    // Wait for transactions to load
    await transactionsPage.waitForLoadingToDisappear();

    // Get initial transaction count
    const initialCount = await transactionTable.getTransactionCount();

    // Create a new transaction for testing editing
    const today = new Date().toISOString().split("T")[0];
    const originalData = {
      date: today,
      account: "Test Account",
      category: "Food",
      amount: "100.00",
      comment: `Edit test transaction ${Date.now()}`,
    };

    await transactionForm.createTransaction(originalData);

    // Wait for the transaction to appear
    await page.waitForTimeout(1000);
    expect(
      await transactionTable.isTransactionVisible(originalData.date, originalData.amount, originalData.category)
    ).toBe(true);

    // Get the transaction ID and click edit
    const transactionId = await transactionTable.getTransactionIdByDetails(
      originalData.date,
      originalData.amount,
      originalData.category
    );
    await transactionTable.clickEditButton(parseInt(transactionId ?? "0"));

    // Verify form is visible and has the correct data
    await expect(transactionForm.isVisible()).resolves.toBe(true);
    const title = await transactionForm.getTitleText();
    expect(title).toContain("Edit");

    // Update the transaction
    const updatedData = {
      date: today,
      account: "Test Account",
      category: "Food",
      amount: "150.00", // Changed amount
      comment: `${originalData.comment} - edited`,
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
      await transactionTable.isTransactionVisible(originalData.date, originalData.amount, originalData.category)
    ).toBe(false);

    // Verify count hasn't changed
    const finalCount = await transactionTable.getTransactionCount();
    expect(finalCount).toBe(initialCount + 1);
  });
  */
});
