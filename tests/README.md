# Testing Guide

This project uses Vitest for unit and integration tests, and Playwright for end-to-end (E2E) tests.

## Unit and Integration Testing with Vitest

### Running Tests

- Run all tests: `npm test`
- Run tests in watch mode: `npm run test:watch`
- Run tests with UI: `npm run test:ui`
- Run tests with coverage: `npm run test:coverage`

### Test Structure

Unit tests are located close to the code they test:

- Component tests: `src/components/**/__tests__/*.test.tsx`
- Service tests: `src/lib/**/__tests__/*.test.ts`

### Writing Tests

Follow these guidelines for unit tests:

1. Use the `describe` block to group related tests
2. Use the `it` function for individual test cases
3. Import utilities from `tests/utils.tsx` for rendering components
4. Use `vi.mock()` for mocking dependencies
5. Use `vi.fn()` for creating mock functions
6. Use `vi.spyOn()` to monitor existing functions

Example:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../tests/utils';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## End-to-End Testing with Playwright

### Running Tests

- Run all E2E tests: `npm run test:e2e`
- Run E2E tests with UI: `npm run test:e2e:ui`

### Test Structure

E2E tests are located in the `e2e` directory:

- Page tests: `e2e/pages/*.spec.ts`
- Utilities: `e2e/utils/*.ts`
- Fixtures: `e2e/fixtures/*.ts`

### Writing Tests

Follow these guidelines for E2E tests:

1. Use the Page Object Model for maintainable tests
2. Use locators for resilient element selection
3. Group related tests with `test.describe`
4. Use `test.beforeEach` for setup
5. Use `expect` assertions with specific matchers

Example:

```ts
import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display welcome message', async ({ page }) => {
    await expect(page.getByRole('heading')).toContainText('Welcome');
  });
});
```
