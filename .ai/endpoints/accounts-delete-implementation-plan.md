# API Endpoint Implementation Plan: DELETE /api/accounts/:id

## 1. Endpoint Overview

This endpoint implements soft deletion of user accounts. When called, it sets the account's `active` flag to `false` and cascades this soft delete to all related transactions. The endpoint follows RESTful conventions and returns a 204 No Content status on successful deletion.

**Key Features:**

- Soft delete implementation (preserves data for audit/recovery)
- Cascading delete to related transactions
- User isolation through RLS and ownership validation
- Atomic operation using database transactions

## 2. Request Details

- **HTTP Method**: DELETE
- **URL Structure**: `/api/accounts/:id`
- **Authentication**: Required (JWT token)
- **Parameters**:
  - **Required**:
    - `id` (integer): Account ID from path parameter
  - **Optional**: None
- **Request Body**: None
- **Content-Type**: Not applicable

## 3. Used Types

```typescript
// From database types
import type { Tables } from "../db/database.types";

// Internal types for service layer
interface SoftDeleteResult {
  accountsAffected: number;
  transactionsAffected: number;
}
```

**Notes**: No DTOs or Command Models needed since there's no request body and the response is 204 No Content.

## 4. Response Details

**Success Response:**

- **Status Code**: 204 No Content
- **Body**: Empty
- **Headers**: Standard Astro headers

**Error Responses:**

- **401 Unauthorized**: Missing or invalid authentication token
- **404 Not Found**: Account not found or doesn't belong to user
- **500 Internal Server Error**: Database operation failed

## 5. Data Flow

```
1. Extract account ID from path parameters
2. Validate ID format (positive integer)
3. Authenticate user and extract user_id
4. Query account to verify:
   - Account exists
   - Account belongs to authenticated user
   - Account is currently active
5. Begin database transaction
6. Soft delete account (set active = false)
7. Soft delete related transactions (set active = false)
8. Commit transaction
9. Return 204 No Content
```

**Database Operations:**

1. `SELECT` account by ID and user_id (with active = true)
2. `UPDATE` accounts SET active = false WHERE id = :id AND user_id = :user_id
3. `UPDATE` transactions SET active = false WHERE account_id = :id AND user_id = :user_id AND active = true

## 6. Security Considerations

**Authentication & Authorization:**

- Verify JWT token presence and validity
- Extract user_id from authenticated session
- Use RLS policies to ensure data isolation
- Validate account ownership before deletion

**Data Protection:**

- Use parameterized queries (handled by Supabase client)
- Implement proper error handling to avoid information disclosure
- Log security-related events for audit purposes

**Access Control:**

- Users can only delete their own accounts
- RLS policies provide additional protection layer
- No privilege escalation possible through this endpoint

## 7. Error Handling

**Client Errors (4xx):**

- **400 Bad Request**: Invalid account ID format
- **401 Unauthorized**: Missing or invalid authentication token
- **404 Not Found**: Account not found or doesn't belong to user

**Server Errors (5xx):**

- **500 Internal Server Error**: Database transaction failure, connection issues

**Error Response Format:**

```typescript
{
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account not found or access denied"
  }
}
```

**Logging Strategy:**

- Log all deletion attempts with user_id and account_id
- Log authentication failures with timestamp
- Log database errors with full context
- Use structured logging for better monitoring

## 8. Performance Considerations

**Database Performance:**

- Leverage existing indexes on (user_id, active) for fast lookups
- Use single transaction to minimize database round trips
- RLS policies are optimized with proper indexes

**Optimization Opportunities:**

- Consider connection pooling for high-load scenarios
- Monitor query performance on transactions table updates
- Implement proper error caching to reduce database load

**Scalability:**

- Operation scales linearly with number of related transactions
- Database indexes ensure consistent performance as data grows
- Soft delete approach avoids foreign key constraint issues

## 9. Implementation Steps

### Step 1: Create Account Service Method

```typescript
// src/lib/services/AccountService.ts
async softDeleteAccount(accountId: number, userId: string): Promise<void>
```

### Step 2: Implement Path Parameter Validation

- Extract and validate account ID from URL parameters
- Ensure ID is positive integer
- Return 400 for invalid formats

### Step 3: Implement Authentication Check

- Verify JWT token using Astro middleware
- Extract user_id from authentication context
- Return 401 for authentication failures

### Step 4: Implement Account Ownership Validation

- Query account with user_id and active = true
- Return 404 if account not found or doesn't belong to user
- Verify account is currently active

### Step 5: Implement Soft Delete Logic

- Start database transaction
- Update accounts table: SET active = false
- Update transactions table: SET active = false for related records
- Commit transaction or rollback on failure

### Step 6: Implement Error Handling

- Catch and handle database errors
- Return appropriate HTTP status codes
- Log errors with proper context
- Return 204 No Content on success

### Step 7: Add Comprehensive Logging

- Log successful deletions with metadata
- Log failed attempts with reasons
- Include performance metrics
- Structure logs for monitoring tools

### Step 8: Create API Route Handler

```typescript
// src/pages/api/accounts/[id].ts
export const DELETE: APIRoute = async ({ params, locals }) => {
  // Implementation following above steps
};
```

### Step 9: Add Integration Tests

- Test successful soft delete scenarios
- Test authentication and authorization failures
- Test invalid input handling
- Test database transaction rollback scenarios

### Step 10: Performance Testing & Monitoring

- Test with varying numbers of related transactions
- Monitor database query performance
- Set up alerts for high error rates
- Validate RLS policy performance impact
