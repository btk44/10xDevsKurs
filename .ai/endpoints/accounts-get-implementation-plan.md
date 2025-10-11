# API Endpoint Implementation Plan: GET /api/accounts

## 1. Endpoint Overview

The GET /api/accounts endpoint retrieves all accounts belonging to the authenticated user with calculated balances. The endpoint leverages the `view_accounts_with_balance` database view to efficiently provide account information along with real-time balance calculations based on transaction history and category types. Users can optionally include soft-deleted (inactive) accounts in the response.

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/accounts`
- **Parameters**:
  - Required: None (authentication handled by middleware)
  - Optional:
    - `include_inactive` (boolean): Include soft-deleted accounts in response (default: false)
- **Request Body**: None
- **Authentication**: Required (JWT token via Authorization header or session)

## 3. Used Types

### Response DTOs

- `AccountDTO`: Complete account information with calculated balance and currency details
- `ApiCollectionResponse<AccountDTO>`: Standard collection response wrapper

### Query Parameters

- `GetAccountsQuery`: Interface defining optional query parameters

### Internal Types

- User context from authentication middleware for user_id extraction

## 4. Response Details

### Success Response (200 OK)

```json
{
  "data": [
    {
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
  ]
}
```

### Error Responses

- **401 Unauthorized**: Missing or invalid authentication token
- **500 Internal Server Error**: Database connection issues or unexpected server errors

## 5. Data Flow

1. **Authentication Middleware**: Validates JWT token and extracts user_id
2. **Query Parameter Parsing**: Extract and validate `include_inactive` parameter
3. **Service Layer**: AccountService.getAccountsByUserId() method call
4. **Database Query**: Query `view_accounts_with_balance` with RLS filtering
5. **Data Transformation**: Map database results to AccountDTO format
6. **Response Formatting**: Wrap results in ApiCollectionResponse structure
7. **Error Handling**: Catch and log any errors, return appropriate error responses

### Database Interaction

- Use `view_accounts_with_balance` for efficient balance calculation
- Row Level Security (RLS) automatically filters accounts by user_id
- Additional WHERE clause for active flag based on `include_inactive` parameter
- Balance calculation handled by database view using category types

## 6. Security Considerations

### Authentication & Authorization

- JWT token validation through Astro middleware
- User context extraction for user_id
- Row Level Security (RLS) ensures data isolation between users

### Data Protection

- Automatic filtering by user_id through RLS policies
- No sensitive data exposure in error messages
- Input sanitization for query parameters

### Potential Threats & Mitigations

- **Unauthorized Access**: Mitigated by RLS and authentication middleware
- **Data Leakage**: RLS ensures users only see their own accounts
- **Parameter Injection**: Input validation and type checking for query parameters

## 7. Error Handling

### Error Scenarios & Status Codes

| Scenario                   | Status Code | Response                                                                         | Logging Level |
| -------------------------- | ----------- | -------------------------------------------------------------------------------- | ------------- |
| Missing/Invalid Auth Token | 401         | `{"error": {"code": "UNAUTHORIZED", "message": "Authentication required"}}`      | WARN          |
| Database Connection Error  | 500         | `{"error": {"code": "DATABASE_ERROR", "message": "Internal server error"}}`      | ERROR         |
| Invalid Query Parameter    | 400         | `{"error": {"code": "INVALID_PARAMETER", "message": "Invalid parameter value"}}` | WARN          |
| Unexpected Server Error    | 500         | `{"error": {"code": "INTERNAL_ERROR", "message": "Internal server error"}}`      | ERROR         |

### Error Logging Strategy

- Log all database errors with full context
- Log authentication failures with IP and timestamp
- Include user_id in all log entries for audit trail
- Sanitize sensitive data before logging

## 8. Performance Considerations

### Optimization Strategies

- Leverage `view_accounts_with_balance` for efficient balance calculation
- Use indexed queries through RLS policies
- Minimal data transfer with precise column selection
- Connection pooling through Supabase client

### Potential Bottlenecks

- Balance calculation for accounts with many transactions (mitigated by database view)
- Multiple concurrent requests from same user (handled by connection pooling)

### Performance Targets

- Response time: < 100ms for typical user (5-10 accounts)
- Database query time: < 50ms leveraging indexed views
- Memory usage: Minimal due to streaming response

## 9. Implementation Steps

### Phase 1: Service Layer Implementation

1. **Create/Update AccountService**
   - Implement `getAccountsByUserId(userId: string, includeInactive: boolean)` method
   - Use Supabase client to query `view_accounts_with_balance`
   - Apply RLS filtering automatically
   - Add conditional WHERE clause for active flag

### Phase 2: API Route Implementation

2. **Create Astro API Route** (`src/pages/api/accounts.ts`)
   - Implement GET handler function
   - Extract user context from authentication middleware
   - Parse and validate query parameters using `GetAccountsQuery` interface
   - Call AccountService method with appropriate parameters

3. **Input Validation**
   - Validate `include_inactive` parameter is boolean if provided
   - Set default value (false) for missing parameter
   - Return 400 Bad Request for invalid parameter types

### Phase 3: Response Handling

4. **Data Transformation**
   - Map database view results to `AccountDTO` format
   - Ensure all required fields are present and correctly typed
   - Handle null/undefined values appropriately

5. **Response Formatting**
   - Wrap account array in `ApiCollectionResponse<AccountDTO>` structure
   - Set appropriate HTTP status codes
   - Include proper Content-Type headers

### Phase 4: Error Handling & Security

6. **Error Handling Implementation**
   - Implement try-catch blocks around database operations
   - Map database errors to appropriate HTTP status codes
   - Log errors with sufficient context for debugging

7. **Security Validation**
   - Verify authentication middleware integration
   - Test RLS policy enforcement
   - Validate no data leakage between users

### Phase 5: Testing & Optimization

8. **Unit Testing**
   - Test AccountService methods with various scenarios
   - Mock database responses for isolated testing
   - Validate error handling paths

9. **Integration Testing**
   - Test full API endpoint with authenticated requests
   - Verify RLS policy enforcement
   - Test query parameter handling

10. **Performance Testing**

- Benchmark response times with various data loads
- Verify database view performance
- Monitor memory usage and connection handling
