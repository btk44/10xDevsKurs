import type { Page, Locator } from "@playwright/test";

export class TransactionForm {
  readonly page: Page;
  readonly container: Locator;
  readonly form: Locator;
  readonly title: Locator;
  readonly dateInput: Locator;
  readonly accountSelect: Locator;
  readonly categorySelect: Locator;
  readonly amountInput: Locator;
  readonly commentInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly deleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("transaction-form");
    this.form = page.getByTestId("transaction-form-element");
    this.title = page.getByTestId("transaction-form-title");
    this.dateInput = page.getByTestId("transaction-date-input");
    this.accountSelect = page.getByTestId("transaction-account-select");
    this.categorySelect = page.getByTestId("transaction-category-select");
    this.amountInput = page.getByTestId("transaction-amount-input");
    this.commentInput = page.getByTestId("transaction-comment-input");
    this.submitButton = page.getByTestId("transaction-submit-button");
    this.cancelButton = page.getByTestId("transaction-cancel-button");
    this.deleteButton = page.getByTestId("transaction-delete-button");
  }

  async fillDate(date: string): Promise<void> {
    await this.dateInput.fill(date);
  }

  async selectAccount(accountName: string): Promise<void> {
    await this.accountSelect.selectOption({ label: accountName });
  }

  async selectCategory(categoryName: string): Promise<void> {
    await this.categorySelect.selectOption({ label: categoryName });
  }

  async fillAmount(amount: string): Promise<void> {
    await this.amountInput.fill(amount);
  }

  async fillComment(comment: string): Promise<void> {
    await this.commentInput.fill(comment);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async delete(): Promise<void> {
    await this.deleteButton.click();
  }

  async fillForm(data: {
    date: string;
    account: string;
    category: string;
    amount: string;
    comment?: string;
  }): Promise<void> {
    await this.fillDate(data.date);
    await this.selectAccount(data.account);
    await this.selectCategory(data.category);
    await this.fillAmount(data.amount);
    if (data.comment) {
      await this.fillComment(data.comment);
    }
  }

  async createTransaction(data: {
    date: string;
    account: string;
    category: string;
    amount: string;
    comment?: string;
  }): Promise<void> {
    await this.fillForm(data);
    await this.submit();
  }

  async isVisible(): Promise<boolean> {
    return await this.container.isVisible();
  }

  async isFormVisible(): Promise<boolean> {
    return await this.form.isVisible();
  }

  async isTitleVisible(): Promise<boolean> {
    return await this.title.isVisible();
  }

  async isDateInputVisible(): Promise<boolean> {
    return await this.dateInput.isVisible();
  }

  async isAccountSelectVisible(): Promise<boolean> {
    return await this.accountSelect.isVisible();
  }

  async isCategorySelectVisible(): Promise<boolean> {
    return await this.categorySelect.isVisible();
  }

  async isAmountInputVisible(): Promise<boolean> {
    return await this.amountInput.isVisible();
  }

  async isCommentInputVisible(): Promise<boolean> {
    return await this.commentInput.isVisible();
  }

  async isSubmitButtonVisible(): Promise<boolean> {
    return await this.submitButton.isVisible();
  }

  async isCancelButtonVisible(): Promise<boolean> {
    return await this.cancelButton.isVisible();
  }

  async isDeleteButtonVisible(): Promise<boolean> {
    return await this.deleteButton.isVisible();
  }

  async getTitleText(): Promise<string | null> {
    return await this.title.textContent();
  }

  async getSubmitButtonText(): Promise<string | null> {
    return await this.submitButton.textContent();
  }
}
