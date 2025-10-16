import type { Page, Locator } from "@playwright/test";

export class DeleteCategoryDialog {
  readonly page: Page;
  readonly modal: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly cancelButton: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.getByTestId("delete-category-modal");
    this.title = this.modal.locator("h2");
    this.description = this.modal.locator("p").first();
    this.cancelButton = page.getByTestId("delete-modal-cancel");
    this.confirmButton = page.getByTestId("delete-modal-confirm");
  }

  async isModalVisible(): Promise<boolean> {
    return await this.modal.isVisible();
  }

  async getTitle(): Promise<string | null> {
    return await this.title.textContent();
  }

  async getDescription(): Promise<string | null> {
    return await this.description.textContent();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async confirm(): Promise<void> {
    await this.confirmButton.click();
  }

  async isCancelButtonVisible(): Promise<boolean> {
    return await this.cancelButton.isVisible();
  }

  async isConfirmButtonVisible(): Promise<boolean> {
    return await this.confirmButton.isVisible();
  }

  async isConfirmButtonDisabled(): Promise<boolean> {
    return await this.confirmButton.isDisabled();
  }
}
