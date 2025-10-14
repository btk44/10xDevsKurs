import type { Page } from "@playwright/test";

export async function login(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for navigation after login
  await page.waitForURL("/");
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: /logout/i }).click();
  // Wait for navigation after logout
  await page.waitForURL("/auth/login");
}
