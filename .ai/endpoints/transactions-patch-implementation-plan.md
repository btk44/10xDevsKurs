# API Endpoint Implementation Plan: PATCH /api/transactions/:id

## 1. Endpoint Overview

Update an existing transaction. This endpoint allows authenticated users to modify their own transactions with partial updates (all fields are optional). The response includes joined data from related entities (account name, category name/type, currency code) for immediate UI display.

## 2. Request Details

- **HTTP Method**: PATCH
- **URL Structure**: `/api/transactions/:id`
- **Parameters**:
  - **Required**: `id` (integer, path parameter) - Transaction ID to update
  - **Optional Request Body Fields**:
    - `transaction_date` (string, ISO timestamp) - When the transaction occurred
    - `account_id` (integer) - Account associated with the transaction
    - `category_id` (integer) - Category for transaction classification
    - `amount` (number) - Transaction amount (must be positive > 0)
    - `currency_id` (integer) - Currency for the transaction
    - `comment` (string, optional) - Additional transaction notes

- **Request Body Example**:
```json
{
  "transaction_date": "2025-10-10T15:00:00Z",
  "account_id": 1,
  "category_id": 3,
  "amount": 50.0,
  "currency_id": 1,
  "comment": "Updated comment"
}
```

## 3. Used Types

- **Request**: `UpdateTransactionCommand` - Partial update command with optional fields
- **Response**: `TransactionDTO` - Complete transaction data with joined fields
- **Error**: `ApiErrorResponse` with `ErrorDTO`
- **Internal**: Database `TablesUpdate<"transactions">` type for Supabase operations

## 4. Response Details

- **Success Response (200 OK)**:
```json
{
  "data": {
    "id": 2,
    "user_id": "uuid-here",
    "transaction_date": "2025-10-10T15:00:00Z",
    "account_id": 1,
    "account_name": "Main Bank Account",
    "category_id": 3,
    "category_name": "Groceries",
    "category_type": "expense",
    "amount": 50.0,
    "currency_id": 1,
    "currency_code": "PLN",
    "comment": "Updated comment",
    "active": true,
    "created_at": "2025-10-10T14:30:00Z",
    "updated_at": "2025-10-10T15:30:00Z"
  }
}
```

- **Error Responses**:
  - `400 Bad Request`: Validation errors, constraint violations
  - `401 Unauthorized`: Missing or invalid authentication
  - `404 Not Found`: Transaction not found or doesn't belong to user
  - `500 Internal Server Error`: Database errors, unexpected failures

## 5. Data Flow

1. **Authentication**: Verify JWT token and extract `user_id`
2. **Path Parameter Extraction**: Extract `id` from URL parameters
3. **Request Body Validation**: Validate optional fields in request body
4. **Authorization Check**: Verify transaction belongs to authenticated user
5. **Foreign Key Validation**: Validate provided account_id, category_id, currency_id belong to user
6. **Database Update**: Update transaction with provided fields
7. **Data Retrieval**: Fetch updated transaction with joined data
8. **Response Formation**: Format as TransactionDTO and return

### Database Interactions:
- Query transaction by ID and user_id for authorization
- Validate foreign keys (account, category, currency) belong to user
- Update transaction record with partial data
- Fetch updated record with JOINs for response

## 6. Security Considerations

### Authentication & Authorization:
- Require valid JWT token with user_id
- Ensure transaction belongs to authenticated user via RLS
- Validate all foreign key references belong to the same user

### Input Validation:
- Sanitize all input parameters
- Validate amount is positive number > 0
- Validate transaction_date is valid ISO timestamp
- Ensure foreign key IDs exist and are accessible to user

### SQL Injection Prevention:
- Use parameterized queries through Supabase client
- Validate numeric IDs are integers
- Use schema validation for all inputs

## 7. Error Handling

### Validation Errors (400 Bad Request):
- Invalid transaction_date format
- Amount <= 0 or non-numeric
- Invalid foreign key references
- Account/category/currency doesn't belong to user
- Database constraint violations

### Authorization Errors:
- `401 Unauthorized`: Missing/invalid JWT token
- `404 Not Found`: Transaction doesn't exist or doesn't belong to user

### Database Errors (500 Internal Server Error):
- Connection failures
- Constraint violations not caught by validation
- Unexpected database errors

### Error Response Format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid transaction data",
    "details": [
      {
        "field": "amount",
        "message": "Amount must be greater than 0"
      }
    ]
  }
}
```

## 8. Performance Considerations

### Database Optimization:
- Use indexed queries on user_id and transaction ID
- Minimize JOIN operations by using selective fields
- Leverage existing RLS policies for security

### Response Time Targets:
- < 100ms for typical update operations
- Use connection pooling for database efficiency

### Caching Considerations:
- No caching needed for PATCH operations
- Invalidate any cached transaction lists if implemented

## 9. Implementation Steps

### Step 1: Create Transaction Service Method
```typescript
// In src/lib/services/TransactionService.ts
async updateTransaction(
  id: number,
  userId: string,
  data: UpdateTransactionCommand
): Promise<TransactionDTO>
```

### Step 2: Implement Input Validation
- Validate path parameter `id` is positive integer
- Validate request body using validation schemas
- Implement amount > 0 constraint validation
- Validate timestamp format for transaction_date

### Step 3: Implement Authorization Logic
- Check transaction exists and belongs to user
- Validate foreign key ownership (account, category, currency)
- Use RLS policies for automatic user isolation

### Step 4: Implement Database Operations
- Build partial update query with only provided fields
- Execute update with user_id constraint
- Fetch updated record with JOINs for complete response
- Handle database constraints and foreign key violations

### Step 5: Create API Route Handler
```typescript
// In src/pages/api/transactions/[id].ts
export async function PATCH({ request, params }: APIContext)
```

### Step 6: Implement Error Handling
- Catch and classify different error types
- Return appropriate HTTP status codes
- Format error responses consistently
- Log errors for monitoring

### Step 7: Add Response Formatting
- Transform database result to TransactionDTO
- Include all joined data (account_name, category_name, etc.)
- Ensure proper date formatting and type conversion

### Step 8: Testing & Validation
- Unit tests for service methods
- Integration tests for API endpoint
- Validation tests for edge cases
- Security tests for authorization
