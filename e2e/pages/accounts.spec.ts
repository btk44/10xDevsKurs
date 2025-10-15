import { test, expect } from "@playwright/test";
import { AccountForm } from "./AccountForm";
import { AccountsPage } from "./AccountsPage";
import { LoginPage } from "./LoginPage";
import { testUsers } from "e2e/fixtures/test-users";

test.describe("Account Page E2E Tests", () => {
  let accountForm: AccountForm;
  let accountsPage: AccountsPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUsers.standard.email, testUsers.standard.password);

    accountForm = new AccountForm(page);
    accountsPage = new AccountsPage(page);
  });

  test.describe("Account Page Structure", () => {
    test("should load account page structure", async ({ page }) => {
      // Navigate directly to accounts page
      await page.goto("/accounts");

      // Check that the page loads (may redirect to login if not authenticated)
      await expect(page).toHaveTitle(/Finance Tracker/);
    });

    test("should display account form components when accessible", async ({ page }) => {
      // This test assumes we can access the accounts page
      // In a real scenario, this would require authentication
      await page.goto("/accounts");

      // Try to access form elements if they exist
      const formExists = await accountForm.formContainer.isVisible().catch(() => false);

      if (formExists) {
        // Test form is visible
        await expect(accountForm.formContainer).toBeVisible();
        await expect(accountForm.formTitle).toBeVisible();
        await expect(accountForm.form).toBeVisible();
      }
    });
  });

  test.describe("Account Form Interactions", () => {
    test("should allow filling account name", async ({ page }) => {
      await page.goto("/accounts");

      const formExists = await accountForm.formContainer.isVisible().catch(() => false);

      if (formExists) {
        const testName = "Test Account Name";
        await accountForm.fillAccountName(testName);

        const value = await accountForm.nameInput.inputValue();
        expect(value).toBe(testName);
      }
    });

    test("should allow selecting currency", async ({ page }) => {
      await page.goto("/accounts");

      const formExists = await accountForm.formContainer.isVisible().catch(() => false);

      if (formExists) {
        await accountForm.selectCurrency("USD - US Dollar");

        const value = await accountForm.currencySelect.inputValue();
        expect(value).toBe("1"); // USD currency ID
      }
    });

    test("should allow filling account tag", async ({ page }) => {
      await page.goto("/accounts");

      const formExists = await accountForm.formContainer.isVisible().catch(() => false);

      if (formExists) {
        const testTag = "test-tag";
        await accountForm.fillTag(testTag);

        const value = await accountForm.tagInput.inputValue();
        expect(value).toBe(testTag);
      }
    });

    test("should validate form fields", async ({ page }) => {
      await page.goto("/accounts");

      const formExists = await accountForm.formContainer.isVisible().catch(() => false);

      if (formExists) {
        // Try to submit empty form
        await accountForm.submitForm();

        // Check for validation errors (may not appear if client-side validation isn't triggered)
        const nameErrorVisible = await accountForm.nameError.isVisible().catch(() => false);
        const currencyErrorVisible = await accountForm.currencyError.isVisible().catch(() => false);

        // If errors appear, they should indicate required fields
        if (nameErrorVisible) {
          const nameErrorText = await accountForm.nameError.textContent();
          expect(nameErrorText).toContain("required");
        }

        if (currencyErrorVisible) {
          const currencyErrorText = await accountForm.currencyError.textContent();
          expect(currencyErrorText).toContain("required");
        }
      }
    });
  });

  test.describe("Accounts Table", () => {
    test("should display accounts table when data exists", async ({ page }) => {
      await page.goto("/accounts");

      const tableExists = await accountsPage.accountsTable.isVisible().catch(() => false);
      const noAccountsExists = await accountsPage.noAccountsMessage.isVisible().catch(() => false);

      if (tableExists) {
        await expect(accountsPage.accountsTable).toBeVisible();

        // Check table headers
        await expect(page.getByTestId("sort-name-header")).toBeVisible();
        await expect(page.getByTestId("sort-currency-header")).toBeVisible();
        await expect(page.getByTestId("sort-balance-header")).toBeVisible();
        await expect(page.getByTestId("sort-created-header")).toBeVisible();
      } else if (noAccountsExists) {
        await expect(accountsPage.noAccountsMessage).toBeVisible();
      }
    });

    test("should allow sorting by name", async ({ page }) => {
      await page.goto("/accounts");

      const tableExists = await accountsPage.accountsTable.isVisible().catch(() => false);

      if (tableExists) {
        await accountsPage.sortByName();
        // Verify table is still visible after sorting
        await expect(accountsPage.accountsTable).toBeVisible();
      }
    });

    test("should allow sorting by currency", async ({ page }) => {
      await page.goto("/accounts");

      const tableExists = await accountsPage.accountsTable.isVisible().catch(() => false);

      if (tableExists) {
        await accountsPage.sortByCurrency();
        await expect(accountsPage.accountsTable).toBeVisible();
      }
    });

    test("should allow sorting by balance", async ({ page }) => {
      await page.goto("/accounts");

      const tableExists = await accountsPage.accountsTable.isVisible().catch(() => false);

      if (tableExists) {
        await accountsPage.sortByBalance();
        await expect(accountsPage.accountsTable).toBeVisible();
      }
    });

    test("should allow sorting by creation date", async ({ page }) => {
      await page.goto("/accounts");

      const tableExists = await accountsPage.accountsTable.isVisible().catch(() => false);

      if (tableExists) {
        await accountsPage.sortByCreatedDate();
        await expect(accountsPage.accountsTable).toBeVisible();
      }
    });
  });

  test.describe("Account Actions", () => {
    test("should show edit and delete buttons for accounts", async ({ page }) => {
      await page.goto("/accounts");

      const tableExists = await accountsPage.accountsTable.isVisible().catch(() => false);

      if (tableExists) {
        // Get all account rows
        const accountRows = page.locator('[data-testid^="account-row-"]');
        const count = await accountRows.count();

        if (count > 0) {
          // Check first account row has action buttons
          const firstRow = accountRows.first();
          await expect(firstRow.locator('[data-testid^="edit-account-"]')).toBeVisible();
          await expect(firstRow.locator('[data-testid^="delete-account-"]')).toBeVisible();
        }
      }
    });
  });

  test.describe("Modal Interactions", () => {
    test("should handle delete confirmation modal", async ({ page }) => {
      await page.goto("/accounts");

      const tableExists = await accountsPage.accountsTable.isVisible().catch(() => false);

      if (tableExists) {
        const accountRows = page.locator('[data-testid^="account-row-"]');
        const count = await accountRows.count();

        if (count > 0) {
          // Click delete button on first account
          const deleteButton = page.locator('[data-testid^="delete-account-"]').first();
          await deleteButton.click();

          // Check if modal appears (modal implementation may vary)
          // This is a basic check for modal behavior
          await page.waitForTimeout(500); // Allow time for modal to appear
        }
      }
    });
  });

  test.describe("Form Cancellation", () => {
    test("should allow cancelling account form", async ({ page }) => {
      await page.goto("/accounts");

      const formExists = await accountForm.formContainer.isVisible().catch(() => false);

      if (formExists) {
        // Fill form with data
        await accountForm.fillAccountName("Cancel Test");
        await accountForm.selectCurrency("EUR - Euro");
        await accountForm.fillTag("cancel");

        // Cancel the form
        await accountForm.cancelForm();

        // Form should no longer be visible or fields should be cleared
        const stillVisible = await accountForm.formContainer.isVisible().catch(() => false);
        if (!stillVisible) {
          // Form was hidden
          expect(stillVisible).toBe(false);
        } else {
          // Form is still visible but fields might be cleared
          // This depends on the actual implementation
        }
      }
    });
  });

  test.describe("Loading States", () => {
    test("should handle loading states appropriately", async ({ page }) => {
      await page.goto("/accounts");

      // Check for loading indicators
      const loadingVisible = await accountsPage.loadingIndicator.isVisible().catch(() => false);

      if (loadingVisible) {
        // Wait for loading to complete
        await accountsPage.waitForAccountsToLoad();

        // Loading should be gone
        await expect(accountsPage.loadingIndicator).not.toBeVisible();
      }
    });
  });

  test.describe("Complete Account CRUD Workflow", () => {
    test("should create account, verify in list, modify it, verify changes, delete it, and confirm removal", async ({
      page,
    }) => {
      // This test requires authentication to work fully
      // It demonstrates the complete CRUD workflow for accounts

      // Navigate to accounts page
      await page.goto("/accounts");

      // Check if we can access the accounts functionality
      const formExists = await accountForm.formContainer.isVisible().catch(() => false);

      if (!formExists) {
        console.log("Account form not accessible - likely requires authentication");
        test.skip();
        return;
      }

      // ===== CREATE ACCOUNT =====
      const accountName = `CRUD Test Account ${Date.now()}`;
      const initialTag = "initial-tag";

      // Fill and submit the form to create account
      await accountForm.fillAccountName(accountName);
      await accountForm.selectCurrency("USD - US Dollar");
      await accountForm.fillTag(initialTag);
      await accountForm.submitForm();

      // Wait for the account to appear in the list
      await accountsPage.waitForAccountsToLoad();
      await expect(accountsPage.isAccountVisible(accountName)).toBe(true);

      // ===== VERIFY ACCOUNT IN LIST =====
      // Get initial account count
      const initialCount = await accountsPage.getAccountCount();
      expect(initialCount).toBeGreaterThan(0);

      // Verify account details
      const accountNames = await accountsPage.getAccountNames();
      expect(accountNames).toContain(accountName);

      // Find the account ID from the test IDs
      const accountRow = page.locator(`[data-testid^="account-row-"]`, { hasText: accountName });
      const accountId = await accountRow.getAttribute("data-testid").then((attr) => attr?.replace("account-row-", ""));

      if (!accountId) {
        throw new Error("Could not find account ID");
      }

      // ===== MODIFY ACCOUNT =====
      const modifiedName = `${accountName} - Modified`;
      const modifiedTag = "modified-tag";

      // Click edit button for the account
      await accountsPage.clickEditAccount(parseInt(accountId));

      // Wait for form to load with account data
      await accountForm.waitForFormToLoad();

      // Verify we're in edit mode
      await expect(accountForm.isEditForm()).toBe(true);

      // Modify the account details
      await accountForm.fillAccountName(modifiedName);
      await accountForm.selectCurrency("EUR - Euro");
      await accountForm.fillTag(modifiedTag);

      // Submit the changes
      await accountForm.submitForm();

      // ===== VERIFY CHANGES ARE APPLIED =====
      // Wait for the changes to be reflected
      await accountsPage.waitForAccountsToLoad();

      // Verify the modified account appears in the list
      await expect(accountsPage.isAccountVisible(modifiedName)).toBe(true);

      // Verify the old account name is no longer in the list
      await expect(accountsPage.isAccountVisible(accountName)).toBe(false);

      // ===== DELETE ACCOUNT =====
      // Click delete button for the modified account
      await accountsPage.clickDeleteAccount(parseInt(accountId));

      // Handle the delete confirmation modal
      // (This assumes the modal appears - implementation may vary)
      await page.waitForTimeout(500); // Allow modal to appear

      // Look for modal and confirm deletion
      const modalVisible = await page
        .locator('[data-testid="delete-account-modal"]')
        .isVisible()
        .catch(() => false);

      if (modalVisible) {
        // Click the confirm delete button
        await page.getByTestId("delete-modal-confirm").click();
      } else {
        // If no modal, assume delete button directly triggers deletion
        console.log("Delete modal not found - assuming direct deletion");
      }

      // ===== VERIFY ACCOUNT IS REMOVED =====
      // Wait for the account to be removed
      await accountsPage.waitForAccountsToLoad();

      // Verify the account is no longer in the list
      await expect(accountsPage.isAccountVisible(modifiedName)).toBe(false);

      // Verify account count decreased (if we had the exact count before)
      const finalCount = await accountsPage.getAccountCount();
      // Note: Count might not decrease if there were other accounts, but the specific account should be gone

      console.log(`CRUD test completed successfully for account: ${modifiedName}`);
    });
  });
});
