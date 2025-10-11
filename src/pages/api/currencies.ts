import type { APIRoute } from "astro";
import type { ApiCollectionResponse, ApiErrorResponse, CurrencyDTO } from "../../types";
import { CurrencyService } from "../../lib/services/CurrencyService";

export const prerender = false;

// TODO: Replace with proper authentication later
// const DEFAULT_USER_ID = "default-user-id";

/**
 * GET /api/currencies
 * Retrieves all active currencies available in the system
 *
 * @returns {ApiCollectionResponse<CurrencyDTO>} Collection of active currencies
 * @throws {ApiErrorResponse} 500 for server errors
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Initialize currency service and fetch currencies
    const currencyService = new CurrencyService(locals.supabase);
    const currencies = await currencyService.getAllActiveCurrencies();

    // Return successful response
    const response: ApiCollectionResponse<CurrencyDTO> = {
      data: currencies,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes
      },
    });
  } catch {
    // Return generic server error response
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while processing your request",
        },
      } satisfies ApiErrorResponse),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
