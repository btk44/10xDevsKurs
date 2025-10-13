import { useState } from "react";
import { Button } from "../ui/button";
import { LoginFormSchema } from "../../lib/validation/schemas";
import type { z } from "zod";

type LoginFormData = z.infer<typeof LoginFormSchema>;
interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const formData: LoginFormData = { email, password };
    const result = LoginFormSchema.safeParse(formData);

    if (!result.success) {
      const formattedErrors = result.error.format();
      const newErrors: FormErrors = {};

      if (formattedErrors.email?._errors) {
        newErrors.email = formattedErrors.email._errors[0];
      }

      if (formattedErrors.password?._errors) {
        newErrors.password = formattedErrors.password._errors[0];
      }

      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({
          general: data.error || "Invalid email or password",
        });
        setIsLoading(false);
        return;
      }

      // Redirect to the main page on successful login
      window.location.href = "/";
    } catch (err) {
      setErrors({
        general: "An unexpected error occurred. Please try again later.",
      });
      // eslint-disable-next-line no-console
      console.error("Login error:", err);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{errors.general}</div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            aria-invalid={!!errors.password}
          />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <a href="/auth/reset-password" className="font-medium text-indigo-600 hover:text-indigo-500">
              Forgot password?
            </a>
          </div>
          <div className="text-sm">
            <a href="/auth/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              Register
            </a>
          </div>
        </div>

        <div>
          <Button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4">
            {isLoading ? "Logging in..." : "Log in"}
          </Button>
        </div>
      </form>
    </div>
  );
}
