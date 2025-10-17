# API Endpoint Implementation Plan: GET /api/transactions/:id

## 1. Endpoint Overview

The GET /api/transactions/:id endpoint retrieves a single transaction by its ID with enriched data including account name, category name/type, and currency code. This endpoint enforces user data isolation through Row Level Security (RLS) and returns detailed transaction information for authenticated users.

**Purpose**: Fetch a specific transaction with related entity details for display in the UI

**Authentication**: Required (Supabase auth token)

**Data Enrichment**: Joins with accounts, categories, and currencies tables to provide complete transaction context

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/transactions/:id`
- **Path Parameters**:
  - `id` (integer, required): Transaction ID to retrieve
- **Query Parameters**: None
- **Request Headers**:
  - `Authorization: Bearer <token>` (required)
- **Request Body**: None

## 3. Used Types

### DTOs and Response Models

- `TransactionDTO`: Response data model with joined information
- `ApiResponse<TransactionDTO>`: Standard success response wrapper
- `ApiErrorResponse`: Standard error response wrapper
- `ErrorDTO`: Error details structure

### Internal Types

- `Tables<"transactions">`: Database table row type
- `CategoryType`: Enum for category types ('income' | 'expense')

## 4. Response Details

### Success Response (200 OK)

```json
{
  "data": {
    "id": 1,
    "user_id": "uuid-here",
    "transaction_date": "2025-10-10T14:30:00Z",
    "account_id": 1,
    "account_name": "Main Bank Account",
    "category_id": 2,
    "category_name": "Food",
    "category_type": "expense",
    "amount": 45.5,
    "currency_id": 1,
    "currency_code": "PLN",
    "comment": "Lunch at restaurant",
    "active": true,
    "created_at": "2025-10-10T14:30:00Z",
    "updated_at": "2025-10-10T14:30:00Z"
  }
}
```

### Error Responses

- **400 Bad Request**: Invalid transaction ID format
- **401 Unauthorized**: Missing or invalid authentication token
- **404 Not Found**: Transaction not found or doesn't belong to user
- **500 Internal Server Error**: Database or server errors

## 5. Data Flow

1. **Request Validation**:
   - Validate path parameter `id` is a positive integer
   - Extract and validate authentication token from headers

2. **Authentication**:
   - Get user from Supabase auth token
   - Extract `user_id` for RLS filtering

3. **Database Query**:
   - Query transactions table with joins to accounts, categories, and currencies
   - Apply RLS filtering (`user_id` match and `active = true`)
   - Return enriched transaction data

4. **Response Mapping**:
   - Map database result to `TransactionDTO`
   - Wrap in `ApiResponse<TransactionDTO>`
   - Return with appropriate HTTP status

## 6. Security Considerations

### Authentication

- Validate Supabase auth token in request headers
- Ensure user is authenticated before processing request
- Extract `user_id` from authenticated user context

### Authorization

- RLS automatically enforces user data isolation
- Only transactions belonging to authenticated user are accessible
- Soft-deleted transactions (`active = false`) are excluded

### Input Validation

- Validate transaction ID is a positive integer
- Sanitize path parameters to prevent injection attacks
- Validate request headers for proper authentication format

### Data Protection

- No sensitive data exposure (user only sees own transactions)
- RLS policies enforce database-level security
- Proper error messages without information leakage

## 7. Error Handling

### Validation Errors (400)

- Invalid transaction ID format (non-integer, negative, zero)
- Malformed request structure

### Authentication Errors (401)

- Missing Authorization header
- Invalid or expired auth token
- Token format errors

### Not Found Errors (404)

- Transaction ID doesn't exist
- Transaction belongs to different user (RLS filters it out)
- Transaction is soft-deleted (`active = false`)

### Server Errors (500)

- Database connection failures
- Supabase service errors
- Unexpected application errors

### Error Response Format

```json
{
  "error": {
    "code": "TRANSACTION_NOT_FOUND",
    "message": "Transaction not found",
    "details": {}
  }
}
```

## 8. Performance Considerations

### Database Optimization

- Single query with joins instead of multiple queries
- Leverages existing indexes on `transactions(user_id, active)`
- RLS policies use efficient user_id filtering

### Query Structure

- Use selective column projection to minimize data transfer
- Join only necessary related tables (accounts, categories, currencies)
- Limit result to single row with efficient WHERE clause

### Caching Strategy

- Consider response caching for frequently accessed transactions
- Cache authentication results to reduce auth overhead
- Implement proper cache invalidation on transaction updates

## 9. Implementation Steps

### Step 1: Create TransactionService

Create `src/lib/services/TransactionService.ts` with method to fetch single transaction with joins:

```typescript
async getTransactionById(transactionId: number, userId: string): Promise<TransactionDTO | null>
```

### Step 2: Implement Database Query

Build query with proper joins to accounts, categories, and currencies tables:

- Join accounts table for account_name
- Join categories table for category_name and category_type
- Join currencies table for currency_code
- Apply user_id and active filters

### Step 3: Create API Route Handler

Implement `src/pages/api/transactions/[id].ts`:

- Extract transaction ID from path parameters
- Validate ID format and authentication
- Call TransactionService method
- Handle response mapping and error cases

### Step 4: Add Input Validation

- Validate transaction ID is positive integer
- Add authentication token validation
- Implement proper error handling for validation failures

### Step 5: Add Error Handling

- Map service errors to appropriate HTTP status codes
- Implement consistent error response format
- Add logging for debugging and monitoring

### Step 6: Add Response Mapping

- Map database result to TransactionDTO structure
- Wrap response in ApiResponse format
- Ensure all joined data is properly included

### Step 7: Security Implementation

- Verify RLS policies are enforced
- Add authentication middleware integration
- Test user data isolation

### Step 8: Testing and Validation

- Unit tests for service methods
- Integration tests for API endpoint
- Test error scenarios and edge cases
- Validate performance with database indexes

### Step 9: Documentation

- Add JSDoc comments to service methods
- Document API endpoint behavior
- Update API documentation with examples

### Step 10: Performance Testing

- Test query performance with realistic data volumes
- Validate index usage in query execution plans
- Monitor response times and optimize if needed
