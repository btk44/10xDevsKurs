# API Endpoint Implementation Plan: DELETE /api/transactions/:id

## 1. Endpoint Overview

This endpoint performs a soft delete operation on a specific transaction by setting its `active` flag to `false`. The transaction remains in the database for audit purposes but is excluded from all business operations and queries. Only the authenticated user who owns the transaction can delete it.

**Key Features**:
- Soft delete implementation (sets `active = false`)
- User ownership validation through RLS policies
- Maintains data integrity for reporting and audit purposes
- Returns 204 No Content on successful deletion

## 2. Request Details

- **HTTP Method**: DELETE
- **URL Structure**: `/api/transactions/:id`
- **Authentication**: Required (JWT token)

**Path Parameters**:
- `id` (integer, required): The unique identifier of the transaction to delete

**Request Body**: None

**Request Headers**:
- `Authorization: Bearer <jwt_token>` (required)

## 3. Used Types

**From `src/types.ts`**:
- No specific command model needed for this operation
- Will use Supabase client types for database operations
- Error handling will use `ErrorDTO` and `ApiErrorResponse`

**Internal Validation**:
```typescript
interface DeleteTransactionParams {
  id: number;
  userId: string; // from auth context
}
```

## 4. Response Details

**Success Response (204 No Content)**:
- Status: 204
- Body: Empty
- Headers: Standard CORS and security headers

**Error Responses**:
- `400 Bad Request`: Invalid transaction ID format
- `401 Unauthorized`: Missing or invalid authentication token  
- `404 Not Found`: Transaction not found or doesn't belong to user
- `500 Internal Server Error`: Database or server errors

## 5. Data Flow

```
1. Extract transaction ID from URL path parameter
2. Validate ID format (positive integer)
3. Authenticate user and extract user_id from JWT
4. Call TransactionService.deleteTransaction(id, user_id)
5. Service verifies transaction exists and belongs to user (via RLS)
6. Service updates transaction.active = false
7. Return 204 No Content on success
```

**Database Operations**:
```sql
UPDATE transactions 
SET active = false, updated_at = NOW()
WHERE id = $1 AND user_id = $2 AND active = true
```

**RLS Policy Enforcement**:
- Supabase RLS automatically ensures user can only access their own transactions
- No additional authorization checks needed at application level

## 6. Security Considerations

**Authentication**:
- JWT token validation through Astro middleware
- Extract user_id from authenticated session
- Reject requests without valid authentication

**Authorization**:
- RLS policies ensure users can only delete their own transactions
- No additional role-based permissions needed for MVP

**Input Validation**:
- Validate transaction ID is a positive integer
- Sanitize input to prevent injection attacks
- Use parameterized queries through Supabase client

**Data Protection**:
- Soft delete preserves data for audit purposes
- No sensitive data exposed in error messages
- Transaction remains associated with user_id for compliance

## 7. Error Handling

**Client Errors (4xx)**:

```typescript
// 400 Bad Request - Invalid ID format
{
  "error": {
    "code": "INVALID_TRANSACTION_ID",
    "message": "Transaction ID must be a positive integer"
  }
}

// 401 Unauthorized - Missing/invalid token
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}

// 404 Not Found - Transaction not found or not owned by user
{
  "error": {
    "code": "TRANSACTION_NOT_FOUND", 
    "message": "Transaction not found"
  }
}
```

**Server Errors (5xx)**:
```typescript
// 500 Internal Server Error - Database errors
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

**Error Logging Strategy**:
- Log authentication failures with IP and timestamp
- Log unauthorized access attempts
- Log database errors with full context
- Do not log sensitive user data

## 8. Performance Considerations

**Database Performance**:
- Single UPDATE operation with WHERE clause on indexed columns
- RLS policies use indexed user_id for efficient filtering
- No complex joins or aggregations required

**Optimization Strategies**:
- Use conditional WHERE clause to avoid unnecessary updates
- Index on (user_id, active) already exists for efficient lookups
- Consider connection pooling for high-traffic scenarios

**Expected Performance**:
- Target response time: < 50ms
- Database operation: < 10ms (single UPDATE on indexed columns)
- Network latency depends on client location

## 9. Implementation Steps

### Step 1: Create/Update TransactionService
```typescript
// src/lib/services/TransactionService.ts
export class TransactionService {
  static async deleteTransaction(id: number, userId: string): Promise<void> {
    const { error } = await supabaseClient
      .from('transactions')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .eq('active', true);

    if (error) {
      throw new Error(`Failed to delete transaction: ${error.message}`);
    }
  }
}
```

### Step 2: Create Validation Schemas
```typescript
// src/lib/validation/schemas.ts
export const deleteTransactionParamsSchema = z.object({
  id: z.coerce.number().int().positive({
    message: "Transaction ID must be a positive integer"
  })
});
```

### Step 3: Implement API Route Handler
```typescript
// src/pages/api/transactions/[id].ts
import type { APIRoute } from 'astro';
import { TransactionService } from '../../lib/services/TransactionService';
import { deleteTransactionParamsSchema } from '../../lib/validation/schemas';

export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Validate authentication
    if (!locals.user?.id) {
      return new Response(JSON.stringify({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate and parse parameters
    const validationResult = deleteTransactionParamsSchema.safeParse(params);
    if (!validationResult.success) {
      return new Response(JSON.stringify({
        error: {
          code: 'INVALID_TRANSACTION_ID',
          message: 'Transaction ID must be a positive integer'
        }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = validationResult.data;

    // Perform soft delete
    await TransactionService.deleteTransaction(id, locals.user.id);

    // Return 204 No Content
    return new Response(null, { status: 204 });

  } catch (error) {
    console.error('Error deleting transaction:', error);
    
    return new Response(JSON.stringify({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

### Step 4: Update Middleware for Authentication
```typescript
// Ensure src/middleware/index.ts properly extracts user from JWT
// and makes it available in locals.user
```

### Step 5: Add Error Handling and Logging
```typescript
// Add structured logging for security events
// Implement rate limiting if needed
// Add monitoring for delete operations
```

### Step 6: Testing Strategy
```typescript
// Unit tests for TransactionService.deleteTransaction
// Integration tests for API endpoint
// Test cases:
// - Valid deletion (returns 204)
// - Invalid ID format (returns 400)
// - Missing authentication (returns 401)
// - Transaction not found (returns 404)
// - Transaction belongs to other user (returns 404)
// - Database errors (returns 500)
```

### Step 7: Documentation and Deployment
- Update API documentation with endpoint details
- Add endpoint to OpenAPI/Swagger specification
- Deploy to staging for testing
- Monitor error rates and performance metrics

## 10. Additional Considerations

**Audit Trail**:
- Consider adding deleted_at timestamp field for audit purposes
- Track who deleted the transaction and when
- Maintain referential integrity with related records

**Cascading Effects**:
- Soft-deleted transactions still count in balance calculations
- Update balance calculation logic to filter active=true
- Ensure monthly summary views exclude deleted transactions

**Recovery Process**:
- Implement "undelete" functionality if business requires it
- Provide admin interface to view deleted transactions
- Consider retention policies for truly removing old deleted records

**Monitoring**:
- Track deletion rates and patterns
- Alert on unusual deletion activity
- Monitor performance impact of soft delete queries
