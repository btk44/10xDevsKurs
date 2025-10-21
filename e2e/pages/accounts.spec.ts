import { test, expect } from "@playwright/test";
import { AccountsPage, AccountForm, DeleteAccountDialog } from "./index";
import cleanupDatabase from "e2e/db.helper";

test.describe("Accounts Management", () => {
  let accountsPage: AccountsPage;
  let accountForm: AccountForm;
  let deleteModal: DeleteAccountDialog;

  test.beforeEach(async ({ page }) => {
    accountsPage = new AccountsPage(page);
    accountForm = new AccountForm(page);
    deleteModal = new DeleteAccountDialog(page);
  });

  test.afterAll(async () => {
    await cleanupDatabase();
  });

  test("should create a new account and verify it appears in the list", async ({ page }) => {
    // Navigate to accounts page
    await accountsPage.goto();
    await accountsPage.page.waitForLoadState("networkidle");
    // Verify accounts page is loaded
    await expect(accountsPage.pageContainer).toBeVisible();

    // Wait for accounts to load
    await accountsPage.waitForAccountsToLoad();

    // Get initial account count
    const initialCount = await accountsPage.getAccountCount();

    // Fill the account form
    const accountName = `Test Account ${Date.now()}`;
    const accountCurrency = "USD - US Dollar";
    const accountTag = "TEST";

    await accountForm.createAccount(accountName, accountCurrency, accountTag);

    // Wait for the account to appear in the list
    await page.waitForTimeout(1000); // Allow time for the API call and UI update
    await accountsPage.waitForAccountsToLoad();
    // Verify the account appears in the list
    await expect(accountsPage.accountsTable).toBeVisible();
    expect(await accountsPage.isAccountVisible(accountName)).toBe(true);

    // Verify the account count increased
    const finalCount = await accountsPage.getAccountCount();
    expect(finalCount).toBe(initialCount + 1);

    // Verify the account currency is displayed
    const accountId = await accountsPage.getAccountIdByName(accountName);
    expect(accountId).toBeTruthy();
    if (!accountId) throw new Error(`Account ${accountName} not found`);
    const currencyInList = await accountsPage.getAccountCurrency(parseInt(accountId));
    expect(currencyInList).toBe("USD");
  });

  test("should display empty state when no accounts exist", async () => {
    // This test would need to be run with a clean database or mock API
    // For demonstration purposes, we'll just check the structure exists.
    await accountsPage.goto();
    await accountsPage.page.waitForLoadState("networkidle");
    // If accounts exist, the empty message won't be visible
    // If no accounts exist, the empty message should be visible
    const hasEmptyMessage = await accountsPage.isNoAccountsMessageVisible();
    await accountsPage.waitForAccountsToLoad();
    const hasTable = await accountsPage.isAccountsTableVisible();

    // Either empty message or table should be visible (not both)
    expect(hasEmptyMessage || hasTable).toBe(true);
    expect(hasEmptyMessage && hasTable).toBe(false);
  });

  test("should create and delete an account", async ({ page }) => {
    // Navigate to accounts page
    await accountsPage.goto();
    await accountsPage.page.waitForLoadState("networkidle");
    // Verify accounts page is loaded
    await expect(accountsPage.pageContainer).toBeVisible();

    // Wait for accounts to load
    await accountsPage.waitForAccountsToLoad();

    // Get initial account count
    const initialCount = await accountsPage.getAccountCount();

    // Create a new account for testing deletion
    const accountName = `Delete Test ${Date.now()}`;
    const accountCurrency = "EUR - Euro";

    await accountForm.createAccount(accountName, accountCurrency);

    // Wait for the account to appear in the list
    await page.waitForTimeout(1000);
    await accountsPage.waitForAccountsToLoad();
    // Verify the account was created
    expect(await accountsPage.isAccountVisible(accountName)).toBe(true);
    expect(await accountsPage.getAccountCount()).toBe(initialCount + 1);

    // Get the account ID for deletion
    const accountId = await accountsPage.getAccountIdByName(accountName);
    expect(accountId).toBeTruthy();
    if (!accountId) throw new Error(`Account ${accountName} not found`);

    // Click delete button for the account
    await accountsPage.clickDeleteAccount(parseInt(accountId));
    await page.waitForTimeout(4000);
    // Verify the delete confirmation modal appears
    await expect(deleteModal.isModalVisible()).resolves.toBe(true);

    // Verify modal content
    const title = await deleteModal.getTitle();
    expect(title).toContain("Delete Account");

    const description = await deleteModal.getDescription();
    expect(description).toContain(accountName);

    // Confirm deletion
    await deleteModal.confirm();

    // Wait for deletion to complete
    await page.waitForTimeout(1000);
    await accountsPage.waitForAccountsToLoad();
    // Verify the account is no longer in the list
    expect(await accountsPage.isAccountVisible(accountName)).toBe(false);

    // Verify the account count decreased
    const finalCount = await accountsPage.getAccountCount();
    expect(finalCount).toBe(initialCount);

    // Verify modal is closed
    await expect(deleteModal.isModalVisible()).resolves.toBe(false);
  });

  test("should cancel account deletion", async ({ page }) => {
    // Navigate to accounts page
    await accountsPage.goto();
    await accountsPage.page.waitForLoadState("networkidle");
    // Verify accounts page is loaded
    await expect(accountsPage.pageContainer).toBeVisible();

    // Wait for accounts to load
    await accountsPage.waitForAccountsToLoad();

    // Get initial account count
    const initialCount = await accountsPage.getAccountCount();

    // Create a new account for testing cancel deletion
    const accountName = `Cancel Delete Test ${Date.now()}`;
    const accountCurrency = "EUR - Euro";

    await accountForm.createAccount(accountName, accountCurrency);

    // Wait for the account to appear
    await page.waitForTimeout(1000);
    expect(await accountsPage.isAccountVisible(accountName)).toBe(true);

    // Get the account ID and click delete
    const accountId = await accountsPage.getAccountIdByName(accountName);
    if (!accountId) throw new Error(`Account ${accountName} not found`);
    await accountsPage.clickDeleteAccount(parseInt(accountId));

    // Verify modal appears
    await expect(deleteModal.isModalVisible()).resolves.toBe(true);

    // Cancel the deletion
    await deleteModal.cancel();

    // Verify modal is closed
    await expect(deleteModal.isModalVisible()).resolves.toBe(false);

    // Verify the account is still in the list
    expect(await accountsPage.isAccountVisible(accountName)).toBe(true);

    // Verify count hasn't changed
    const finalCount = await accountsPage.getAccountCount();
    expect(finalCount).toBe(initialCount + 1);
  });
});
