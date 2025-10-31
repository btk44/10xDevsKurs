import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "../../../../tests/utils";
import userEvent from "@testing-library/user-event";
import RegisterForm from "../RegisterForm";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock window.location.href assignment
const mockLocationHref = vi.fn();
delete global.location;
global.location = {
  href: "",
  set href(value: string) {
    mockLocationHref(value);
  },
};

describe("RegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering Behavior", () => {
    it("renders form correctly with all elements", () => {
      render(<RegisterForm />);

      expect(screen.getByTestId("register-form-container")).toBeInTheDocument();
      expect(screen.getByTestId("register-form")).toBeInTheDocument();
      expect(screen.getByTestId("register-email-input")).toBeInTheDocument();
      expect(screen.getByTestId("register-password-input")).toBeInTheDocument();
      expect(screen.getByTestId("register-confirm-password-input")).toBeInTheDocument();
      expect(screen.getByTestId("register-submit-button")).toBeInTheDocument();
      expect(screen.getByTestId("register-login-link")).toBeInTheDocument();

      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Password")).toBeInTheDocument();
      expect(screen.getByText("Confirm Password")).toBeInTheDocument();
      expect(screen.getByText("Register")).toBeInTheDocument();
      expect(screen.getByText("Already have an account? Log in")).toBeInTheDocument();
      expect(screen.getByText("Must be at least 8 characters with 1 uppercase letter and 1 digit")).toBeInTheDocument();
    });

    it("renders form with correct input attributes", () => {
      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");
      const passwordInput = screen.getByTestId("register-password-input");
      const confirmPasswordInput = screen.getByTestId("register-confirm-password-input");

      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toHaveAttribute("required");
      expect(emailInput).toHaveAttribute("id", "email");

      expect(passwordInput).toHaveAttribute("type", "password");
      expect(passwordInput).toHaveAttribute("required");
      expect(passwordInput).toHaveAttribute("id", "password");

      expect(confirmPasswordInput).toHaveAttribute("type", "password");
      expect(confirmPasswordInput).toHaveAttribute("required");
      expect(confirmPasswordInput).toHaveAttribute("id", "confirmPassword");
    });

    it("renders form with accessibility attributes", () => {
      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");
      const passwordInput = screen.getByTestId("register-password-input");
      const confirmPasswordInput = screen.getByTestId("register-confirm-password-input");
      const emailLabel = screen.getByText("Email");
      const passwordLabel = screen.getByText("Password");
      const confirmPasswordLabel = screen.getByText("Confirm Password");

      expect(emailInput).toHaveAttribute("aria-invalid", "false");
      expect(passwordInput).toHaveAttribute("aria-invalid", "false");
      expect(confirmPasswordInput).toHaveAttribute("aria-invalid", "false");
      expect(emailLabel).toHaveAttribute("for", "email");
      expect(passwordLabel).toHaveAttribute("for", "password");
      expect(confirmPasswordLabel).toHaveAttribute("for", "confirmPassword");
    });
  });

  describe("Form Validation", () => {
    it("prevents API call when form validation fails", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const submitButton = screen.getByTestId("register-submit-button");
      await user.click(submitButton);

      // Should not make API call due to validation failure
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("validates password minimum length", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");
      const passwordInput = screen.getByTestId("register-password-input");
      const confirmPasswordInput = screen.getByTestId("register-confirm-password-input");
      const submitButton = screen.getByTestId("register-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "short");
      await user.type(confirmPasswordInput, "short");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("register-password-error")).toHaveTextContent(
          "Password must be at least 8 characters"
        );
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("validates password uppercase requirement", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");
      const passwordInput = screen.getByTestId("register-password-input");
      const confirmPasswordInput = screen.getByTestId("register-confirm-password-input");
      const submitButton = screen.getByTestId("register-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "lowercase123");
      await user.type(confirmPasswordInput, "lowercase123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("register-password-error")).toHaveTextContent(
          "Password must contain at least one uppercase letter"
        );
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("validates password digit requirement", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");
      const passwordInput = screen.getByTestId("register-password-input");
      const confirmPasswordInput = screen.getByTestId("register-confirm-password-input");
      const submitButton = screen.getByTestId("register-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "UppercaseOnly");
      await user.type(confirmPasswordInput, "UppercaseOnly");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("register-password-error")).toHaveTextContent(
          "Password must contain at least one digit"
        );
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("validates password confirmation match", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");
      const passwordInput = screen.getByTestId("register-password-input");
      const confirmPasswordInput = screen.getByTestId("register-confirm-password-input");
      const submitButton = screen.getByTestId("register-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "ValidPass123");
      await user.type(confirmPasswordInput, "DifferentPass123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("register-confirm-password-error")).toHaveTextContent("Passwords do not match");
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

      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");
      const passwordInput = screen.getByTestId("register-password-input");
      const confirmPasswordInput = screen.getByTestId("register-confirm-password-input");
      const submitButton = screen.getByTestId("register-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "ValidPass123");
      await user.type(confirmPasswordInput, "ValidPass123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "test@example.com",
            password: "ValidPass123",
            confirmPassword: "ValidPass123",
          }),
        });
      });
    });

    it("shows success message on successful registration", async () => {
      const user = userEvent.setup();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");
      const passwordInput = screen.getByTestId("register-password-input");
      const confirmPasswordInput = screen.getByTestId("register-confirm-password-input");
      const submitButton = screen.getByTestId("register-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "ValidPass123");
      await user.type(confirmPasswordInput, "ValidPass123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("register-success-message")).toHaveTextContent(
          "Registration successful! Please check your email to confirm your account."
        );
      });

      expect(mockLocationHref).not.toHaveBeenCalled();
    });

    it("shows success message on registration requiring email confirmation", async () => {
      const user = userEvent.setup();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ requiresEmailConfirmation: true }),
      });

      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");
      const passwordInput = screen.getByTestId("register-password-input");
      const confirmPasswordInput = screen.getByTestId("register-confirm-password-input");
      const submitButton = screen.getByTestId("register-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "ValidPass123");
      await user.type(confirmPasswordInput, "ValidPass123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("register-success-message")).toHaveTextContent(
          "Registration successful! Please check your email to confirm your account."
        );
      });

      expect(mockLocationHref).not.toHaveBeenCalled();
    });

    it("clears form on successful registration with email confirmation", async () => {
      const user = userEvent.setup();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ requiresEmailConfirmation: true }),
      });

      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");
      const passwordInput = screen.getByTestId("register-password-input");
      const confirmPasswordInput = screen.getByTestId("register-confirm-password-input");
      const submitButton = screen.getByTestId("register-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "ValidPass123");
      await user.type(confirmPasswordInput, "ValidPass123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(emailInput).toHaveValue("");
        expect(passwordInput).toHaveValue("");
        expect(confirmPasswordInput).toHaveValue("");
      });
    });

    it("shows loading state during submission", async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");
      const passwordInput = screen.getByTestId("register-password-input");
      const confirmPasswordInput = screen.getByTestId("register-confirm-password-input");
      const submitButton = screen.getByTestId("register-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "ValidPass123");
      await user.type(confirmPasswordInput, "ValidPass123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("register-submit-button")).toHaveTextContent("Creating account...");
        expect(screen.getByTestId("register-submit-button")).toBeDisabled();
      });
    });
  });

  describe("Error Handling", () => {
    it("displays general error for registration failure", async () => {
      const user = userEvent.setup();
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "Email already exists" }),
      });

      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");
      const passwordInput = screen.getByTestId("register-password-input");
      const confirmPasswordInput = screen.getByTestId("register-confirm-password-input");
      const submitButton = screen.getByTestId("register-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "ValidPass123");
      await user.type(confirmPasswordInput, "ValidPass123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("register-general-error")).toHaveTextContent("Email already exists");
      });

      expect(mockLocationHref).not.toHaveBeenCalled();
    });

    it("displays default error message when API returns no error", async () => {
      const user = userEvent.setup();
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({}),
      });

      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");
      const passwordInput = screen.getByTestId("register-password-input");
      const confirmPasswordInput = screen.getByTestId("register-confirm-password-input");
      const submitButton = screen.getByTestId("register-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "ValidPass123");
      await user.type(confirmPasswordInput, "ValidPass123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("register-general-error")).toHaveTextContent(
          "Registration failed. Please try again."
        );
      });
    });

    it("displays network error message", async () => {
      const user = userEvent.setup();
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");
      const passwordInput = screen.getByTestId("register-password-input");
      const confirmPasswordInput = screen.getByTestId("register-confirm-password-input");
      const submitButton = screen.getByTestId("register-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "ValidPass123");
      await user.type(confirmPasswordInput, "ValidPass123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("register-general-error")).toHaveTextContent(
          "An unexpected error occurred. Please try again later."
        );
      });
    });

    it("clears general error when retrying", async () => {
      const user = userEvent.setup();

      // First attempt - network error
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");
      const passwordInput = screen.getByTestId("register-password-input");
      const confirmPasswordInput = screen.getByTestId("register-confirm-password-input");
      const submitButton = screen.getByTestId("register-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "ValidPass123");
      await user.type(confirmPasswordInput, "ValidPass123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("register-general-error")).toBeInTheDocument();
      });

      // Second attempt - successful
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByTestId("register-general-error")).not.toBeInTheDocument();
        expect(screen.getByTestId("register-success-message")).toHaveTextContent(
          "Registration successful! Please check your email to confirm your account."
        );
      });
    });

    it("clears success message when retrying after email confirmation", async () => {
      const user = userEvent.setup();

      // First attempt - email confirmation required
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ requiresEmailConfirmation: true }),
      });

      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");
      const passwordInput = screen.getByTestId("register-password-input");
      const confirmPasswordInput = screen.getByTestId("register-confirm-password-input");
      const submitButton = screen.getByTestId("register-submit-button");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "ValidPass123");
      await user.type(confirmPasswordInput, "ValidPass123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("register-success-message")).toBeInTheDocument();
      });

      // Second attempt - successful without confirmation
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      // Re-fill form to trigger new submission (form was cleared after first success)
      await user.type(emailInput, "test2@example.com");
      await user.type(passwordInput, "ValidPass123");
      await user.type(confirmPasswordInput, "ValidPass123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("register-success-message")).toHaveTextContent(
          "Registration successful! Please check your email to confirm your account."
        );
      });
    });
  });

  describe("User Interactions", () => {
    it("updates email input value", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");

      await user.type(emailInput, "test@example.com");

      expect(emailInput).toHaveValue("test@example.com");
    });

    it("updates password input value", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const passwordInput = screen.getByTestId("register-password-input");

      await user.type(passwordInput, "ValidPass123");

      expect(passwordInput).toHaveValue("ValidPass123");
    });

    it("updates confirm password input value", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const confirmPasswordInput = screen.getByTestId("register-confirm-password-input");

      await user.type(confirmPasswordInput, "ValidPass123");

      expect(confirmPasswordInput).toHaveValue("ValidPass123");
    });

    it("prevents form submission with Enter key when validation fails", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");

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

      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");
      const passwordInput = screen.getByTestId("register-password-input");
      const confirmPasswordInput = screen.getByTestId("register-confirm-password-input");

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "ValidPass123");
      await user.type(confirmPasswordInput, "ValidPass123");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/auth/register", expect.any(Object));
      });
    });
  });

  describe("Accessibility", () => {
    it("maintains focus management", async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const emailInput = screen.getByTestId("register-email-input");
      const passwordInput = screen.getByTestId("register-password-input");
      const confirmPasswordInput = screen.getByTestId("register-confirm-password-input");
      const loginLink = screen.getByTestId("register-login-link");
      const submitButton = screen.getByTestId("register-submit-button");

      await user.click(emailInput);
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      expect(confirmPasswordInput).toHaveFocus();

      await user.tab();
      expect(loginLink).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    it("login link has correct href attribute", () => {
      render(<RegisterForm />);

      const loginLink = screen.getByTestId("register-login-link");

      expect(loginLink).toHaveAttribute("href", "/auth/login");
    });
  });
});
