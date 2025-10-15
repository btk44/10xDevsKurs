import type { Page, Locator } from "@playwright/test";

export class TransactionsPage {
  readonly page: Page;
  readonly container: Locator;
  readonly filterButton: Locator;
  readonly loadingState: Locator;
  readonly emptyState: Locator;
  readonly clearFiltersButton: Locator;
  readonly errorState: Locator;
  readonly retryButton: Locator;
  readonly contentGrid: Locator;
  readonly leftColumn: Locator;
  readonly rightColumn: Locator;
  readonly formContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("transactions-page");
    this.filterButton = page.getByTestId("filter-button");
    this.loadingState = page.getByTestId("transactions-loading");
    this.emptyState = page.getByTestId("transactions-empty-state");
    this.clearFiltersButton = page.getByTestId("clear-filters-button");
    this.errorState = page.getByTestId("transactions-error");
    this.retryButton = page.getByTestId("transactions-retry-button");
    this.contentGrid = page.getByTestId("transactions-content");
    this.leftColumn = page.getByTestId("transactions-left-column");
    this.rightColumn = page.getByTestId("transactions-right-column");
    this.formContainer = page.getByTestId("transactions-form-container");
  }

  async goto(): Promise<void> {
    await this.page.goto("/");
  }

  async clickFilterButton(): Promise<void> {
    await this.filterButton.click();
  }

  async clickClearFilters(): Promise<void> {
    await this.clearFiltersButton.click();
  }

  async clickRetry(): Promise<void> {
    await this.retryButton.click();
  }

  async isPageVisible(): Promise<boolean> {
    return await this.container.isVisible();
  }

  async isLoading(): Promise<boolean> {
    return await this.loadingState.isVisible();
  }

  async isEmpty(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  async isError(): Promise<boolean> {
    return await this.errorState.isVisible();
  }

  async isContentVisible(): Promise<boolean> {
    return await this.contentGrid.isVisible();
  }

  async isLeftColumnVisible(): Promise<boolean> {
    return await this.leftColumn.isVisible();
  }

  async isRightColumnVisible(): Promise<boolean> {
    return await this.rightColumn.isVisible();
  }

  async isFormContainerVisible(): Promise<boolean> {
    return await this.formContainer.isVisible();
  }

  async waitForContent(): Promise<void> {
    await this.contentGrid.waitFor({ state: "visible" });
  }

  async waitForLoadingToDisappear(): Promise<void> {
    await this.loadingState.waitFor({ state: "hidden" });
  }
}
