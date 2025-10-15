import type { Page, Locator } from "@playwright/test";

export class CategoryRow {
  readonly page: Page;
  readonly row: Locator;
  readonly nameCell: Locator;
  readonly tagCell: Locator;
  readonly actionsCell: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;

  constructor(page: Page, categoryId: number) {
    this.page = page;
    this.row = page.getByTestId(`category-row-${categoryId}`);
    this.nameCell = this.row.locator("td:first-child");
    this.tagCell = this.row.locator("td:nth-child(2)");
    this.actionsCell = this.row.locator("td:nth-child(3)");
    this.editButton = page.getByTestId(`category-edit-button-${categoryId}`);
    this.deleteButton = page.getByTestId(`category-delete-button-${categoryId}`);
  }

  async isVisible(): Promise<boolean> {
    return await this.row.isVisible();
  }

  async getCategoryName(): Promise<string | null> {
    const nameSpan = this.nameCell.locator("span:not(.text-gray-400)");
    return await nameSpan.textContent();
  }

  async getCategoryTag(): Promise<string | null> {
    const tagSpan = this.tagCell.locator("span");
    return await tagSpan.textContent();
  }

  async clickEdit(): Promise<void> {
    await this.editButton.click();
  }

  async clickDelete(): Promise<void> {
    await this.deleteButton.click();
  }

  async isEditButtonVisible(): Promise<boolean> {
    return await this.editButton.isVisible();
  }

  async isDeleteButtonVisible(): Promise<boolean> {
    return await this.deleteButton.isVisible();
  }

  async hasChildren(): Promise<boolean> {
    // Check if the row has indentation (indicating it's a child category)
    const indentElement = this.nameCell.locator("svg");
    return await indentElement.isVisible();
  }

  async getIndentationLevel(): Promise<number> {
    const indentElements = this.nameCell.locator("svg");
    const count = await indentElements.count();
    return count;
  }
}
