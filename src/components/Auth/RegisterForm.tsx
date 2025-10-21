import { useState } from "react";
import { Button } from "../ui/button";
import { RegisterFormSchema } from "../../lib/validation/schemas";
import type { z } from "zod";

type RegisterFormData = z.infer<typeof RegisterFormSchema>;
interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const validateForm = (): boolean => {
    const formData: RegisterFormData = { email, password, confirmPassword };
    const result = RegisterFormSchema.safeParse(formData);

    if (!result.success) {
      const formattedErrors = result.error.format();
      const newErrors: FormErrors = {};

      if (formattedErrors.email?._errors) {
        newErrors.email = formattedErrors.email._errors[0];
      }

      if (formattedErrors.password?._errors) {
        newErrors.password = formattedErrors.password._errors[0];
      }

      if (formattedErrors.confirmPassword?._errors) {
        newErrors.confirmPassword = formattedErrors.confirmPassword._errors[0];
      }

      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, confirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({
          general: data.error || "Registration failed. Please try again.",
        });
        setIsLoading(false);
        return;
      }

      if (data.requiresEmailConfirmation) {
        setSuccessMessage("Registration successful! Please check your email to confirm your account.");
        // Clear form
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      } else {
        // Redirect to the main page on successful registration
        window.location.href = "/";
      }
    } catch (err) {
      setErrors({
        general: "An unexpected error occurred. Please try again later.",
      });
      // eslint-disable-next-line no-console
      console.error("Registration error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div data-testid="register-form-container" className="w-full max-w-md mx-auto">
      <form data-testid="register-form" onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div
            data-testid="register-general-error"
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
          >
            {errors.general}
          </div>
        )}
        {successMessage && (
          <div
            data-testid="register-success-message"
            className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded"
          >
            {successMessage}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            data-testid="register-email-input"
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md ${
              errors.email ? "border-red-500" : "border-gray-300"
            } shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p data-testid="register-email-error" id="email-error" className="mt-1 text-sm text-red-600">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            data-testid="register-password-input"
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md ${
              errors.password ? "border-red-500" : "border-gray-300"
            } shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          {errors.password && (
            <p data-testid="register-password-error" id="password-error" className="mt-1 text-sm text-red-600">
              {errors.password}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Must be at least 8 characters with 1 uppercase letter and 1 digit
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            data-testid="register-confirm-password-input"
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md ${
              errors.confirmPassword ? "border-red-500" : "border-gray-300"
            } shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
          />
          {errors.confirmPassword && (
            <p
              data-testid="register-confirm-password-error"
              id="confirm-password-error"
              className="mt-1 text-sm text-red-600"
            >
              {errors.confirmPassword}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end">
          <div className="text-sm">
            <a
              data-testid="register-login-link"
              href="/auth/login"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Already have an account? Log in
            </a>
          </div>
        </div>

        <div>
          <Button
            data-testid="register-submit-button"
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4"
          >
            {isLoading ? "Creating account..." : "Register"}
          </Button>
        </div>
      </form>
    </div>
  );
}
