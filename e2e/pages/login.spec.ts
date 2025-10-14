import { test, expect } from "@playwright/test";
import { testUsers } from "../fixtures/test-users";

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page before each test
    await page.goto("/auth/login");
  });

  test("should display login form", async ({ page }) => {
    // Check that the login form is displayed
    await expect(page.getByRole("heading", { name: /login/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("should show error with invalid credentials", async ({ page }) => {
    // Fill in the form with invalid credentials
    await page.getByLabel(/email/i).fill("invalid@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");

    // Submit the form
    await page.getByRole("button", { name: /sign in/i }).click();

    // Check that an error message is displayed
    await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
  });

  test("should navigate to register page", async ({ page }) => {
    // Click on the register link
    await page.getByRole("link", { name: /register/i }).click();

    // Check that we're on the register page
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test("should navigate to reset password page", async ({ page }) => {
    // Click on the forgot password link
    await page.getByRole("link", { name: /forgot password/i }).click();

    // Check that we're on the reset password page
    await expect(page).toHaveURL(/\/auth\/reset-password/);
  });
});
