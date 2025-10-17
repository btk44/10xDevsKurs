# API Endpoint Implementation Plan: POST /api/categories

## 1. Endpoint Overview

The POST /api/categories endpoint creates a new expense or income category with support for 2-level hierarchical organization. Categories can be main categories (parent_id = 0) or subcategories (parent_id > 0) and must have a type of either 'income' or 'expense'. The endpoint enforces complex business rules including hierarchy validation, parent existence checks, and category type inheritance.

**Key Functionality:**

- Create main categories and subcategories (max 2 levels)
- Enforce category type inheritance (subcategories must match parent type)
- Validate parent category existence and ownership
- Support optional tagging for categorization
- Ensure user data isolation through RLS

## 2. Request Details

- **HTTP Method**: POST
- **URL Structure**: `/api/categories`
- **Content-Type**: `application/json`
- **Authentication**: Required (Bearer token)

**Parameters:**

- **Required**: None (all fields have defaults or are optional)
- **Optional**: All fields in request body

**Request Body Structure:**

```json
{
  "name": "Groceries", // Required: string, max 100 chars, not empty after trim
  "category_type": "expense", // Optional: 'income' | 'expense', default 'expense'
  "parent_id": 2, // Optional: number >= 0, default 0
  "tag": "GROC" // Optional: string, max 10 chars
}
```

## 3. Used Types

**Input Types:**

- `CreateCategoryCommand` - Command model for category creation
- `CategoryType` - Enum type for category classification

**Output Types:**

- `CategoryDTO` - Full category data transfer object
- `ApiResponse<CategoryDTO>` - Wrapped success response
- `ApiErrorResponse` - Error response wrapper
- `ErrorDTO` - Error details structure
- `ValidationErrorDetail` - Field-level validation errors

**Service Types:**

- Category entity from database.types.ts
- Supabase client types for database operations

## 4. Response Details

**Success Response (201 Created):**

```json
{
  "data": {
    "id": 3,
    "user_id": "uuid-here",
    "name": "Groceries",
    "category_type": "expense",
    "parent_id": 2,
    "tag": "GROC",
    "active": true,
    "created_at": "2025-10-10T10:00:00Z",
    "updated_at": "2025-10-10T10:00:00Z"
  }
}
```

**Error Responses:**

- **400 Bad Request**: Validation errors, hierarchy violations, type mismatches
- **401 Unauthorized**: Missing or invalid authentication token
- **500 Internal Server Error**: Database errors, unexpected server errors

## 5. Data Flow

```
1. Request Reception
   ├── Extract auth token from headers
   ├── Parse and validate JSON body
   └── Extract user_id from auth.uid()

2. Input Validation
   ├── Validate required fields (name)
   ├── Validate field constraints (lengths, formats)
   ├── Set defaults (category_type='expense', parent_id=0)
   └── Sanitize input data

3. Business Logic Validation
   ├── If parent_id > 0:
   │   ├── Verify parent exists and is active
   │   ├── Verify parent belongs to user
   │   ├── Verify parent is not a subcategory
   │   └── Verify category_type matches parent type
   └── Prepare data for insertion

4. Database Operations
   ├── Insert category record with user_id
   ├── Handle database constraints/triggers
   └── Retrieve created category data

5. Response Formation
   ├── Map database result to CategoryDTO
   ├── Wrap in ApiResponse structure
   └── Return 201 Created status
```

## 6. Security Considerations

**Authentication & Authorization:**

- Verify JWT token presence and validity
- Extract user_id from authenticated session (auth.uid())
- Rely on RLS policies to enforce user data isolation

**Input Security:**

- Sanitize all string inputs to prevent injection attacks
- Validate all numeric inputs against expected ranges
- Enforce maximum string lengths to prevent buffer issues
- Use parameterized queries for database operations

**Data Protection:**

- User can only create categories for themselves (enforced by RLS)
- Parent category ownership verification prevents unauthorized access
- Active flag prevents access to deleted categories

**Potential Threats:**

- **SQL Injection**: Mitigated by parameterized queries and Supabase client
- **Unauthorized Category Access**: Mitigated by parent ownership validation
- **Hierarchy Manipulation**: Mitigated by database triggers and validation
- **Type Confusion**: Mitigated by ENUM constraints and validation

## 7. Error Handling

**Validation Errors (400 Bad Request):**

_Field Validation:_

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "name",
        "message": "Name is required and cannot be empty"
      }
    ]
  }
}
```

_Hierarchy Errors:_

```json
{
  "error": {
    "code": "HIERARCHY_ERROR",
    "message": "Maximum category depth is 2 levels"
  }
}
```

_Type Mismatch:_

```json
{
  "error": {
    "code": "TYPE_MISMATCH_ERROR",
    "message": "Subcategory type must match parent category type"
  }
}
```

_Parent Not Found:_

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "parent_id",
        "message": "Parent category does not exist or is not active"
      }
    ]
  }
}
```

**Authentication Errors (401 Unauthorized):**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**Server Errors (500 Internal Server Error):**

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## 8. Performance Considerations

**Database Optimization:**

- Leverage existing indexes on categories table:
  - `idx_categories_user_active` for user filtering
  - `idx_categories_parent` for parent lookups
  - `idx_categories_type` for type filtering
- Single INSERT operation with minimal joins

**Query Efficiency:**

- Parent validation requires single SELECT query
- Category creation uses single INSERT query
- Response data retrieved in single SELECT with joins

**Caching Strategy:**

- No caching needed for creation endpoint
- Consider caching category hierarchies at application level for reads

**Potential Bottlenecks:**

- Parent category validation adds one extra query
- Database triggers for hierarchy validation may add overhead
- Concurrent creation of subcategories under same parent (mitigated by database constraints)

## 9. Implementation Steps

### Step 1: Create/Update CategoryService

```typescript
// In src/lib/services/CategoryService.ts
export class CategoryService {
  async createCategory(command: CreateCategoryCommand, userId: string): Promise<CategoryDTO>;
  async validateParentCategory(parentId: number, userId: string, expectedType: CategoryType): Promise<void>;
  private mapToCategoryDTO(dbResult: any): CategoryDTO;
}
```

### Step 2: Implement Request Validation Schema

```typescript
// In src/lib/validation/schemas.ts
export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  category_type: z.enum(["income", "expense"]).default("expense"),
  parent_id: z.number().int().gte(0, "Parent ID must be >= 0").default(0),
  tag: z.string().max(10, "Tag too long").optional(),
});
```

### Step 3: Create API Route Handler

```typescript
// In src/pages/api/categories.ts
export async function POST({ request }: APIContext): Promise<Response> {
  // 1. Authentication check
  // 2. Request body parsing and validation
  // 3. Business logic execution via CategoryService
  // 4. Error handling with proper status codes
  // 5. Success response formatting
}
```

### Step 4: Implement Business Logic in CategoryService

- Parent category existence and ownership validation
- Category type inheritance validation
- Hierarchy depth validation
- Database insertion with proper error handling

### Step 5: Add Comprehensive Error Handling

- Validation error mapping to 400 responses
- Authentication error handling for 401 responses
- Database error handling for 500 responses
- Specific error codes for different validation failures

### Step 6: Add Request/Response Logging

- Log incoming requests with sanitized data
- Log validation failures with details
- Log successful category creation
- Log database errors for debugging

### Step 7: Integration Testing

- Test successful category creation (main and subcategory)
- Test all validation scenarios
- Test authentication requirements
- Test user data isolation
- Test concurrent creation scenarios

### Step 8: Performance Testing

- Measure response times under load
- Validate database query performance
- Test with large numbers of existing categories
- Verify index usage in query plans
