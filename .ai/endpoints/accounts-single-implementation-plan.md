# API Endpoint Implementation Plan: Get Single Account

## 1. Endpoint Overview

The `GET /api/accounts/:id` endpoint retrieves a single account with its calculated balance for the authenticated user. This endpoint leverages the `view_accounts_with_balance` database view to efficiently return account details including currency information and real-time balance calculation based on transaction history and category types.

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/accounts/:id`
- **Parameters**:
  - **Required**:
    - `id` (integer, path parameter): Account ID to retrieve
  - **Optional**: None
- **Request Body**: None (GET request)
- **Authentication**: Required (JWT token via Supabase Auth)

## 3. Used Types

```typescript
// Response types
import type { AccountDTO, ApiResponse, ErrorDTO } from "../types";

// Input validation
interface GetAccountParams {
  id: string; // Will be parsed to number
}
```

## 4. Response Details

**Success Response (200 OK)**:

```json
{
  "data": {
    "id": 1,
    "user_id": "uuid-here",
    "name": "Main Bank Account",
    "currency_id": 1,
    "currency_code": "PLN",
    "currency_description": "Polish Zloty",
    "tag": "BANK",
    "balance": 1500.5,
    "active": true,
    "created_at": "2025-10-01T10:00:00Z",
    "updated_at": "2025-10-01T10:00:00Z"
  }
}
```

**Error Responses**:

- `400 Bad Request`: Invalid account ID format
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Account not found or doesn't belong to user
- `500 Internal Server Error`: Database or server errors

## 5. Data Flow

1. **Request Processing**:
   - Extract account ID from path parameters
   - Validate authentication token via Supabase Auth
   - Parse and validate account ID as positive integer

2. **Data Retrieval**:
   - Query `view_accounts_with_balance` using Supabase client
   - RLS policies automatically filter results to authenticated user
   - Return single account record with calculated balance

3. **Response Formation**:
   - Transform database result to AccountDTO format
   - Wrap in ApiResponse structure
   - Return JSON response with appropriate status code

## 6. Security Considerations

- **Authentication**: Verify JWT token via `auth.uid()` in Supabase
- **Authorization**: RLS policies ensure users can only access their own accounts
- **Input Validation**: Sanitize and validate account ID parameter
- **Data Isolation**: Database-level user isolation via `user_id` filtering in RLS
- **SQL Injection Prevention**: Use Supabase client parameterized queries

## 7. Error Handling

| Scenario                  | Status Code | Error Code           | Response                       |
| ------------------------- | ----------- | -------------------- | ------------------------------ |
| Invalid account ID format | 400         | `INVALID_ACCOUNT_ID` | "Invalid account ID format"    |
| Missing auth token        | 401         | `UNAUTHORIZED`       | "Authentication required"      |
| Invalid auth token        | 401         | `INVALID_TOKEN`      | "Invalid authentication token" |
| Account not found         | 404         | `ACCOUNT_NOT_FOUND`  | "Account not found"            |
| Database connection error | 500         | `DATABASE_ERROR`     | "Internal server error"        |
| Unexpected server error   | 500         | `INTERNAL_ERROR`     | "Internal server error"        |

## 8. Performance Considerations

- **Database Optimization**: Uses optimized `view_accounts_with_balance` with pre-calculated balance
- **Index Usage**: Leverages `idx_accounts_user_active` index for efficient user-based filtering
- **Single Query**: One database query due to database view design
- **Response Size**: Minimal data transfer with focused AccountDTO structure
- **Caching**: Consider application-level caching for frequently accessed accounts

## 9. Implementation Steps

1. **Create Account Service** (`src/lib/services/AccountService.ts`):

   ```typescript
   export class AccountService {
     async getAccountById(id: number, userId: string): Promise<AccountDTO | null>;
   }
   ```

2. **Create API Route Handler** (`src/pages/api/accounts/[id].ts`):
   - Implement GET method handler
   - Add parameter validation and parsing
   - Integrate authentication middleware
   - Handle error cases with appropriate status codes

3. **Input Validation**:
   - Validate `id` parameter is positive integer
   - Return 400 for invalid formats
   - Use try-catch for parsing errors

4. **Authentication Integration**:
   - Use Supabase auth helper to verify JWT token
   - Extract `user_id` from authenticated session
   - Return 401 for authentication failures

5. **Database Integration**:
   - Query `view_accounts_with_balance` filtered by user_id and account_id
   - Use Supabase client with RLS enabled
   - Handle database connection errors

6. **Response Formatting**:
   - Transform database result to AccountDTO
   - Wrap in ApiResponse structure
   - Return appropriate HTTP status codes

7. **Error Handling Implementation**:
   - Implement standardized error response format
   - Add logging for debugging and monitoring
   - Handle edge cases (deleted accounts, etc.)

8. **Testing Strategy**:
   - Unit tests for service layer
   - Integration tests for API endpoint
   - Authentication and authorization test cases
   - Error scenario validation

9. **Documentation**:
   - Update API documentation
   - Add JSDoc comments to service methods
   - Include usage examples
