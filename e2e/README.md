# End-to-End Testing Guide

This directory contains end-to-end tests using Playwright.

## Directory Structure

- `pages/`: Tests for specific pages in the application
- `utils/`: Utility functions for tests
- `fixtures/`: Test data and fixtures

## Running Tests

- Run all E2E tests: `npm run test:e2e`
- Run E2E tests with UI: `npm run test:e2e:ui`
- Run specific test file: `npx playwright test e2e/pages/login.spec.ts`

## Best Practices

1. **Use the Page Object Model**: Create page classes that encapsulate page-specific selectors and actions.

2. **Use locators for resilient element selection**:

   ```typescript
   // Good - uses accessible roles and attributes
   page.getByRole("button", { name: "Submit" });

   // Avoid - brittle CSS selectors
   page.locator(".submit-button");
   ```

3. **Group related tests** with `test.describe` blocks.

4. **Use test hooks** for setup and teardown:

   ```typescript
   test.beforeEach(async ({ page }) => {
     // Setup code
   });

   test.afterEach(async ({ page }) => {
     // Cleanup code
   });
   ```

5. **Use specific assertions**:

   ```typescript
   await expect(page.getByText("Welcome")).toBeVisible();
   await expect(page).toHaveURL("/dashboard");
   ```

6. **Use visual comparison** for UI testing:

   ```typescript
   await expect(page).toHaveScreenshot("dashboard.png");
   ```

7. **Leverage trace viewer** for debugging test failures:
   ```typescript
   test.use({ trace: "on-first-retry" });
   ```

## Example Page Object

```typescript
// e2e/pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto("/auth/login");
  }

  async login(email: string, password: string) {
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password").fill(password);
    await this.page.getByRole("button", { name: "Sign in" }).click();
  }

  async getErrorMessage() {
    return this.page.getByRole("alert").textContent();
  }
}
```
