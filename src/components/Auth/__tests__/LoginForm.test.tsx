import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "../../../../tests/utils";
import userEvent from "@testing-library/user-event";
import LoginForm from "../LoginForm";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock window.location.href assignment
const mockLocationHref = vi.fn();
vi.stubGlobal("location", {
  href: "",
  set href(value: string) {
    mockLocationHref(value);
  },
});

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering Behavior", () => {
    it("renders form correctly with all elements", () => {
      render(<LoginForm />);

      expect(screen.getByTestId("login-form-container")).toBeInTheDocument();
      expect(screen.getByTestId("login-form")).toBeInTheDocument();
      expect(screen.getByTestId("login-email-input")).toBeInTheDocument();
      expect(screen.getByTestId("login-password-input")).toBeInTheDocument();
      expect(screen.getByTestId("login-submit-button")).toBeInTheDocument();
      expect(screen.getByTestId("login-forgot-password-link")).toBeInTheDocument();
      expect(screen.getByTestId("login-register-link")).toBeInTheDocument();

      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Password")).toBeInTheDocument();
      expect(screen.getByText("Log in")).toBeInTheDocument();
      expect(screen.getByText("Forgot password?")).toBeInTheDocument();
      expect(screen.getByText("Register")).toBeInTheDocument();
    });

    it("renders form with correct input attributes", () => {
      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");
      const passwordInput = screen.getByTestId("login-password-input");

      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toHaveAttribute("required");
      expect(emailInput).toHaveAttribute("id", "email");

      expect(passwordInput).toHaveAttribute("type", "password");
      expect(passwordInput).toHaveAttribute("required");
      expect(passwordInput).toHaveAttribute("id", "password");
    });

    it("renders form with accessibility attributes", () => {
      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");
      const passwordInput = screen.getByTestId("login-password-input");
      const emailLabel = screen.getByText("Email");
      const passwordLabel = screen.getByText("Password");

      expect(emailInput).toHaveAttribute("aria-invalid", "false");
      expect(passwordInput).toHaveAttribute("aria-invalid", "false");
      expect(emailLabel).toHaveAttribute("for", "email");
      expect(passwordLabel).toHaveAttribute("for", "password");
    });
  });

  describe("Form Validation", () => {
    it("prevents API call when form validation fails", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const submitButton = screen.getByTestId("login-submit-button");
      await user.click(submitButton);

      // Should not make API call due to validation failure
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("validates password too short", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");
      const passwordInput = screen.getByTestId("login-password-input");
      const submitButton = screen.getByTestId("login-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("login-password-error")).toHaveTextContent("Password must be at least 6 characters");
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("Form Submission", () => {
    it("submits form with valid data", async () => {
      const user = userEvent.setup();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");
      const passwordInput = screen.getByTestId("login-password-input");
      const submitButton = screen.getByTestId("login-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: "test@example.com", password: "password123" }),
        });
      });
    });

    it("redirects to home page on successful login", async () => {
      const user = userEvent.setup();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");
      const passwordInput = screen.getByTestId("login-password-input");
      const submitButton = screen.getByTestId("login-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLocationHref).toHaveBeenCalledWith("/");
      });
    });

    it("shows loading state during submission", async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");
      const passwordInput = screen.getByTestId("login-password-input");
      const submitButton = screen.getByTestId("login-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("login-submit-button")).toHaveTextContent("Logging in...");
        expect(screen.getByTestId("login-submit-button")).toBeDisabled();
      });
    });
  });

  describe("Error Handling", () => {
    it("displays general error for invalid credentials", async () => {
      const user = userEvent.setup();
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "Invalid email or password" }),
      });

      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");
      const passwordInput = screen.getByTestId("login-password-input");
      const submitButton = screen.getByTestId("login-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "wrongpassword");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("login-general-error")).toHaveTextContent("Invalid email or password");
      });

      expect(mockLocationHref).not.toHaveBeenCalled();
    });

    it("displays default error message when API returns no error", async () => {
      const user = userEvent.setup();
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({}),
      });

      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");
      const passwordInput = screen.getByTestId("login-password-input");
      const submitButton = screen.getByTestId("login-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("login-general-error")).toHaveTextContent("Invalid email or password");
      });
    });

    it("displays network error message", async () => {
      const user = userEvent.setup();
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");
      const passwordInput = screen.getByTestId("login-password-input");
      const submitButton = screen.getByTestId("login-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("login-general-error")).toHaveTextContent(
          "An unexpected error occurred. Please try again later."
        );
      });
    });

    it("clears general error when retrying", async () => {
      const user = userEvent.setup();

      // First attempt - network error
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");
      const passwordInput = screen.getByTestId("login-password-input");
      const submitButton = screen.getByTestId("login-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("login-general-error")).toBeInTheDocument();
      });

      // Second attempt - successful
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByTestId("login-general-error")).not.toBeInTheDocument();
        expect(mockLocationHref).toHaveBeenCalledWith("/");
      });
    });
  });

  describe("User Interactions", () => {
    it("updates email input value", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");

      await user.type(emailInput, "test@example.com");

      expect(emailInput).toHaveValue("test@example.com");
    });

    it("updates password input value", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const passwordInput = screen.getByTestId("login-password-input");

      await user.type(passwordInput, "password123");

      expect(passwordInput).toHaveValue("password123");
    });

    it("prevents form submission with Enter key when validation fails", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");

      await user.type(emailInput, "test@example.com");
      await user.keyboard("{Enter}");

      // Should not make API call due to validation failure
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("submits form with Enter key when validation passes", async () => {
      const user = userEvent.setup();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");
      const passwordInput = screen.getByTestId("login-password-input");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", expect.any(Object));
      });
    });
  });

  describe("Accessibility", () => {
    it("maintains focus management", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByTestId("login-email-input");
      const passwordInput = screen.getByTestId("login-password-input");
      const forgotPasswordLink = screen.getByTestId("login-forgot-password-link");
      const registerLink = screen.getByTestId("login-register-link");
      const submitButton = screen.getByTestId("login-submit-button");

      await user.click(emailInput);
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      expect(forgotPasswordLink).toHaveFocus();

      await user.tab();
      expect(registerLink).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    it("links have correct href attributes", () => {
      render(<LoginForm />);

      const forgotPasswordLink = screen.getByTestId("login-forgot-password-link");
      const registerLink = screen.getByTestId("login-register-link");

      expect(forgotPasswordLink).toHaveAttribute("href", "/auth/reset-password");
      expect(registerLink).toHaveAttribute("href", "/auth/register");
    });
  });
});
