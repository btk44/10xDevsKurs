import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "../AuthService";
import { createMockSupabaseClient } from "../../../../tests/mocks/supabase";

describe("AuthService", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let authService: AuthService;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    authService = new AuthService(mockSupabase as any);
  });

  describe("signIn", () => {
    it("should call supabase auth signInWithPassword with correct parameters", async () => {
      const mockResult = { data: { user: { id: "user123" } }, error: null };
      mockSupabase.auth.signInWithPassword.mockResolvedValue(mockResult);

      const result = await authService.signIn("test@example.com", "password123");

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(result).toEqual(mockResult);
    });

    it("should handle auth errors", async () => {
      const mockError = { message: "Invalid login credentials" };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      const result = await authService.signIn("test@example.com", "wrongpassword");

      expect(result.error).toEqual(mockError);
    });
  });

  describe("signUp", () => {
    it("should call supabase auth signUp with correct parameters", async () => {
      const mockResult = { data: { user: { id: "user123" } }, error: null };
      mockSupabase.auth.signUp.mockResolvedValue(mockResult);

      const result = await authService.signUp("test@example.com", "password123");

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("signOut", () => {
    it("should call supabase auth signOut", async () => {
      const mockResult = { error: null };
      mockSupabase.auth.signOut.mockResolvedValue(mockResult);

      const result = await authService.signOut();

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe("getSession", () => {
    it("should call supabase auth getSession", async () => {
      const mockResult = {
        data: {
          session: {
            user: { id: "user123" },
            access_token: "token123",
          },
        },
        error: null,
      };
      mockSupabase.auth.getSession.mockResolvedValue(mockResult);

      const result = await authService.getSession();

      expect(mockSupabase.auth.getSession).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe("getUser", () => {
    it("should call supabase auth getUser", async () => {
      const mockResult = {
        data: { user: { id: "user123", email: "test@example.com" } },
        error: null,
      };
      mockSupabase.auth.getUser.mockResolvedValue(mockResult);

      const result = await authService.getUser();

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe("handleAuthError", () => {
    it("should return empty string for null error", () => {
      const result = authService.handleAuthError(null);
      expect(result).toBe("");
    });

    it("should return empty string for undefined error", () => {
      const result = authService.handleAuthError(undefined);
      expect(result).toBe("");
    });

    it("should map 'Invalid login credentials' to user-friendly message", () => {
      const result = authService.handleAuthError({ message: "Invalid login credentials" });
      expect(result).toBe("Invalid email or password");
    });

    it("should map 'Email not confirmed' to user-friendly message", () => {
      const result = authService.handleAuthError({ message: "Email not confirmed" });
      expect(result).toBe("Email not confirmed. Please check your inbox");
    });

    it("should map 'Invalid user' to user-friendly message", () => {
      const result = authService.handleAuthError({ message: "Invalid user" });
      expect(result).toBe("Invalid user");
    });

    it("should map 'User already registered' to user-friendly message", () => {
      const result = authService.handleAuthError({ message: "User already registered" });
      expect(result).toBe("Email already in use. Please try logging in or use a different email.");
    });

    it("should map 'Password should be at least 6 characters' to user-friendly message", () => {
      const result = authService.handleAuthError({ message: "Password should be at least 6 characters" });
      expect(result).toBe("Password should be at least 6 characters");
    });

    it("should map unknown errors to generic message and log them", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = authService.handleAuthError({ message: "Some unknown error" });

      expect(result).toBe("An unexpected error occurred. Please try again later.");
      expect(consoleSpy).toHaveBeenCalledWith("Auth error:", { message: "Some unknown error" });

      consoleSpy.mockRestore();
    });

    it("should handle error objects with additional properties", () => {
      const complexError = {
        message: "Invalid login credentials",
        status: 400,
        details: "Additional info",
      };

      const result = authService.handleAuthError(complexError);
      expect(result).toBe("Invalid email or password");
    });

    it("should handle non-Error objects gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // @ts-expect-error Testing invalid input
      const result = authService.handleAuthError("string error");

      expect(result).toBe("An unexpected error occurred. Please try again later.");
      expect(consoleSpy).toHaveBeenCalledWith("Auth error:", "string error");

      consoleSpy.mockRestore();
    });
  });
});
