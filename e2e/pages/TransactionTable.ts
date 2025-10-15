import type { Page, Locator } from "@playwright/test";

export class TransactionTable {
  readonly page: Page;
  readonly container: Locator;
  readonly table: Locator;
  readonly emptyState: Locator;
  readonly pagination: Locator;
  readonly dateHeader: Locator;
  readonly amountHeader: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("transaction-table");
    this.table = page.getByTestId("transaction-table-element");
    this.emptyState = page.getByTestId("transaction-table-empty");
    this.pagination = page.getByTestId("transaction-table-pagination");
    this.dateHeader = page.getByTestId("sort-date-header");
    this.amountHeader = page.getByTestId("sort-amount-header");
  }

  async getTransactionRow(transactionId: number): Promise<Locator> {
    return this.page.getByTestId(`transaction-row-${transactionId}`);
  }

  async getAllTransactionRows(): Promise<Locator[]> {
    return await this.page.getByTestId(/^transaction-row-/).all();
  }

  async getTransactionCount(): Promise<number> {
    const rows = await this.getAllTransactionRows();
    return rows.length;
  }

  async clickDateHeader(): Promise<void> {
    await this.dateHeader.click();
  }

  async clickAmountHeader(): Promise<void> {
    await this.amountHeader.click();
  }

  async waitForTransactionRow(transactionId: number): Promise<void> {
    const row = await this.getTransactionRow(transactionId);
    await row.waitFor({ state: "visible" });
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

  async isPaginationVisible(): Promise<boolean> {
    return await this.pagination.isVisible();
  }

  async isDateHeaderVisible(): Promise<boolean> {
    return await this.dateHeader.isVisible();
  }

  async isAmountHeaderVisible(): Promise<boolean> {
    return await this.amountHeader.isVisible();
  }

  async getEmptyStateText(): Promise<string | null> {
    return await this.emptyState.textContent();
  }

  async getFirstTransactionText(): Promise<string | null> {
    const rows = await this.getAllTransactionRows();
    if (rows.length > 0) {
      return await rows[0].textContent();
    }
    return null;
  }

  async doubleClickTransactionRow(transactionId: number): Promise<void> {
    const row = await this.getTransactionRow(transactionId);
    await row.dblclick();
  }

  async getTransactionCellValue(transactionId: number, cellIndex: number): Promise<string | null> {
    const row = await this.getTransactionRow(transactionId);
    const cells = row.locator("td");
    const cell = cells.nth(cellIndex);
    return await cell.textContent();
  }

  async getTransactionDate(transactionId: number): Promise<string | null> {
    return await this.getTransactionCellValue(transactionId, 0);
  }

  async getTransactionAccount(transactionId: number): Promise<string | null> {
    return await this.getTransactionCellValue(transactionId, 1);
  }

  async getTransactionCategory(transactionId: number): Promise<string | null> {
    return await this.getTransactionCellValue(transactionId, 2);
  }

  async getTransactionAmount(transactionId: number): Promise<string | null> {
    return await this.getTransactionCellValue(transactionId, 3);
  }

  async getTransactionCurrency(transactionId: number): Promise<string | null> {
    return await this.getTransactionCellValue(transactionId, 4);
  }

  async getTransactionComment(transactionId: number): Promise<string | null> {
    return await this.getTransactionCellValue(transactionId, 5);
  }
}
