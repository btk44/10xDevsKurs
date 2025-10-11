# API Endpoint Implementation Plan: GET /api/transactions

## 1. Endpoint Overview

The GET /api/transactions endpoint retrieves a paginated list of the authenticated user's financial transactions with comprehensive filtering, sorting, and search capabilities. The endpoint returns transactions with joined data from related entities (accounts, categories, currencies) to provide complete transaction information in a single request.

**Key Features:**
- User-specific transaction retrieval with RLS enforcement
- Date range filtering for specific periods
- Entity-based filtering (account, category)
- Text search within transaction comments
- Flexible sorting options
- Pagination support with configurable limits
- Optional inclusion of soft-deleted records

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/transactions`
- **Authentication**: Required (Supabase Auth JWT token)

### Query Parameters

All parameters are optional:

**Filtering Parameters:**
- `date_from` (string): Start date filter in ISO 8601 format (e.g., "2025-10-01")
- `date_to` (string): End date filter in ISO 8601 format (e.g., "2025-10-31")
- `account_id` (integer): Filter transactions by specific account
- `category_id` (integer): Filter transactions by specific category
- `search` (string): Text search within transaction comments
- `include_inactive` (boolean): Include soft-deleted records (default: false)

**Sorting Parameters:**
- `sort` (string): Sort field and direction (default: "transaction_date:desc")
  - Valid options: "transaction_date:asc", "transaction_date:desc", "amount:asc", "amount:desc"

**Pagination Parameters:**
- `page` (integer): Page number starting from 1 (default: 1)
- `limit` (integer): Items per page (default: 50, maximum: 100)

**Request Body**: None

## 3. Used Types

**Input Types:**
- `GetTransactionsQuery` - Query parameter validation and parsing
- Request validation schemas from `src/lib/validation/schemas.ts`

**Output Types:**
- `TransactionDTO` - Individual transaction with joined data
- `ApiCollectionResponse<TransactionDTO>` - Response wrapper with pagination
- `PaginationDTO` - Pagination metadata
- `ApiErrorResponse` - Error response structure

## 4. Response Details

### Success Response (200 OK)

```json
{
  "data": [
    {
      "id": 1,
      "user_id": "uuid-here",
      "transaction_date": "2025-10-10T14:30:00Z",
      "account_id": 1,
      "account_name": "Main Bank Account",
      "category_id": 2,
      "category_name": "Food",
      "category_type": "expense",
      "amount": 45.50,
      "currency_id": 1,
      "currency_code": "PLN",
      "comment": "Lunch at restaurant",
      "active": true,
      "created_at": "2025-10-10T14:30:00Z",
      "updated_at": "2025-10-10T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_items": 150,
    "total_pages": 3
  }
}
```

### Error Responses

**400 Bad Request** - Invalid query parameters:
```json
{
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Invalid query parameters",
    "details": [
      {
        "field": "date_from",
        "message": "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)"
      }
    ]
  }
}
```

**401 Unauthorized** - Missing or invalid authentication:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

## 5. Data Flow

1. **Request Processing**:
   - Extract and validate query parameters using Zod schemas
   - Parse pagination parameters with defaults and limits
   - Validate date formats and sort options

2. **Authentication & Authorization**:
   - Verify JWT token and extract user_id
   - RLS automatically enforces user data isolation

3. **Database Query Construction**:
   - Build base query with joins to accounts, categories, and currencies
   - Apply filters based on provided parameters
   - Add search conditions for comment field
   - Apply sorting and pagination

4. **Data Processing**:
   - Execute optimized database query using existing indexes
   - Transform raw database results to TransactionDTO format
   - Calculate pagination metadata

5. **Response Formation**:
   - Wrap results in ApiCollectionResponse structure
   - Include pagination information
   - Return formatted JSON response

## 6. Security Considerations

**Authentication & Authorization:**
- JWT token validation through Supabase Auth middleware
- User identity extraction from `auth.uid()`
- RLS policies automatically enforce user data isolation

**Input Validation:**
- Strict parameter validation using Zod schemas
- Date format validation (ISO 8601)
- Numeric parameter bounds checking
- Sort option enumeration validation
- Search parameter sanitization to prevent SQL injection

**Data Protection:**
- RLS ensures users can only access their own transactions
- No direct user_id parameter manipulation possible
- Soft-deleted records only included when explicitly requested

## 7. Error Handling

**Client Errors (4xx):**

- **400 Bad Request**:
  - Invalid date format in date_from/date_to
  - Invalid numeric values for account_id, category_id, page, limit
  - Invalid sort option
  - Limit exceeds maximum allowed value (100)
  - Negative values for numeric parameters

- **401 Unauthorized**:
  - Missing Authorization header
  - Invalid or expired JWT token
  - Malformed token

**Server Errors (5xx):**

- **500 Internal Server Error**:
  - Database connection failures
  - Query execution errors
  - Unexpected service exceptions

**Error Logging:**
- Log all 500 errors with full context for debugging
- Log authentication failures for security monitoring
- Include request parameters and user context in error logs

## 8. Performance Considerations

**Database Optimization:**
- Leverage existing indexes:
  - `idx_transactions_user_date` for user + date filtering
  - `idx_transactions_user_active` for user + active filtering
  - `idx_transactions_account` for account filtering
  - `idx_transactions_category` for category filtering

**Query Optimization:**
- Use LIMIT/OFFSET for pagination
- Apply filters before joins when possible
- Utilize partial indexes for active records
- Consider query plan optimization for complex filter combinations

**Caching Considerations:**
- Consider implementing application-level caching for frequently accessed pages
- Cache pagination metadata for large datasets
- Implement cache invalidation on transaction modifications

**Response Size Management:**
- Default pagination limit of 50 items
- Maximum limit enforcement (100 items)
- Efficient JSON serialization

## 9. Implementation Steps

1. **Create Validation Schemas**:
   - Add `GetTransactionsQuerySchema` to `src/lib/validation/schemas.ts`
   - Include date format validation, numeric bounds, sort options
   - Add search parameter sanitization rules

2. **Extend TransactionService**:
   - Add `getTransactions()` method in `src/lib/services/TransactionService.ts`
   - Implement query building with dynamic filters
   - Add pagination logic with count queries
   - Handle sorting options and search functionality

3. **Implement API Route Handler**:
   - Create GET handler in existing `src/pages/api/transactions.ts`
   - Add request validation and parameter parsing
   - Integrate with TransactionService
   - Implement proper error handling and logging

4. **Database Query Implementation**:
   - Build complex SELECT query with JOINs
   - Use Supabase client with TypeScript type safety
   - Optimize query structure for performance
   - Handle edge cases (no results, large datasets)

5. **Error Handling Setup**:
   - Implement comprehensive error catching
   - Add structured error logging
   - Create user-friendly error messages
   - Handle database constraint violations

6. **Testing & Validation**:
   - Unit tests for validation schemas
   - Integration tests for service methods
   - API endpoint testing with various parameter combinations
   - Performance testing with large datasets

7. **Documentation Updates**:
   - Update API documentation with complete examples
   - Document query performance characteristics
   - Add troubleshooting guide for common issues

8. **Security Review**:
   - Verify RLS policy effectiveness
   - Test authentication bypass attempts
   - Validate input sanitization
   - Perform SQL injection testing
