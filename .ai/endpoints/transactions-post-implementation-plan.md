# API Endpoint Implementation Plan: POST /api/transactions

## 1. Endpoint Overview

This endpoint creates a new financial transaction for the authenticated user. It validates all input data, ensures the user owns the referenced account and category, and returns the created transaction with joined information from related tables. The endpoint enforces business rules including positive amount validation and proper user data isolation.

## 2. Request Details

- **HTTP Method**: POST
- **URL Structure**: `/api/transactions`
- **Content-Type**: `application/json`
- **Authentication**: Required (user_id from auth context)

### Parameters:

**Required**:
- `transaction_date`: ISO 8601 timestamp string
- `account_id`: Number (must exist in user's active accounts)
- `category_id`: Number (must exist in user's active categories)
- `amount`: Number (must be > 0, max 9999999999.99, 2 decimal places)
- `currency_id`: Number (must exist in currencies table)

**Optional**:
- `comment`: String (max 255 characters)

### Request Body Example:
```json
{
  "transaction_date": "2025-10-10T14:30:00Z",
  "account_id": 1,
  "category_id": 2,
  "amount": 45.5,
  "currency_id": 1,
  "comment": "Lunch at restaurant"
}
```

## 3. Used Types

### Command Models:
- `CreateTransactionCommand`: Input validation and data transfer
  ```typescript
  type CreateTransactionCommand = Pick<
    TablesInsert<"transactions">,
    "transaction_date" | "account_id" | "category_id" | "amount" | "currency_id" | "comment"
  >;
  ```

### Response DTOs:
- `TransactionDTO`: Complete transaction data with joins
- `ApiResponse<TransactionDTO>`: Wrapper for successful response
- `ApiErrorResponse`: Error response wrapper
- `ErrorDTO`: Error details structure
- `ValidationErrorDetail`: Field-specific validation errors

## 4. Response Details

### Success Response (201 Created):
```json
{
  "data": {
    "id": 2,
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

### Error Responses:
- **400 Bad Request**: Validation errors
- **401 Unauthorized**: Missing/invalid authentication
- **500 Internal Server Error**: Database or server errors

## 5. Data Flow

1. **Request Reception**: Astro API endpoint receives POST request
2. **Authentication**: Extract and validate user_id from auth context
3. **Input Validation**: Validate request body against CreateTransactionCommand schema
4. **Business Validation**: 
   - Verify account exists and belongs to user
   - Verify category exists and belongs to user
   - Verify currency exists
   - Validate amount constraints
5. **Database Insert**: Create transaction record with user_id
6. **Data Retrieval**: Fetch created transaction with joins for response
7. **Response**: Return 201 with complete transaction data

### Database Interactions:
- **INSERT**: `transactions` table with user_id, validated foreign keys
- **SELECT**: Join query to fetch transaction with account, category, and currency details
- **Validation Queries**: Check account and category ownership and active status

## 6. Security Considerations

### Authentication & Authorization:
- Validate user authentication token
- Extract user_id from auth context
- Ensure RLS policies prevent access to other users' data

### Input Validation:
- Sanitize all input fields to prevent SQL injection
- Validate data types and constraints
- Check foreign key relationships and ownership

### Data Access Control:
- User can only create transactions for their own accounts and categories
- RLS policies ensure data isolation
- Validate account and category are active and belong to user

### Rate Limiting:
- Consider implementing rate limiting to prevent abuse
- Monitor for unusual transaction creation patterns

## 7. Error Handling

### Validation Errors (400 Bad Request):
- **Invalid transaction_date**: "Invalid date format, must be ISO 8601"
- **Missing required fields**: "Field [field_name] is required"
- **Invalid amount**: "Amount must be greater than 0 and less than 9999999999.99"
- **Non-existent account**: "Account not found or not accessible"
- **Non-existent category**: "Category not found or not accessible"
- **Non-existent currency**: "Currency not found"
- **Comment too long**: "Comment must be 255 characters or less"

### Authentication Errors (401 Unauthorized):
- Missing auth token
- Invalid auth token
- Expired auth token

### Server Errors (500 Internal Server Error):
- Database connection issues
- Constraint violations
- Unexpected database errors

### Error Response Format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
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
- Use indexes on foreign key columns (account_id, category_id, currency_id)
- Leverage partial indexes on active transactions
- Minimize number of database queries through efficient joins

### Query Efficiency:
- Single INSERT for transaction creation
- Efficient JOIN query for response data retrieval
- Use prepared statements to prevent SQL injection and improve performance

### Caching Considerations:
- Consider caching currency data (rarely changes)
- Account and category validation queries could benefit from short-term caching

### Monitoring:
- Track response times and database query performance
- Monitor transaction creation frequency per user
- Alert on unusual patterns or high error rates

## 9. Implementation Steps

1. **Create TransactionService** (if not exists):
   - `create(userId: string, command: CreateTransactionCommand): Promise<TransactionDTO>`
   - Include validation methods for account and category ownership
   - Implement database operations with proper error handling

2. **Implement Validation Schema**:
   - Use existing validation utilities from `src/lib/validation/`
   - Create schema for CreateTransactionCommand validation
   - Include custom validators for foreign key relationships

3. **Create API Endpoint Handler**:
   - Set up POST handler in `src/pages/api/transactions.ts`
   - Extract user_id from auth context
   - Validate request body against schema
   - Call TransactionService.create method
   - Handle errors and return appropriate responses

4. **Database Query Implementation**:
   - INSERT query for transaction creation with user_id
   - JOIN query for fetching complete transaction data:
     ```sql
     SELECT t.*, a.name as account_name, c.name as category_name, 
            c.category_type, cur.code as currency_code
     FROM transactions t
     JOIN accounts a ON t.account_id = a.id
     JOIN categories c ON t.category_id = c.id
     JOIN currencies cur ON t.currency_id = cur.id
     WHERE t.id = ? AND t.user_id = ?
     ```

5. **Error Handling Implementation**:
   - Create error mapping for database constraints
   - Implement validation error formatting
   - Add logging for debugging and monitoring

6. **Security Implementation**:
   - Verify RLS policies are active on transactions table
   - Add input sanitization
   - Implement user ownership validation for accounts and categories

7. **Testing**:
   - Unit tests for TransactionService methods
   - Integration tests for API endpoint
   - Test error scenarios and edge cases
   - Verify security constraints work correctly

8. **Documentation Update**:
   - Update API documentation
   - Add example requests and responses
   - Document error codes and messages
