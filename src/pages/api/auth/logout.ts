import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { AuthService } from "../../../lib/services/AuthService";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request, redirect }) => {
  try {
    const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });
    const authService = new AuthService(supabase);

    const { error } = await authService.signOut();

    if (error) {
      return new Response(JSON.stringify({ error: authService.handleAuthError(error) }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return redirect("/auth/login");
  } catch (error) {
    console.error("Logout error:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
