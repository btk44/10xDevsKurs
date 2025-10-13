import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { RegisterFormSchema } from "../../../lib/validation/schemas";
import { AuthService } from "../../../lib/services/AuthService";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();

    // Validate request body
    const result = RegisterFormSchema.safeParse(body);
    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: result.error.format(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { email, password } = result.data;

    const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });
    const authService = new AuthService(supabase);

    const { data, error } = await authService.signUp(email, password);

    if (error) {
      return new Response(JSON.stringify({ error: authService.handleAuthError(error) }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if email confirmation is required
    if (data?.user?.identities?.length === 0) {
      return new Response(
        JSON.stringify({
          message: "Registration successful. Please check your email to confirm your account.",
          requiresEmailConfirmation: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        user: data.user,
        message: "Registration successful.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
