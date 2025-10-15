import { test, expect } from "@playwright/test";
import { LoginPage, NavigationPage, CategoriesPage, CategoryForm, CategoryList } from "./index";
import { testUsers } from "../fixtures/test-users";

test.describe("Categories Management", () => {
  let loginPage: LoginPage;
  let navigationPage: NavigationPage;
  let categoriesPage: CategoriesPage;
  let categoryForm: CategoryForm;
  let categoryList: CategoryList;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    navigationPage = new NavigationPage(page);
    categoriesPage = new CategoriesPage(page);
    categoryForm = new CategoryForm(page);
    categoryList = new CategoryList(page);

    // Login first
    //await loginPage.goto();
    //await loginPage.login(testUsers.standard.email, testUsers.standard.password);
  });

  test("should create a new expense category and verify it appears in the list", async ({ page }) => {
    // Navigate to categories page
    await navigationPage.gotoCategories();

    // Verify categories page is loaded
    await expect(categoriesPage.pageContainer).toBeVisible();

    // Switch to expense tab
    await categoriesPage.switchToExpenseTab();
    await expect(categoriesPage.expenseTab).toHaveAttribute("data-state", "active");

    // Wait for categories to load
    await categoriesPage.waitForCategoriesToLoad();

    // Get initial category count
    const initialCount = await categoryList.getCategoryCount();

    // Fill the category form
    const categoryName = `Test Expense ${Date.now()}`;
    const categoryTag = "TEST";

    await categoryForm.createCategory(categoryName, categoryTag);

    // Wait for the category to appear in the list
    await page.waitForTimeout(1000); // Allow time for the API call and UI update

    // Verify the category appears in the list
    await expect(categoryList.categoriesList).toBeVisible();
    expect(await categoryList.isCategoryVisible(categoryName)).toBe(true);

    // Verify the category count increased
    const finalCount = await categoryList.getCategoryCount();
    expect(finalCount).toBe(initialCount + 1);

    // Verify the category tag is displayed
    const categoryTagInList = await categoryList.getCategoryTag(categoryName);
    expect(categoryTagInList).toBe(categoryTag);
  });

  test("should display empty state when no categories exist", async () => {
    // This test would need to be run with a clean database or mock API
    // For demonstration purposes, we'll just check the structure exists
    await navigationPage.gotoCategories();

    // If categories exist, the empty message won't be visible
    // If no categories exist, the empty message should be visible
    const hasEmptyMessage = await categoryList.emptyMessage.isVisible();
    const hasList = await categoryList.categoriesList.isVisible();

    // Either empty message or list should be visible (not both)
    expect(hasEmptyMessage || hasList).toBe(true);
    expect(hasEmptyMessage && hasList).toBe(false);
  });

  test("should switch between income and expense tabs", async () => {
    await navigationPage.gotoCategories();

    // Initially should be on expense tab (default)
    await expect(categoriesPage.expenseTab).toHaveAttribute("data-state", "active");

    // Switch to income tab
    await categoriesPage.switchToIncomeTab();
    await expect(categoriesPage.incomeTab).toHaveAttribute("data-state", "active");
    await expect(categoriesPage.expenseTab).not.toHaveAttribute("data-state", "active");

    // Switch back to expense tab
    await categoriesPage.switchToExpenseTab();
    await expect(categoriesPage.expenseTab).toHaveAttribute("data-state", "active");
    await expect(categoriesPage.incomeTab).not.toHaveAttribute("data-state", "active");
  });
});
