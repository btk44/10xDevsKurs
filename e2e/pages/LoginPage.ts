import type { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly form: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly generalError: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.getByTestId("login-form");
    this.emailInput = page.getByTestId("login-email-input");
    this.passwordInput = page.getByTestId("login-password-input");
    this.submitButton = page.getByTestId("login-submit-button");
    this.generalError = page.getByTestId("login-general-error");
    this.emailError = page.getByTestId("login-email-error");
    this.passwordError = page.getByTestId("login-password-error");
    this.forgotPasswordLink = page.getByTestId("login-forgot-password-link");
    this.registerLink = page.getByTestId("login-register-link");
  }

  async goto(): Promise<void> {
    await this.page.goto("/auth/login");
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    // Wait for navigation after successful login
    await this.page.waitForURL("/");
  }

  async loginWithInvalidCredentials(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }

  async clickRegister(): Promise<void> {
    await this.registerLink.click();
  }

  async isFormVisible(): Promise<boolean> {
    return this.form.isVisible();
  }

  async isEmailInputVisible(): Promise<boolean> {
    return this.emailInput.isVisible();
  }

  async isPasswordInputVisible(): Promise<boolean> {
    return this.passwordInput.isVisible();
  }

  async isSubmitButtonVisible(): Promise<boolean> {
    return this.submitButton.isVisible();
  }

  async isGeneralErrorVisible(): Promise<boolean> {
    return this.generalError.isVisible();
  }

  async isEmailErrorVisible(): Promise<boolean> {
    return this.emailError.isVisible();
  }

  async isPasswordErrorVisible(): Promise<boolean> {
    return this.passwordError.isVisible();
  }

  async getGeneralErrorText(): Promise<string | null> {
    return await this.generalError.textContent();
  }

  async getEmailErrorText(): Promise<string | null> {
    return await this.emailError.textContent();
  }

  async getPasswordErrorText(): Promise<string | null> {
    return await this.passwordError.textContent();
  }
}
