# API Endpoint Implementation Plan: PATCH /api/categories/:id

## 1. Endpoint Overview

The PATCH /api/categories/:id endpoint updates an existing category for the authenticated user. This endpoint supports partial updates to category properties including name, category type, parent relationship, and tag. A critical business rule is that changing a parent category's type will automatically cascade to all child categories through database triggers, ensuring type inheritance consistency.

**Key Features:**
- Partial update support for all mutable category fields
- User-isolated updates via RLS (Row Level Security)
- Automatic category type cascading for parent categories
- Hierarchical validation (max 2 levels deep)
- Business rule enforcement through database triggers

## 2. Request Details

- **HTTP Method**: PATCH
- **URL Structure**: `/api/categories/:id`
- **Authentication**: Required (Supabase Auth)

**Path Parameters:**
- **Required:**
  - `id` (integer): Category identifier that must be a positive integer

**Request Body** (all fields optional):
```json
{
  "name": "Updated Category Name",
  "category_type": "income",
  "parent_id": 0,
  "tag": "NEW"
}
```

**Validation Rules:**
- `name`: Must be non-empty string with trimmed length > 0, max 100 characters
- `category_type`: Must be either 'income' or 'expense' (enum validation)
- `parent_id`: Must be >= 0 (0 for main category, > 0 for subcategory)
- `tag`: Optional string, max 10 characters or null

**Example Requests:**
```
PATCH /api/categories/123
Content-Type: application/json
{
  "name": "Updated Groceries"
}

PATCH /api/categories/456
Content-Type: application/json
{
  "category_type": "income",
  "parent_id": 0
}
```

## 3. Used Types

**From `src/types.ts`:**
- `CategoryDTO`: Response data structure for updated category
- `UpdateCategoryCommand`: Request body validation interface
- `ApiResponse<CategoryDTO>`: Standardized single resource response wrapper
- `CategoryType`: Enum type for category_type validation
- `ApiErrorResponse`: Error response structure
- `ErrorDTO`: Error detail structure

**Database Types:**
- `TablesUpdate<"categories">`: Supabase generated update type for categories table
- Database triggers: `validate_category_depth()`, `cascade_category_type_to_children()`

## 4. Response Details

**Success Response (200 OK):**
```json
{
  "data": {
    "id": 123,
    "user_id": "uuid-here",
    "name": "Updated Category Name",
    "category_type": "income",
    "parent_id": 0,
    "tag": "NEW",
    "active": true,
    "created_at": "2025-10-10T10:00:00Z",
    "updated_at": "2025-10-10T11:00:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input data or business rule violations
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Category doesn't exist or doesn't belong to user
- `500 Internal Server Error`: Database errors or unexpected failures

## 5. Data Flow

### Update Process Flow:
1. **Authentication**: Extract user_id from JWT token
2. **Path Validation**: Validate category ID parameter format
3. **Request Validation**: Validate request body against UpdateCategoryCommand schema
4. **Existence Check**: Verify category exists and belongs to authenticated user
5. **Business Validation**: 
   - If parent_id changed: validate parent exists and hierarchy depth
   - If category_type changed: validate against business rules
6. **Database Update**: Execute update with database trigger validation
7. **Response**: Return updated category with all fields

### Database Interactions:
- **Query 1**: SELECT category for existence and ownership validation
- **Query 2**: If parent_id changes, validate parent category exists and depth
- **Query 3**: UPDATE category record (triggers automatic validation)
- **Query 4**: SELECT updated category to return fresh data

### Business Logic:
- Database triggers handle hierarchy validation automatically
- Category type changes cascade to children via `cascade_category_type_to_children()` trigger
- Parent-child type consistency enforced via `validate_category_depth()` trigger

## 6. Security Considerations

**Authentication & Authorization:**
- JWT token validation required for all requests
- User isolation enforced through RLS policies
- Categories can only be updated by their owner (user_id match)

**Input Validation:**
- Path parameter sanitization (category ID must be positive integer)
- Request body validation against strict schema
- SQL injection prevention through parameterized queries

**Data Integrity:**
- Database constraints prevent invalid category states
- Triggers ensure business rule compliance
- Foreign key relationships maintained through validation

**Potential Security Threats:**
- **Path Traversal**: Mitigated by integer-only ID validation
- **Authorization Bypass**: Prevented by RLS policies
- **Data Injection**: Prevented by parameterized queries and validation
- **Type Confusion**: Prevented by enum constraints

## 7. Error Handling

**Input Validation Errors (400 Bad Request):**
- Invalid category ID format (non-integer, negative, zero)
- Empty or invalid category name
- Invalid category_type (not 'income' or 'expense')
- Invalid parent_id (negative number)
- Tag exceeding 10 characters
- Hierarchy depth violation (trying to create > 2 levels)
- Parent category type mismatch for subcategories

**Authentication Errors (401 Unauthorized):**
- Missing Authorization header
- Invalid or expired JWT token
- Malformed authentication token

**Not Found Errors (404 Not Found):**
- Category with specified ID doesn't exist
- Category exists but doesn't belong to authenticated user
- Parent category doesn't exist (when changing parent_id)

**Business Logic Errors (400 Bad Request):**
- Attempting to make category its own parent
- Hierarchy depth violations (detected by triggers)
- Category type inheritance violations (detected by triggers)

**Server Errors (500 Internal Server Error):**
- Database connection failures
- Supabase service unavailability
- Trigger execution failures
- Unexpected database constraint violations

**Error Response Format:**
```json
{
  "error": {
    "code": "INVALID_CATEGORY_HIERARCHY",
    "message": "Maximum category depth is 2 levels",
    "details": [
      {
        "field": "parent_id",
        "message": "Parent category is already a subcategory"
      }
    ]
  }
}
```

## 8. Performance Considerations

**Database Optimization:**
- Use indexed queries for category lookup (`idx_categories_user_active`)
- Leverage RLS policies for efficient user-scoped queries
- Single database transaction for consistency
- Efficient parent validation using `idx_categories_parent` index

**Query Optimization:**
- Minimal field selection in validation queries
- Use proper WHERE clause ordering (user_id first, then id)
- Leverage partial indexes for active category filtering

**Trigger Performance:**
- Database triggers are optimized for validation scenarios
- Cascading updates use indexed queries for child category lookups
- Trigger functions use efficient query patterns

**Response Optimization:**
- Return complete updated entity to avoid additional client queries
- Include updated_at timestamp for cache invalidation
- Minimal data transformation in service layer

## 9. Implementation Steps

### Step 1: Create/Extend CategoryService
```typescript
// src/lib/services/CategoryService.ts
async updateCategory(categoryId: number, command: UpdateCategoryCommand, userId: string): Promise<CategoryDTO>
```
- Implement category existence and ownership validation
- Add parent category validation logic
- Handle database update operation with proper error handling

### Step 2: Implement Path Parameter Validation
- Create validation schema for category ID path parameter
- Ensure ID is positive integer
- Return 400 for invalid ID formats

### Step 3: Extend Request Body Validation
```typescript
// src/lib/validation/schemas.ts
export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  category_type: z.enum(['income', 'expense']).optional(),
  parent_id: z.number().int().min(0).optional(),
  tag: z.string().max(10).nullable().optional()
});
```

### Step 4: Implement Business Logic Validation
- Validate parent category exists and belongs to user
- Check hierarchy depth constraints
- Ensure category type consistency for parent-child relationships

### Step 5: Create API Endpoint Handler
```typescript
// src/pages/api/categories/[id].ts
export async function PATCH(context: APIContext): Promise<Response>
```
- Extract and validate path parameters
- Parse and validate request body
- Handle authentication and user extraction
- Call service layer and handle responses

### Step 6: Add Comprehensive Error Handling
- Map database errors to appropriate HTTP status codes
- Create meaningful error messages for business rule violations
- Handle trigger-based validation errors
- Include detailed validation error information

### Step 7: Implement Security Measures
- JWT token extraction and validation
- User identity verification
- Input sanitization and validation
- RLS policy compliance verification

### Step 8: Add Logging and Monitoring
- Log successful category updates with metadata
- Log error scenarios with context
- Monitor performance metrics for trigger execution
- Track category type cascading operations

### Step 9: Database Integration
- Ensure proper transaction handling
- Leverage existing database indexes
- Handle trigger-based validation errors appropriately
- Test cascade behavior for category type changes

### Step 10: Testing Strategy
- Unit tests for service layer methods
- Integration tests for API endpoint
- Edge case testing for hierarchy violations
- Authentication and authorization testing
- Error scenario validation
- Category type cascading verification
