import { test as teardown } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/db/database.types";

// Create Supabase client for Node.js environment
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL and SUPABASE_KEY environment variables are required");
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

teardown("cleanup database", async () => {
  console.log("Starting database cleanup...");

  try {
    // Authenticate as the test user
    const testEmail = process.env.E2E_USERNAME;
    const testPassword = process.env.E2E_PASSWORD;

    if (!testEmail || !testPassword) {
      throw new Error("E2E_USERNAME and E2E_PASSWORD environment variables are required");
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (authError) {
      console.error("Error authenticating test user:", authError);
      throw authError;
    }

    if (!authData.user) {
      console.log("Test user authentication failed, skipping cleanup");
      return;
    }

    const userId = authData.user.id;
    console.log(`Cleaning up data for user: ${userId}`);

    // Delete in correct order due to foreign key constraints
    // 1. Delete transactions first (references accounts and categories)
    console.log("Deleting transactions...");
    const { error: transactionsError } = await supabase.from("transactions").delete().eq("user_id", userId);

    if (transactionsError) {
      console.error("Error deleting transactions:", transactionsError);
      throw transactionsError;
    }

    // 2. Delete accounts
    console.log("Deleting accounts...");
    const { error: accountsError } = await supabase.from("accounts").delete().eq("user_id", userId);

    if (accountsError) {
      console.error("Error deleting accounts:", accountsError);
      throw accountsError;
    }

    // 3. Delete categories
    console.log("Deleting categories...");
    const { error: categoriesError } = await supabase.from("categories").delete().eq("user_id", userId);

    if (categoriesError) {
      console.error("Error deleting categories:", categoriesError);
      throw categoriesError;
    }

    // Sign out
    await supabase.auth.signOut();

    console.log("Database cleanup completed successfully");
  } catch (error) {
    console.error("Database cleanup failed:", error);
    throw error;
  }
});
