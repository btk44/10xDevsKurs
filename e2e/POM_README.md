# Page Object Model (POM) Classes

This directory contains Page Object Model classes following the Playwright E2E testing guidelines. Each class encapsulates the interactions and elements for a specific page or component.

## Available POM Classes

### LoginPage
Handles login functionality including form interactions, validation, and navigation.

**Key Methods:**
- `login(email, password)` - Complete login flow
- `loginWithInvalidCredentials(email, password)` - Login with invalid credentials for testing error states
- `clickForgotPassword()` / `clickRegister()` - Navigation links
- `isFormVisible()`, `isEmailInputVisible()`, etc. - Element visibility checks
- `getGeneralErrorText()`, `getEmailErrorText()`, etc. - Error message retrieval

### NavigationPage
Handles main navigation elements and user actions.

**Key Methods:**
- `gotoTransactions()` / `gotoAccounts()` / `gotoCategories()` - Navigate to different sections
- `logout()` - User logout
- `isAccountsLinkVisible()`, etc. - Navigation element visibility
- `getUserEmail()` - Get logged-in user email

### AccountsPage
Handles the accounts page and account list interactions.

**Key Methods:**
- `goto()` - Navigate to accounts page
- `isAccountVisible(accountName)` - Check if account exists in list
- `getAccountCount()` / `getAccountNames()` - Account list information
- `clickEditAccount(accountId)` / `clickDeleteAccount(accountId)` - Account actions
- `sortByName()` / `sortByCurrency()` / etc. - Table sorting
- `waitForAccountsToLoad()` - Wait for async data loading

### AccountForm
Handles account creation and editing form interactions.

**Key Methods:**
- `createAccount(name, currencyCode, tag?)` - Complete account creation
- `editAccount(name, currencyCode, tag?)` - Complete account editing
- `fillAccountName(name)` / `selectCurrency(code)` / `fillTag(tag)` - Individual field interactions
- `submitForm()` / `cancelForm()` - Form actions
- `isNameErrorVisible()` / `isCurrencyErrorVisible()` - Validation error checks
- `getNameErrorText()` / etc. - Error message retrieval

## Usage Examples

### Complete Account Creation Workflow
```typescript
import { test, expect } from "@playwright/test";
import { testUsers } from "../fixtures/test-users";
import { LoginPage, NavigationPage, AccountsPage, AccountForm } from "../pages";

test("create new account", async ({ page }) => {
  // Initialize POM classes
  const loginPage = new LoginPage(page);
  const navigationPage = new NavigationPage(page);
  const accountsPage = new AccountsPage(page);
  const accountForm = new AccountForm(page);

  // Login
  await loginPage.goto();
  await loginPage.login(testUsers.standard.email, testUsers.standard.password);

  // Navigate to accounts
  await navigationPage.gotoAccounts();

  // Create account
  const accountName = "Test Account";
  await accountForm.createAccount(accountName, "USD", "test");

  // Verify account appears in list
  await accountsPage.waitForAccountsToLoad();
  await expect(accountsPage.isAccountVisible(accountName)).toBe(true);
});
```

### Form Validation Testing
```typescript
test("validate account form", async ({ page }) => {
  // Setup...
  await accountForm.submitForm();

  // Check validation errors
  await expect(accountForm.isNameErrorVisible()).toBe(true);
  await expect(accountForm.isCurrencyErrorVisible()).toBe(true);

  const nameError = await accountForm.getNameErrorText();
  expect(nameError).toContain("required");
});
```

## Test Data
Test user credentials are available in `fixtures/test-users.ts`:

```typescript
import { testUsers } from "../fixtures/test-users";

// Use in tests
await loginPage.login(testUsers.standard.email, testUsers.standard.password);
```

## Best Practices

1. **Initialize POM classes in test setup** - Create instances in `beforeEach` or test setup
2. **Use descriptive method names** - Methods should clearly indicate their purpose
3. **Return promises for async operations** - All Playwright interactions are async
4. **Include visibility and state checks** - Use `isVisible()`, `isEnabled()` methods
5. **Handle dynamic content** - Use appropriate waits and data-testid selectors
6. **Keep classes focused** - Each class should handle one page/component responsibility

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test accounts.spec.ts

# Run with UI mode
npx playwright test --ui
```

## Test Structure
```
e2e/
├── pages/              # POM classes
│   ├── LoginPage.ts
│   ├── NavigationPage.ts
│   ├── AccountsPage.ts
│   ├── AccountForm.ts
│   └── index.ts       # Exports all POM classes
├── fixtures/          # Test data
│   └── test-users.ts
├── utils/            # Helper utilities
│   └── auth.ts
└── pages/           # Test files (organized by page)
    ├── login.spec.ts
    └── accounts.spec.ts
```
