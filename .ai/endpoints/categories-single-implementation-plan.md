# API Endpoint Implementation Plan: GET /api/categories/:id

## 1. Endpoint Overview

This endpoint retrieves a single category by its unique identifier. It provides detailed information about a specific expense or income category belonging to the authenticated user. The endpoint enforces user data isolation through Row Level Security (RLS) policies, ensuring users can only access their own categories.

**Purpose**: Fetch detailed information for a specific category
**Use Cases**: 
- Category detail views in the UI
- Form pre-population for category editing
- Category validation in transaction creation

## 2. Request Details

- **HTTP Method**: GET
- **URL Structure**: `/api/categories/:id`
- **Authentication**: Required (JWT token in Authorization header)

**Parameters**:
- **Required**: 
  - `id` (path parameter, integer): The unique identifier of the category to retrieve
- **Optional**: None

**Request Body**: None (GET request)

**Example Request**:
```
GET /api/categories/123
Authorization: Bearer <jwt-token>
```

## 3. Used Types

**Response Types**:
- `CategoryDTO` - Main data transfer object for category information
- `ApiResponse<CategoryDTO>` - Wrapper for successful response
- `ApiErrorResponse` - Wrapper for error responses
- `ErrorDTO` - Error details structure

**Internal Types**:
- Supabase user context for authentication
- Database row type from `Tables<"categories">`

## 4. Response Details

**Success Response** (200 OK):
```json
{
  "data": {
    "id": 123,
    "user_id": "uuid-here",
    "name": "Groceries",
    "category_type": "expense",
    "parent_id": 0,
    "tag": "GROC",
    "active": true,
    "created_at": "2025-10-01T10:00:00Z",
    "updated_at": "2025-10-01T10:00:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid ID parameter format
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Category not found or doesn't belong to user
- `500 Internal Server Error`: Database or server errors

## 5. Data Flow

1. **Request Validation**:
   - Extract and validate `id` parameter from URL path
   - Verify authentication token through Astro middleware
   - Parse `id` as positive integer

2. **Authentication & Authorization**:
   - Middleware validates JWT token and extracts user ID
   - User context passed to service layer

3. **Database Query**:
   - CategoryService.getById() queries categories table
   - RLS automatically filters by user_id
   - Include only active categories by default

4. **Response Formation**:
   - Transform database row to CategoryDTO
   - Wrap in ApiResponse structure
   - Return with appropriate HTTP status

## 6. Security Considerations

**Authentication**:
- JWT token validation through Astro middleware
- User context extraction from auth.uid()

**Authorization**:
- Row Level Security (RLS) ensures user can only access own categories
- No additional authorization checks needed at application level

**Input Validation**:
- Validate ID parameter is positive integer
- Sanitize any potential injection attempts
- Rate limiting consideration for API abuse prevention

**Data Protection**:
- RLS policies prevent data leakage between users
- No sensitive data exposure in error messages
- Audit logging for security monitoring

## 7. Error Handling

**Client Errors (4xx)**:
- `400 Bad Request`:
  - Invalid ID format (non-numeric, negative, zero)
  - ID exceeds reasonable limits
  - Malformed request structure

- `401 Unauthorized`:
  - Missing Authorization header
  - Invalid JWT token
  - Expired token

- `404 Not Found`:
  - Category ID doesn't exist in database
  - Category belongs to different user (filtered by RLS)
  - Category is soft-deleted (active = false)

**Server Errors (5xx)**:
- `500 Internal Server Error`:
  - Database connection failures
  - Supabase service unavailable
  - Unexpected application errors

**Error Response Format**:
```json
{
  "error": {
    "code": "CATEGORY_NOT_FOUND",
    "message": "Category with ID 123 not found",
    "details": {}
  }
}
```

## 8. Performance Considerations

**Database Optimization**:
- Single row query with primary key lookup (very fast)
- RLS index on (user_id, id) for efficient filtering
- No complex joins or aggregations needed

**Caching Strategy**:
- Categories change infrequently, good candidates for caching
- Consider ETag headers for conditional requests
- Application-level caching for frequently accessed categories

**Response Size**:
- Minimal payload size with only necessary fields
- No eager loading of related data unless specifically needed

## 9. Implementation Steps

1. **Create API Route File**:
   - Create `/src/pages/api/categories/[id].ts`
   - Set up Astro API route structure
   - Import necessary types and dependencies

2. **Input Validation**:
   - Extract `id` parameter from Astro.params
   - Validate ID is numeric and positive integer
   - Return 400 error for invalid format

3. **Authentication Handling**:
   - Use existing middleware for JWT validation
   - Extract user context from Astro.locals
   - Return 401 for authentication failures

4. **Service Layer Integration**:
   - Call `CategoryService.getById(id, userId)`
   - Handle service layer exceptions
   - Transform database response to DTO

5. **Response Formation**:
   - Wrap successful response in ApiResponse structure
   - Set appropriate Content-Type headers
   - Return JSON response with 200 status

6. **Error Handling Implementation**:
   - Implement try-catch blocks for different error types
   - Map service exceptions to appropriate HTTP status codes
   - Format error responses consistently

7. **Testing Considerations**:
   - Unit tests for parameter validation
   - Integration tests with authentication
   - Test RLS policy enforcement
   - Error scenario coverage

**File Structure**:
```
src/pages/api/categories/[id].ts    # Main API route handler
src/lib/services/CategoryService.ts # Business logic layer
src/types.ts                        # Type definitions (existing)
```

**Dependencies**:
- Supabase client for database operations
- CategoryService for business logic
- Authentication middleware
- Type definitions from types.ts
