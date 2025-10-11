# API Endpoint Implementation Plan: PATCH /api/accounts/:id

## 1. Endpoint Overview

This endpoint updates an existing account belonging to the authenticated user. It allows partial updates of account properties including name, currency assignment, and tag. The endpoint enforces data isolation through Row Level Security (RLS) and returns the updated account with calculated balance from the database view.

**Key Features:**

- Partial update support (all fields optional)
- Currency validation against existing currencies
- User ownership enforcement via RLS
- Calculated balance included in response
- Input validation and sanitization

## 2. Request Details

- **HTTP Method**: PATCH
- **URL Structure**: `/api/accounts/:id`
- **Authentication**: Required (Bearer token)

**Parameters:**

- **Required**:
  - `id` (path parameter, integer): Account ID to update

- **Optional Request Body Fields**:
  - `name` (string): Account name, max 100 characters, cannot be empty after trim
  - `currency_id` (integer): Must reference existing currency in currencies table
  - `tag` (string): Account tag, max 10 characters, nullable

**Request Body Example:**

```json
{
  "name": "Updated Savings Account",
  "currency_id": 2,
  "tag": "SAVE"
}
```

## 3. Used Types

**Input Types:**

- `UpdateAccountCommand`: Partial update command model from types.ts
  ```typescript
  type UpdateAccountCommand = Partial<Pick<TablesUpdate<"accounts">, "name" | "currency_id" | "tag">>;
  ```

**Output Types:**

- `AccountDTO`: Complete account data with balance and currency details
- `ApiResponse<AccountDTO>`: Standard response wrapper
- `ApiErrorResponse`: Error response wrapper

## 4. Response Details

**Success Response (200 OK):**

```json
{
  "data": {
    "id": 2,
    "user_id": "uuid-here",
    "name": "Updated Savings Account",
    "currency_id": 2,
    "currency_code": "EUR",
    "currency_description": "Euro",
    "tag": "SAVE",
    "balance": 1500.75,
    "active": true,
    "created_at": "2025-10-10T10:00:00Z",
    "updated_at": "2025-10-10T11:30:00Z"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Validation errors, invalid currency_id
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Account not found or doesn't belong to user
- `500 Internal Server Error`: Database or server errors

## 5. Data Flow

1. **Request Processing:**
   - Extract and validate path parameter `id`
   - Parse and validate request body against `UpdateAccountCommand`
   - Extract user ID from authentication token

2. **Business Logic (AccountsService):**
   - Validate currency_id exists (if provided)
   - Update account record in database
   - RLS automatically filters by user_id

3. **Response Generation:**
   - Query `view_accounts_with_balance` for updated account data
   - Transform to `AccountDTO`
   - Return wrapped in `ApiResponse`

**Database Interactions:**

1. `UPDATE accounts SET ... WHERE id = ? AND user_id = ?`
2. `SELECT * FROM view_accounts_with_balance WHERE id = ? AND user_id = ?`
3. Optional: `SELECT id FROM currencies WHERE id = ?` (for validation)

## 6. Security Considerations

**Authentication & Authorization:**

- Bearer token validation required
- User ID extracted from `auth.uid()`
- RLS policies enforce user data isolation

**Input Validation:**

- Sanitize all string inputs (trim whitespace)
- Validate data types and constraints
- Check currency_id against currencies table
- Prevent SQL injection through parameterized queries

**Data Protection:**

- RLS prevents access to other users' accounts
- No sensitive data exposure in error messages
- Audit trail via updated_at timestamp

## 7. Error Handling

**Validation Errors (400 Bad Request):**

- Empty name after trimming
- Name exceeding 100 characters
- Tag exceeding 10 characters
- Invalid currency_id (not found in currencies table)
- Invalid data types

**Authentication Errors (401 Unauthorized):**

- Missing Authorization header
- Invalid or expired token
- Token parsing failures

**Not Found Errors (404 Not Found):**

- Account ID doesn't exist
- Account belongs to different user (RLS filtering)

**Server Errors (500 Internal Server Error):**

- Database connection failures
- Unexpected database errors
- Service layer exceptions

**Error Response Format:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "name",
        "message": "Account name cannot be empty"
      }
    ]
  }
}
```

## 8. Performance Considerations

**Database Performance:**

- Update operation uses primary key (id) with user_id filter
- Indexes exist on `(user_id, active)` for efficient filtering
- View query benefits from existing composite indexes

**Optimization Strategies:**

- Single database transaction for update + fetch
- Minimal data transfer (only changed fields)
- Efficient view query with pre-calculated balance

**Expected Performance:**

- Update operation: < 50ms (per database requirements)
- View query: < 100ms for balance calculation
- Total endpoint response: < 150ms

## 9. Implementation Steps

1. **Create Astro API Route**
   - Create `/src/pages/api/accounts/[id].ts`
   - Implement PATCH method handler
   - Set up request/response types

2. **Input Validation Layer**
   - Validate path parameter `id` as positive integer
   - Parse and validate request body against `UpdateAccountCommand`
   - Implement field-specific validation rules

3. **Authentication Middleware**
   - Extract and validate Bearer token
   - Get user ID from Supabase auth
   - Handle authentication errors

4. **Business Logic Service**
   - Create or extend `AccountsService` class
   - Implement `updateAccount(id, userId, updateData)` method
   - Add currency validation logic
   - Handle RLS-filtered updates

5. **Database Operations**
   - Update account record with provided fields
   - Query `view_accounts_with_balance` for response data
   - Handle database errors and constraints

6. **Response Formatting**
   - Transform database result to `AccountDTO`
   - Wrap in `ApiResponse` structure
   - Set appropriate HTTP status codes

7. **Error Handling Implementation**
   - Catch and classify different error types
   - Format error responses consistently
   - Log errors appropriately

8. **Testing**
   - Unit tests for validation logic
   - Integration tests for database operations
   - End-to-end tests for complete request flow
   - Security tests for RLS enforcement

**Key Files to Create/Modify:**

- `/src/pages/api/accounts/[id].ts` (main endpoint)
- `/src/lib/services/AccountsService.ts` (business logic)
- `/src/lib/validation/accounts.ts` (validation rules)
- Tests for each component

**Dependencies:**

- Supabase client for database operations
- Authentication utilities
- Validation libraries
- Error handling utilities
