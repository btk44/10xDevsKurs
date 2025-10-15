import type { Page, Locator } from "@playwright/test";

export class CategoryForm {
  readonly page: Page;
  readonly formContainer: Locator;
  readonly form: Locator;
  readonly nameInput: Locator;
  readonly tagInput: Locator;
  readonly parentSelect: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.formContainer = page.getByTestId("category-form-container");
    this.form = page.getByTestId("category-form");
    this.nameInput = page.getByTestId("category-name-input");
    this.tagInput = page.getByTestId("category-tag-input");
    this.parentSelect = page.getByTestId("category-parent-select");
    this.submitButton = page.getByTestId("category-submit-button");
    this.cancelButton = page.getByTestId("category-cancel-button");
  }

  async isFormVisible(): Promise<boolean> {
    return await this.formContainer.isVisible();
  }

  async fillCategoryName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  async fillCategoryTag(tag: string): Promise<void> {
    await this.tagInput.fill(tag);
  }

  async selectParentCategory(parentId: string): Promise<void> {
    await this.parentSelect.selectOption(parentId);
  }

  async submitForm(): Promise<void> {
    await this.submitButton.click();
  }

  async cancelForm(): Promise<void> {
    await this.cancelButton.click();
  }

  async createCategory(name: string, tag?: string, parentId?: string): Promise<void> {
    await this.fillCategoryName(name);
    if (tag) {
      await this.fillCategoryTag(tag);
    }
    if (parentId) {
      await this.selectParentCategory(parentId);
    }
    await this.submitForm();
  }

  async isSubmitButtonEnabled(): Promise<boolean> {
    return await this.submitButton.isEnabled();
  }

  async getCategoryName(): Promise<string> {
    return await this.nameInput.inputValue();
  }

  async getCategoryTag(): Promise<string> {
    return await this.tagInput.inputValue();
  }

  async getSelectedParentId(): Promise<string | null> {
    return await this.parentSelect.inputValue();
  }
}
