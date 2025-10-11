# API Endpoint Implementation Plan: DELETE /api/categories/:id

## 1. Endpoint Overview

This endpoint implements soft deletion of expense/income categories with safety checks. The category can only be deleted if it has no active transactions associated with it. The deletion is performed by setting the `active` flag to `false` rather than physically removing the record from the database.

**Key Features:**
- Soft delete strategy maintaining data integrity
- Safety check preventing deletion of categories with active transactions
- User isolation ensuring users can only delete their own categories
- Proper error handling with meaningful status codes

## 2. Request Details

- **HTTP Method**: DELETE
- **URL Structure**: `/api/categories/:id`
- **Parameters**:
  - **Required**: 
    - `id` (path parameter, integer): Category ID to delete
  - **Optional**: None
- **Request Body**: None
- **Authentication**: Required (JWT token)

## 3. Used Types

```typescript
// From types.ts
import type { ErrorDTO, ApiErrorResponse, CategoryDTO } from "../types.ts";

// Internal types for service layer
interface DeleteCategoryResult {
  success: boolean;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

## 4. Response Details

**Success Response** (204 No Content):
- Empty response body
- HTTP Status: 204

**Error Responses**:

**401 Unauthorized**:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**404 Not Found**:
```json
{
  "error": {
    "code": "CATEGORY_NOT_FOUND",
    "message": "Category not found"
  }
}
```

**409 Conflict**:
```json
{
  "error": {
    "code": "CATEGORY_IN_USE",
    "message": "Cannot delete category with active transactions",
    "details": {
      "transaction_count": 15
    }
  }
}
```

## 5. Data Flow

1. **Request Processing**:
   - Extract category ID from path parameters
   - Validate and authenticate user from JWT token
   - Validate path parameter format

2. **Business Logic**:
   - Check if category exists and belongs to authenticated user
   - Query database for active transactions associated with the category
   - If transactions exist, return 409 Conflict
   - If no transactions, perform soft delete (set active = false)

3. **Database Operations**:
   - Query: Check category existence and ownership
   - Query: Count active transactions for the category
   - Update: Set category.active = false (if safe to delete)

4. **Response**:
   - Return 204 No Content on successful deletion
   - Return appropriate error response with status code

## 6. Security Considerations

**Authentication & Authorization**:
- Validate JWT token presence and validity
- Extract user_id from authenticated session
- Ensure user can only delete their own categories

**Input Validation**:
- Validate category ID is a positive integer
- Sanitize path parameters to prevent injection
- Implement rate limiting for delete operations

**Data Protection**:
- Use RLS (Row Level Security) as additional protection layer
- Ensure soft delete maintains referential integrity
- Log deletion attempts for audit purposes

## 7. Error Handling

**Client Errors (4xx)**:
- `400 Bad Request`: Invalid category ID format
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Category doesn't exist or doesn't belong to user
- `409 Conflict`: Category has active transactions

**Server Errors (5xx)**:
- `500 Internal Server Error`: Database connection issues, unexpected errors

**Error Logging**:
- Log all error scenarios with context (user_id, category_id, error_type)
- Include transaction count in conflict errors
- Use structured logging for monitoring

## 8. Performance Considerations

**Database Queries**:
- Use indexed queries for category lookup (user_id, id, active)
- Optimize transaction count query with proper indexing
- Consider using single transaction for consistency

**Caching**:
- Invalidate any cached category lists after deletion
- Consider cache warming for frequently accessed categories

**Query Optimization**:
- Use `idx_categories_user_active` index for category lookup
- Use `idx_transactions_category` index for transaction count
- Limit query result sets appropriately

## 9. Implementation Steps

### Step 1: Create Service Method
```typescript
// src/lib/services/CategoryService.ts
async deleteCategory(categoryId: number, userId: string): Promise<DeleteCategoryResult>
```

### Step 2: Add Validation Logic
- Validate category ID format
- Check category existence and ownership
- Count active transactions for the category

### Step 3: Implement Business Logic
- Query database for category validation
- Check for active transactions using proper indexes
- Perform soft delete if validation passes

### Step 4: Create API Endpoint
```typescript
// src/pages/api/categories/[id].ts
export async function DELETE(context: APIContext): Promise<Response>
```

### Step 5: Add Authentication Middleware
- Extract and validate JWT token
- Get user_id from authenticated session
- Handle authentication errors

### Step 6: Implement Error Handling
- Create standardized error responses
- Add proper HTTP status codes
- Include meaningful error messages and details

### Step 7: Add Input Validation
- Validate path parameters
- Sanitize inputs
- Return 400 for invalid formats

### Step 8: Add Logging
- Log successful deletions
- Log error scenarios with context
- Include performance metrics

### Step 9: Testing
- Unit tests for service methods
- Integration tests for endpoint
- Error scenario testing
- Authentication/authorization testing

### Step 10: Documentation
- Update API documentation
- Add code comments
- Document error codes and responses
