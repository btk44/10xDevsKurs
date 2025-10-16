import type { Page, Locator } from "@playwright/test";

export class DeleteAccountDialog {
  readonly page: Page;
  readonly modal: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly body: Locator;
  readonly cancelButton: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.getByTestId("delete-account-modal");
    this.title = page.getByTestId("delete-modal-title");
    this.description = page.getByTestId("delete-modal-description");
    this.body = page.getByTestId("delete-modal-body");
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

  async getBodyText(): Promise<string | null> {
    return await this.body.textContent();
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

  async getConfirmButtonText(): Promise<string | null> {
    return await this.confirmButton.textContent();
  }
}
