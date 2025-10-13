import type { SupabaseClient, AuthError } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";

export class AuthService {
  private supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  /**
   * User login with email and password
   * @param email - User's email
   * @param password - User's password
   * @returns Promise with login result
   */
  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  /**
   * User registration with email and password
   * @param email - User's email
   * @param password - User's password
   * @returns Promise with registration result
   */
  async signUp(email: string, password: string) {
    return await this.supabase.auth.signUp({
      email,
      password,
    });
  }

  /**
   * User logout
   * @returns Promise with logout result
   */
  async signOut() {
    return await this.supabase.auth.signOut();
  }

  /**
   * Get current user session
   * @returns Promise with user session
   */
  async getSession() {
    return await this.supabase.auth.getSession();
  }

  /**
   * Get current user
   * @returns Promise with user data
   */
  async getUser() {
    return await this.supabase.auth.getUser();
  }

  /**
   * Handle authentication errors
   * @param error - Error returned by Supabase Auth
   * @returns User-friendly error message
   */
  handleAuthError(error: AuthError | null): string {
    if (!error) return "";

    switch (error.message) {
      case "Invalid login credentials":
        return "Invalid email or password";
      case "Email not confirmed":
        return "Email not confirmed. Please check your inbox";
      case "Invalid user":
        return "Invalid user";
      case "User already registered":
        return "Email already in use. Please try logging in or use a different email.";
      case "Password should be at least 6 characters":
        return "Password should be at least 6 characters";
      default:
        console.error("Auth error:", error);
        return "An unexpected error occurred. Please try again later.";
    }
  }
}
