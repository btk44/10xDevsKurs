import type { Page, Locator } from "@playwright/test";

export class AccountsPage {
  readonly page: Page;
  readonly pageContainer: Locator;
  readonly pageTitle: Locator;
  readonly loadingIndicator: Locator;
  readonly accountsTable: Locator;
  readonly noAccountsMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId("accounts-page");
    this.pageTitle = page.getByTestId("accounts-page-title");
    this.loadingIndicator = page.getByTestId("accounts-loading");
    this.accountsTable = page.getByTestId("accounts-table");
    this.noAccountsMessage = page.getByTestId("no-accounts-message");
  }

  async goto(): Promise<void> {
    await this.page.goto("/accounts");
  }

  async isPageVisible(): Promise<boolean> {
    return this.pageContainer.isVisible();
  }

  async isLoading(): Promise<boolean> {
    return this.loadingIndicator.isVisible();
  }

  async isAccountsTableVisible(): Promise<boolean> {
    return this.accountsTable.isVisible();
  }

  async isNoAccountsMessageVisible(): Promise<boolean> {
    return this.noAccountsMessage.isVisible();
  }

  async getPageTitle(): Promise<string | null> {
    return await this.pageTitle.textContent();
  }

  async getAccountCount(): Promise<number> {
    const accountRows = this.page.locator('[data-testid^="account-row-"]');
    return await accountRows.count();
  }

  async getAccountNames(): Promise<string[]> {
    const accountNames = this.page.locator('[data-testid^="account-name-"]');
    return await accountNames.allTextContents();
  }

  async isAccountVisible(accountName: string): Promise<boolean> {
    const accountCell = this.page.locator(`[data-testid^="account-name-"]`, { hasText: accountName });
    return await accountCell.isVisible();
  }

  async clickEditAccount(accountId: number): Promise<void> {
    const editButton = this.page.getByTestId(`edit-account-${accountId}`);
    await editButton.click();
  }

  async clickDeleteAccount(accountId: number): Promise<void> {
    const deleteButton = this.page.getByTestId(`delete-account-${accountId}`);
    await deleteButton.click();
  }

  async getAccountBalance(accountId: number): Promise<string | null> {
    const balanceCell = this.page.getByTestId(`account-balance-${accountId}`);
    return await balanceCell.textContent();
  }

  async getAccountCurrency(accountId: number): Promise<string | null> {
    const currencyCell = this.page.getByTestId(`account-currency-${accountId}`);
    return await currencyCell.textContent();
  }

  async sortByName(): Promise<void> {
    const nameHeader = this.page.getByTestId("sort-name-header");
    await nameHeader.click();
  }

  async sortByCurrency(): Promise<void> {
    const currencyHeader = this.page.getByTestId("sort-currency-header");
    await currencyHeader.click();
  }

  async sortByBalance(): Promise<void> {
    const balanceHeader = this.page.getByTestId("sort-balance-header");
    await balanceHeader.click();
  }

  async sortByCreatedDate(): Promise<void> {
    const createdHeader = this.page.getByTestId("sort-created-header");
    await createdHeader.click();
  }

  async waitForAccountsToLoad(): Promise<void> {
    await this.page.waitForTimeout(1000); // Wait for accounts to load
    // Alternative: await this.page.waitForFunction(() => !document.querySelector('[data-testid="accounts-loading"]'));
  }
}
