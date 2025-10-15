import type { Page, Locator } from "@playwright/test";

export class NavigationPage {
  readonly page: Page;
  readonly transactionsLink: Locator;
  readonly accountsLink: Locator;
  readonly categoriesLink: Locator;
  readonly userEmail: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.transactionsLink = page.getByRole("link", { name: "Transactions" });
    this.accountsLink = page.getByTestId("nav-accounts-link");
    this.categoriesLink = page.getByRole("link", { name: "Categories" });
    this.userEmail = page.locator("span.text-sm.text-gray-300");
    this.logoutButton = page.getByRole("button", { name: /logout/i });
  }

  async gotoTransactions(): Promise<void> {
    await this.transactionsLink.click();
    await this.page.waitForURL("/");
  }

  async gotoAccounts(): Promise<void> {
    await this.accountsLink.click();
    await this.page.waitForURL("/accounts");
  }

  async gotoCategories(): Promise<void> {
    await this.categoriesLink.click();
    await this.page.waitForURL("/categories");
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await this.page.waitForURL("/auth/login");
  }

  async isTransactionsLinkVisible(): Promise<boolean> {
    return await this.transactionsLink.isVisible();
  }

  async isAccountsLinkVisible(): Promise<boolean> {
    return await this.accountsLink.isVisible();
  }

  async isCategoriesLinkVisible(): Promise<boolean> {
    return await this.categoriesLink.isVisible();
  }

  async isLogoutButtonVisible(): Promise<boolean> {
    return await this.logoutButton.isVisible();
  }

  async getUserEmail(): Promise<string | null> {
    return await this.userEmail.textContent();
  }
}
