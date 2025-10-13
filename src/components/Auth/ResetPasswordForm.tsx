import { useState } from "react";
import { Button } from "../ui/button";

export default function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      // This will be implemented in the next step
      // For now, we'll just simulate a loading state and success
      setTimeout(() => {
        setIsLoading(false);
        setSuccess(true);
      }, 1000);
    } catch (err) {
      setError("An unexpected error occurred. Please try again later.");
      // eslint-disable-next-line no-console
      console.error("Password reset error:", err);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {success ? (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p>Password reset link has been sent to your email address. Please check your inbox.</p>
          <div className="mt-4">
            <a href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Return to login
            </a>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}

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
              aria-invalid={!!error}
            />
            <p className="mt-1 text-xs text-gray-500">Enter the email address associated with your account</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <a href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Back to login
              </a>
            </div>
          </div>

          <div>
            <Button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4">
              {isLoading ? "Sending reset link..." : "Reset Password"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
