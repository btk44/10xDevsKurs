import { test as setup } from "@playwright/test";
import { LoginPage } from "./pages";
import * as path from "path";

// Join the directory name with the auth file name, with error handling for __dirname
const dirname = typeof __dirname !== "undefined" ? __dirname : process.cwd();
const authFile = path.join(dirname, "playwright/.auth/user.json");

setup("authenticate", async ({ page }) => {
  const testEmail = process.env.E2E_USERNAME;
  const testPassword = process.env.E2E_PASSWORD;

  if (!testEmail || !testPassword) {
    throw new Error("E2E_USERNAME and E2E_PASSWORD environment variables are required");
  }

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(testEmail, testPassword);
  // End of authentication steps.
  await page.waitForTimeout(1000);
  console.log(authFile);

  await page.waitForTimeout(1000);
  await page.context().storageState({ path: authFile });
});
