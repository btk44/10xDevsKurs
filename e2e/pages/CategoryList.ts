import type { Page, Locator } from "@playwright/test";

export class CategoryList {
  readonly page: Page;
  readonly loadingIndicator: Locator;
  readonly emptyMessage: Locator;
  readonly categoriesList: Locator;
  readonly categoriesTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loadingIndicator = page.getByTestId("categories-loading");
    this.emptyMessage = page.getByTestId("categories-empty");
    this.categoriesList = page.getByTestId("categories-list");
    this.categoriesTable = page.getByTestId("categories-table");
  }

  async isLoading(): Promise<boolean> {
    return await this.loadingIndicator.isVisible();
  }

  async isEmpty(): Promise<boolean> {
    return await this.emptyMessage.isVisible();
  }

  async isListVisible(): Promise<boolean> {
    return await this.categoriesList.isVisible();
  }

  async isTableVisible(): Promise<boolean> {
    return await this.categoriesTable.isVisible();
  }

  async getCategoryCount(): Promise<number> {
    const categoryRows = this.page.locator('[data-testid^="category-row-"]');
    return await categoryRows.count();
  }

  async getCategoryNames(): Promise<string[]> {
    const categoryNames = this.page.locator('[data-testid^="category-row-"] td:first-child span:not(.text-gray-400)');
    return await categoryNames.allTextContents();
  }

  async isCategoryVisible(categoryName: string): Promise<boolean> {
    const categoryCell = this.page.locator('[data-testid^="category-row-"] td:first-child span:not(.text-gray-400)', {
      hasText: categoryName,
    });
    return await categoryCell.isVisible();
  }

  async getCategoryByName(categoryName: string): Promise<Locator> {
    return this.page.locator('[data-testid^="category-row-"]', { hasText: categoryName });
  }

  async getCategoryIdByName(categoryName: string): Promise<string | null> {
    const categoryRow = await this.getCategoryByName(categoryName);
    const testId = await categoryRow.getAttribute("data-testid");
    return testId ? testId.replace("category-row-", "") : null;
  }

  async clickEditCategory(categoryId: number): Promise<void> {
    const editButton = this.page.getByTestId(`category-edit-button-${categoryId}`);
    await editButton.click();
  }

  async clickDeleteCategory(categoryId: number): Promise<void> {
    const deleteButton = this.page.getByTestId(`category-delete-button-${categoryId}`);
    await deleteButton.click();
  }

  async editCategoryByName(categoryName: string): Promise<void> {
    const categoryId = await this.getCategoryIdByName(categoryName);
    if (categoryId) {
      await this.clickEditCategory(parseInt(categoryId));
    }
  }

  async deleteCategoryByName(categoryName: string): Promise<void> {
    const categoryId = await this.getCategoryIdByName(categoryName);
    if (categoryId) {
      await this.clickDeleteCategory(parseInt(categoryId));
    }
  }

  async getCategoryTags(): Promise<string[]> {
    const tagElements = this.page.locator('[data-testid^="category-row-"] td:nth-child(2) span');
    return await tagElements.allTextContents();
  }

  async getCategoryTag(categoryName: string): Promise<string | null> {
    const categoryRow = await this.getCategoryByName(categoryName);
    const tagCell = categoryRow.locator("td:nth-child(2) span");
    return await tagCell.textContent();
  }
}
