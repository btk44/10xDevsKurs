# API Endpoint Implementation Plan: GET /api/categories

## 1. Endpoint Overview

The GET /api/categories endpoint retrieves all categories belonging to the authenticated user. It supports filtering by category type (income/expense), parent category relationship, and active status. The endpoint returns a hierarchical view of categories where main categories have `parent_id = 0` and subcategories have `parent_id > 0` pointing to their parent category.

**Key Features:**
- User-isolated category retrieval via RLS
- Optional filtering by category type and hierarchy level
- Support for including soft-deleted categories
- Hierarchical category structure support (max 2 levels)

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/categories`
- **Authentication**: Required (Supabase Auth)

**Query Parameters:**
- **Optional Parameters:**
  - `type` (string): Filter by category type - must be 'income' or 'expense'
  - `parent_id` (integer): Filter by parent category relationship
    - `0`: Returns only main categories
    - `> 0`: Returns subcategories of specified parent
    - Omitted: Returns all categories
  - `include_inactive` (boolean): Include soft-deleted categories (default: false)

**Request Body**: None

**Example Requests:**
```
GET /api/categories
GET /api/categories?type=expense
GET /api/categories?parent_id=0
GET /api/categories?type=income&include_inactive=true
```

## 3. Used Types

**From `src/types.ts`:**
- `CategoryDTO`: Response data structure for individual categories
- `GetCategoriesQuery`: Query parameter validation interface
- `ApiCollectionResponse<CategoryDTO>`: Standardized collection response wrapper
- `CategoryType`: Enum for category type validation
- `ApiErrorResponse`: Error response structure
- `ErrorDTO`: Error detail structure

**Database Types:**
- `Tables<"categories">`: Supabase generated category table type
- Category-related fields from database schema

## 4. Response Details

**Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": "uuid-here",
      "name": "Salary",
      "category_type": "income",
      "parent_id": 0,
      "tag": "SAL",
      "active": true,
      "created_at": "2025-10-01T10:00:00Z",
      "updated_at": "2025-10-01T10:00:00Z"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Missing or invalid authentication token
- `500 Internal Server Error`: Database or server errors

## 5. Data Flow

1. **Request Reception**: Astro API route receives GET request with optional query parameters
2. **Authentication**: Verify Supabase auth token and extract user_id
3. **Input Validation**: Validate query parameters using validation schemas
4. **Service Layer**: Call CategoryService.getCategories() with validated parameters
5. **Database Query**: Execute filtered query against categories table with RLS
6. **Data Transformation**: Map database results to CategoryDTO format
7. **Response**: Return ApiCollectionResponse with category data

**Database Query Logic:**
```sql
SELECT * FROM categories 
WHERE user_id = $1 
  AND active = CASE WHEN $include_inactive THEN active ELSE true END
  AND ($type IS NULL OR category_type = $type)
  AND ($parent_id IS NULL OR parent_id = $parent_id)
ORDER BY parent_id ASC, name ASC
```

## 6. Security Considerations

**Authentication & Authorization:**
- Supabase JWT token validation required
- RLS policies ensure user can only access their own categories
- User ID extracted from authenticated session, not from request parameters

**Input Validation:**
- Validate `type` parameter against CategoryType enum values
- Validate `parent_id` is non-negative integer
- Validate `include_inactive` is boolean value
- Sanitize all input parameters to prevent injection attacks

**Data Protection:**
- Database-level RLS prevents cross-user data access
- No sensitive data exposure in error messages
- Proper error logging without exposing internal details

## 7. Error Handling

**Input Validation Errors (400 Bad Request):**
- Invalid category type (not 'income' or 'expense')
- Invalid parent_id (negative number or non-integer)
- Invalid include_inactive (non-boolean value)

**Authentication Errors (401 Unauthorized):**
- Missing Authorization header
- Invalid or expired JWT token
- Malformed authentication token

**Server Errors (500 Internal Server Error):**
- Database connection failures
- Supabase service unavailability
- Unexpected database errors
- Service layer exceptions

**Error Response Format:**
```json
{
  "error": {
    "code": "INVALID_CATEGORY_TYPE",
    "message": "Category type must be 'income' or 'expense'",
    "details": [
      {
        "field": "type",
        "message": "Invalid category type provided"
      }
    ]
  }
}
```

## 8. Performance Considerations

**Database Optimization:**
- Leverage existing indexes on (user_id, active) for efficient filtering
- Use index on (user_id, category_type) when type filter applied
- Use index on (parent_id, user_id) when parent_id filter applied
- Query optimization through proper WHERE clause ordering

**Response Optimization:**
- Return data in hierarchical order (main categories first, then subcategories)
- Implement efficient result mapping from database to DTO
- Consider result caching for frequently accessed category lists

**Scalability:**
- RLS policies prevent data leakage and unnecessary data scanning
- Partial indexes on active categories reduce index size
- Efficient query patterns support high concurrent usage

## 9. Implementation Steps

### Step 1: Create CategoryService (if not exists)
- Create `src/lib/services/CategoryService.ts`
- Implement `getCategories()` method with filtering support
- Add proper error handling and logging
- Include user_id parameter for RLS compliance

### Step 2: Implement Query Parameter Validation
- Extend `src/lib/validation/schemas.ts` with category query validation
- Create schema for GetCategoriesQuery validation
- Add custom validators for CategoryType enum
- Implement parent_id range validation

### Step 3: Create API Route Handler
- Create or update `src/pages/api/categories.ts`
- Implement GET method handler
- Add authentication middleware integration
- Implement query parameter parsing and validation

### Step 4: Implement Database Query Logic
- Build dynamic query based on provided filters
- Handle optional parameters with proper SQL construction
- Implement result mapping to CategoryDTO format
- Add proper error handling for database operations

### Step 5: Add Response Formatting
- Implement ApiCollectionResponse wrapper
- Add consistent error response formatting
- Handle edge cases (empty results, invalid queries)
- Add appropriate HTTP status codes

### Step 6: Add Logging and Monitoring
- Log authentication failures
- Log invalid query parameter attempts
- Log database errors for debugging
- Add performance monitoring for query execution time

### Step 7: Testing Implementation
- Unit tests for CategoryService methods
- Integration tests for API endpoint
- Authentication and authorization tests
- Query parameter validation tests
- Error scenario testing

### Step 8: Documentation Updates
- Update API documentation with parameter details
- Add example requests and responses
- Document error codes and messages
- Update type definitions if needed

## 10. Dependencies

**Required Services:**
- CategoryService (new or existing)
- Supabase client configuration
- Authentication middleware
- Validation utilities

**Database Requirements:**
- Categories table with proper RLS policies
- Indexes on user_id, category_type, parent_id, active fields
- Proper enum type definition for category_type_enum

**External Dependencies:**
- Supabase authentication
- Validation library (zod or similar)
- Astro API route framework
- TypeScript type definitions
