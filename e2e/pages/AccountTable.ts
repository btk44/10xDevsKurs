import type { Page, Locator } from "@playwright/test";

export class AccountTable {
  readonly page: Page;
  readonly container: Locator;
  readonly table: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("account-table");
    this.table = page.getByTestId("account-table-element");
    this.emptyState = page.getByTestId("account-table-empty");
  }

  async getAccountRow(accountId: number): Promise<Locator> {
    return this.page.getByTestId(`account-row-${accountId}`);
  }

  async getTotalRow(currencyCode: string): Promise<Locator> {
    return this.page.getByTestId(`account-total-${currencyCode}`);
  }

  async getAllAccountRows(): Promise<Locator[]> {
    return await this.page.getByTestId(/^account-row-/).all();
  }

  async getAllTotalRows(): Promise<Locator[]> {
    return await this.page.getByTestId(/^account-total-/).all();
  }

  async getAccountCount(): Promise<number> {
    const rows = await this.getAllAccountRows();
    return rows.length;
  }

  async isVisible(): Promise<boolean> {
    return await this.container.isVisible();
  }

  async isTableVisible(): Promise<boolean> {
    return await this.table.isVisible();
  }

  async isEmpty(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  async getEmptyStateText(): Promise<string | null> {
    return await this.emptyState.textContent();
  }

  async getAccountCellValue(accountId: number, cellIndex: number): Promise<string | null> {
    const row = await this.getAccountRow(accountId);
    const cells = row.locator("td");
    const cell = cells.nth(cellIndex);
    return await cell.textContent();
  }

  async getAccountName(accountId: number): Promise<string | null> {
    return await this.getAccountCellValue(accountId, 0);
  }

  async getAccountBalance(accountId: number): Promise<string | null> {
    return await this.getAccountCellValue(accountId, 1);
  }

  async getAccountCurrency(accountId: number): Promise<string | null> {
    return await this.getAccountCellValue(accountId, 2);
  }

  async getTotalCellValue(currencyCode: string, cellIndex: number): Promise<string | null> {
    const row = await this.getTotalRow(currencyCode);
    const cells = row.locator("td");
    const cell = cells.nth(cellIndex);
    return await cell.textContent();
  }

  async getTotalBalance(currencyCode: string): Promise<string | null> {
    return await this.getTotalCellValue(currencyCode, 1);
  }

  async getTotalCurrency(currencyCode: string): Promise<string | null> {
    return await this.getTotalCellValue(currencyCode, 2);
  }

  async verifyAccountExists(accountId: number, expectedName: string): Promise<boolean> {
    const name = await this.getAccountName(accountId);
    return name === expectedName;
  }

  async verifyAccountBalance(accountId: number, expectedBalance: string): Promise<boolean> {
    const balance = await this.getAccountBalance(accountId);
    return balance === expectedBalance;
  }

  async verifyTotalBalance(currencyCode: string, expectedTotal: string): Promise<boolean> {
    const total = await this.getTotalBalance(currencyCode);
    return total === expectedTotal;
  }
}
