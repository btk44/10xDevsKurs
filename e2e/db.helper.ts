import type { Database } from "@/db/database.types";
import { createClient } from "@supabase/supabase-js";

export default async function cleanupDatabase() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("SUPABASE_URL and SUPABASE_KEY environment variables are required");
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    // Authenticate as the test user
    const testEmail = process.env.E2E_USERNAME;
    const testPassword = process.env.E2E_PASSWORD;

    if (!testEmail || !testPassword) {
      throw new Error("E2E_USERNAME and E2E_PASSWORD environment variables are required");
    }

    const { data: authData } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (!authData.user) {
      throw new Error("Test user authentication failed");
    }

    const userId = authData.user.id;
    await supabase.from("transactions").delete().eq("user_id", userId);
    await supabase.from("accounts").delete().eq("user_id", userId);
    await supabase.from("categories").delete().eq("user_id", userId);
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Error deleting data:", error);
    throw error;
  }
}
