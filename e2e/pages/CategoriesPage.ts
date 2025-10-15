import type { Page, Locator } from "@playwright/test";

export class CategoriesPage {
  readonly page: Page;
  readonly pageContainer: Locator;
  readonly categoriesTabs: Locator;
  readonly incomeTab: Locator;
  readonly expenseTab: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId("categories-page");
    this.categoriesTabs = page.getByTestId("categories-tabs");
    this.incomeTab = page.getByTestId("categories-income-tab");
    this.expenseTab = page.getByTestId("categories-expense-tab");
  }

  async goto(): Promise<void> {
    await this.page.goto("/categories");
  }

  async isPageVisible(): Promise<boolean> {
    return await this.pageContainer.isVisible();
  }

  async isIncomeTabActive(): Promise<boolean> {
    return (await this.incomeTab.getAttribute("data-state")) === "active";
  }

  async isExpenseTabActive(): Promise<boolean> {
    return (await this.expenseTab.getAttribute("data-state")) === "active";
  }

  async switchToIncomeTab(): Promise<void> {
    await this.incomeTab.click();
  }

  async switchToExpenseTab(): Promise<void> {
    await this.expenseTab.click();
  }

  async waitForCategoriesToLoad(): Promise<void> {
    await this.page.waitForTimeout(1000); // Wait for categories to load
  }
}
