import type { Page, Locator } from "@playwright/test";

export class FilterModal {
  readonly page: Page;
  readonly modal: Locator;
  readonly title: Locator;
  readonly dateFromInput: Locator;
  readonly dateToInput: Locator;
  readonly accountSelect: Locator;
  readonly categorySelect: Locator;
  readonly searchInput: Locator;
  readonly resetButton: Locator;
  readonly cancelButton: Locator;
  readonly applyButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.getByTestId("filter-modal");
    this.title = page.getByTestId("filter-modal-title");
    this.dateFromInput = page.getByTestId("filter-date-from-input");
    this.dateToInput = page.getByTestId("filter-date-to-input");
    this.accountSelect = page.getByTestId("filter-account-select");
    this.categorySelect = page.getByTestId("filter-category-select");
    this.searchInput = page.getByTestId("filter-search-input");
    this.resetButton = page.getByTestId("filter-reset-button");
    this.cancelButton = page.getByTestId("filter-cancel-button");
    this.applyButton = page.getByTestId("filter-apply-button");
  }

  async fillDateFrom(date: string): Promise<void> {
    await this.dateFromInput.fill(date);
  }

  async fillDateTo(date: string): Promise<void> {
    await this.dateToInput.fill(date);
  }

  async selectAccount(accountName: string): Promise<void> {
    await this.accountSelect.selectOption({ label: accountName });
  }

  async selectCategory(categoryName: string): Promise<void> {
    await this.categorySelect.selectOption({ label: categoryName });
  }

  async fillSearch(search: string): Promise<void> {
    await this.searchInput.fill(search);
  }

  async applyFilters(): Promise<void> {
    await this.applyButton.click();
  }

  async cancelFilters(): Promise<void> {
    await this.cancelButton.click();
  }

  async resetFilters(): Promise<void> {
    await this.resetButton.click();
  }

  async setFilters(filters: {
    dateFrom?: string;
    dateTo?: string;
    account?: string;
    category?: string;
    search?: string;
  }): Promise<void> {
    if (filters.dateFrom) {
      await this.fillDateFrom(filters.dateFrom);
    }
    if (filters.dateTo) {
      await this.fillDateTo(filters.dateTo);
    }
    if (filters.account) {
      await this.selectAccount(filters.account);
    }
    if (filters.category) {
      await this.selectCategory(filters.category);
    }
    if (filters.search) {
      await this.fillSearch(filters.search);
    }
  }

  async applyFiltersWithData(filters: {
    dateFrom?: string;
    dateTo?: string;
    account?: string;
    category?: string;
    search?: string;
  }): Promise<void> {
    await this.setFilters(filters);
    await this.applyFilters();
  }

  async isVisible(): Promise<boolean> {
    return await this.modal.isVisible();
  }

  async isTitleVisible(): Promise<boolean> {
    return await this.title.isVisible();
  }

  async isDateFromInputVisible(): Promise<boolean> {
    return await this.dateFromInput.isVisible();
  }

  async isDateToInputVisible(): Promise<boolean> {
    return await this.dateToInput.isVisible();
  }

  async isAccountSelectVisible(): Promise<boolean> {
    return await this.accountSelect.isVisible();
  }

  async isCategorySelectVisible(): Promise<boolean> {
    return await this.categorySelect.isVisible();
  }

  async isSearchInputVisible(): Promise<boolean> {
    return await this.searchInput.isVisible();
  }

  async isResetButtonVisible(): Promise<boolean> {
    return await this.resetButton.isVisible();
  }

  async isCancelButtonVisible(): Promise<boolean> {
    return await this.cancelButton.isVisible();
  }

  async isApplyButtonVisible(): Promise<boolean> {
    return await this.applyButton.isVisible();
  }

  async getTitleText(): Promise<string | null> {
    return await this.title.textContent();
  }

  async getApplyButtonText(): Promise<string | null> {
    return await this.applyButton.textContent();
  }

  async getResetButtonText(): Promise<string | null> {
    return await this.resetButton.textContent();
  }

  async getCancelButtonText(): Promise<string | null> {
    return await this.cancelButton.textContent();
  }
}
