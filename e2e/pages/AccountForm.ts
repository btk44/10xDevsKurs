import type { Page, Locator } from "@playwright/test";

export class AccountForm {
  readonly page: Page;
  readonly formContainer: Locator;
  readonly formTitle: Locator;
  readonly form: Locator;
  readonly nameInput: Locator;
  readonly currencySelect: Locator;
  readonly tagInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly nameError: Locator;
  readonly currencyError: Locator;
  readonly tagError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.formContainer = page.getByTestId("account-form-container");
    this.formTitle = page.getByTestId("account-form-title");
    this.form = page.getByTestId("account-form");
    this.nameInput = page.getByTestId("account-name-input");
    this.currencySelect = page.getByTestId("account-currency-select");
    this.tagInput = page.getByTestId("account-tag-input");
    this.submitButton = page.getByTestId("account-submit-button");
    this.cancelButton = page.getByTestId("account-cancel-button");
    this.nameError = page.getByTestId("account-name-error");
    this.currencyError = page.getByTestId("account-currency-error");
    this.tagError = page.getByTestId("account-tag-error");
  }

  async isFormVisible(): Promise<boolean> {
    return this.formContainer.isVisible();
  }

  async isCreateForm(): Promise<boolean> {
    const title = await this.formTitle.textContent();
    return title === "Create New Account";
  }

  async isEditForm(): Promise<boolean> {
    const title = await this.formTitle.textContent();
    return title === "Edit Account";
  }

  async fillAccountName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  async selectCurrency(currencyCode: string): Promise<void> {
    await this.currencySelect.selectOption({ label: currencyCode });
  }

  async fillTag(tag: string): Promise<void> {
    await this.tagInput.fill(tag);
  }

  async clearTag(): Promise<void> {
    await this.tagInput.clear();
  }

  async submitForm(): Promise<void> {
    await this.submitButton.click();
  }

  async cancelForm(): Promise<void> {
    await this.cancelButton.click();
  }

  async createAccount(name: string, currencyCode: string, tag?: string): Promise<void> {
    await this.fillAccountName(name);
    await this.selectCurrency(currencyCode);
    if (tag !== undefined) {
      if (tag === "") {
        await this.clearTag();
      } else {
        await this.fillTag(tag);
      }
    }
    await this.submitForm();
  }

  async editAccount(name: string, currencyCode: string, tag?: string): Promise<void> {
    await this.fillAccountName(name);
    await this.selectCurrency(currencyCode);
    if (tag !== undefined) {
      if (tag === "") {
        await this.clearTag();
      } else {
        await this.fillTag(tag);
      }
    }
    await this.submitForm();
  }

  async isSubmitButtonEnabled(): Promise<boolean> {
    return this.submitButton.isEnabled();
  }

  async isNameErrorVisible(): Promise<boolean> {
    return this.nameError.isVisible();
  }

  async isCurrencyErrorVisible(): Promise<boolean> {
    return this.currencyError.isVisible();
  }

  async isTagErrorVisible(): Promise<boolean> {
    return this.tagError.isVisible();
  }

  async getNameErrorText(): Promise<string | null> {
    return await this.nameError.textContent();
  }

  async getCurrencyErrorText(): Promise<string | null> {
    return await this.currencyError.textContent();
  }

  async getTagErrorText(): Promise<string | null> {
    return await this.tagError.textContent();
  }

  async getNameValue(): Promise<string> {
    return await this.nameInput.inputValue();
  }

  async getCurrencyValue(): Promise<string> {
    return await this.currencySelect.inputValue();
  }

  async getTagValue(): Promise<string> {
    return await this.tagInput.inputValue();
  }

  async waitForFormToLoad(): Promise<void> {
    await this.formContainer.waitFor({ state: "visible" });
  }
}
