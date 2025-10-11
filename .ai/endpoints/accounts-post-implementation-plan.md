# API Endpoint Implementation Plan: POST /api/accounts

## 1. Endpoint Overview

The POST /api/accounts endpoint creates a new financial account for the authenticated user. This endpoint allows users to set up accounts with different currencies for tracking their financial transactions. The account will be created with an initial balance of 0.00, calculated from the `view_accounts_with_balance` database view.

## 2. Request Details

- **HTTP Method**: POST
- **URL Structure**: `/api/accounts`
- **Authentication**: Required (JWT token)
- **Content-Type**: `application/json`

### Parameters:

- **Required**:
  - `name` (string): Account name, max 100 characters, cannot be empty after trim
  - `currency_id` (number): Must exist in currencies table
- **Optional**:
  - `tag` (string): Account tag/code, max 10 characters

### Request Body Example:

```json
{
  "name": "Savings Account",
  "currency_id": 1,
  "tag": "SAV"
}
```

## 3. Used Types

### Command Models:

- `CreateAccountCommand`: Request body validation type

```typescript
type CreateAccountCommand = Pick<TablesInsert<"accounts">, "name" | "currency_id" | "tag">;
```

### Response DTOs:

- `AccountDTO`: Response data structure with balance calculation
- `ApiResponse<AccountDTO>`: Success response wrapper
- `ApiErrorResponse`: Error response wrapper
- `ErrorDTO`: Error details structure
- `ValidationErrorDetail`: Field-level validation errors

## 4. Response Details

### Success Response (201 Created):

```json
{
  "data": {
    "id": 2,
    "user_id": "uuid-here",
    "name": "Savings Account",
    "currency_id": 1,
    "currency_code": "PLN",
    "currency_description": "Polish Zloty",
    "tag": "SAV",
    "balance": 0.0,
    "active": true,
    "created_at": "2025-10-10T10:00:00Z",
    "updated_at": "2025-10-10T10:00:00Z"
  }
}
```

### Error Responses:

- **400 Bad Request**: Validation errors
- **401 Unauthorized**: Missing/invalid authentication
- **404 Not Found**: Currency does not exist
- **500 Internal Server Error**: Database or server errors

## 5. Data Flow

1. **Request Validation**: Validate request body against `CreateAccountCommand` schema
2. **Authentication Check**: Extract `user_id` from JWT token via `auth.uid()`
3. **Currency Validation**: Verify `currency_id` exists in currencies table
4. **Account Creation**: Insert new account record with `user_id` from auth context
5. **Balance Calculation**: Query `view_accounts_with_balance` to get account with calculated balance
6. **Response Formation**: Return `AccountDTO` wrapped in `ApiResponse`

### Database Interactions:

1. **Currency Check**: `SELECT id FROM currencies WHERE id = ? AND active = true`
2. **Account Insert**: `INSERT INTO accounts (user_id, name, currency_id, tag) VALUES (?, ?, ?, ?)`
3. **Account Retrieval**: `SELECT * FROM view_accounts_with_balance WHERE id = ? AND user_id = ?`

## 6. Security Considerations

### Authentication & Authorization:

- JWT token validation required
- Extract `user_id` from `auth.uid()` - never trust client-provided user_id
- RLS policies ensure user can only create accounts for themselves

### Input Validation:

- Sanitize and validate all input fields
- Prevent SQL injection through parameterized queries
- Validate currency_id exists before account creation
- Trim whitespace from name field
- Enforce length limits on all string fields

### Data Protection:

- Use Supabase RLS for data isolation
- Validate foreign key relationships server-side
- Log security-related errors without exposing sensitive data

## 7. Error Handling

### Validation Errors (400):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "name",
        "message": "Name is required and cannot be empty"
      },
      {
        "field": "currency_id",
        "message": "Currency must exist"
      }
    ]
  }
}
```

### Authentication Errors (401):

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### Not Found Errors (404):

```json
{
  "error": {
    "code": "CURRENCY_NOT_FOUND",
    "message": "Currency does not exist"
  }
}
```

### Server Errors (500):

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## 8. Performance Considerations

### Optimization Strategies:

- Use `view_accounts_with_balance` for efficient balance calculation
- Leverage database indexes on `user_id` and `currency_id`
- Implement proper error handling to avoid unnecessary database calls
- Consider connection pooling for database operations

### Potential Bottlenecks:

- Currency validation query could be cached
- Balance calculation in view should be optimized with proper indexing
- Database connection limits under high concurrency

## 9. Implementation Steps

### Step 1: Create Account Service

```typescript
// src/lib/services/AccountService.ts
export class AccountService {
  async createAccount(command: CreateAccountCommand, userId: string): Promise<AccountDTO>;
  async validateCurrency(currencyId: number): Promise<boolean>;
}
```

### Step 2: Implement Input Validation

```typescript
// Validate CreateAccountCommand
const validateCreateAccountCommand = (data: unknown): CreateAccountCommand => {
  // Implement validation logic
  // Check required fields, length limits, data types
};
```

### Step 3: Create API Route Handler

```typescript
// src/pages/api/accounts.ts
export async function POST({ request }: APIContext): Promise<Response> {
  try {
    // 1. Parse and validate request body
    // 2. Check authentication
    // 3. Validate currency exists
    // 4. Create account via service
    // 5. Return response
  } catch (error) {
    // Handle errors appropriately
  }
}
```

### Step 4: Database Operations

- Implement currency validation query
- Implement account insertion with proper RLS
- Query view_accounts_with_balance for response data

### Step 5: Error Handling Implementation

- Create error response helpers
- Implement proper error logging
- Map database errors to appropriate HTTP status codes

### Step 6: Testing

- Unit tests for validation logic
- Integration tests for database operations
- End-to-end API tests for all error scenarios
- Security tests for authentication and RLS

### Step 7: Documentation

- Update API documentation
- Document error codes and responses
- Create usage examples for frontend team
