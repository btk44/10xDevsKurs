# REST API Plan - Expense Tracker Application

## 1. Overview

This REST API plan defines the backend interface for the expense tracking web application. The API follows REST principles, uses JSON for data exchange, and leverages Supabase for authentication and database operations with Row Level Security (RLS) for data isolation.

### Base URL

```
/api
```

### Authentication

All endpoints (except authentication and public endpoints) require a valid JWT token from Supabase Auth in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

---

## 2. Resources

| Resource     | Database Table/View                      | Description                                          |
| ------------ | ---------------------------------------- | ---------------------------------------------------- |
| Currencies   | `currencies`                             | ISO currency codes (read-only for users)             |
| Accounts     | `accounts`, `view_accounts_with_balance` | User's financial accounts with calculated balances   |
| Categories   | `categories`                             | Income and expense categories with hierarchy support |
| Transactions | `transactions`                           | Financial transactions (income/expense)              |
| Reports      | `view_category_monthly_summary`          | Monthly summaries and aggregations                   |

---

## 3. Endpoints

### 3.1 Authentication

Authentication is handled directly by Supabase Auth. The frontend should use Supabase client library for:

- **Sign Up**: `supabase.auth.signUp({ email, password })`
- **Sign In**: `supabase.auth.signInWithPassword({ email, password })`
- **Sign Out**: `supabase.auth.signOut()`
- **Password Reset**: `supabase.auth.resetPasswordForEmail(email)`

All other API endpoints require the JWT token obtained from Supabase Auth.

---

### 3.2 Currencies

#### GET /api/currencies

Retrieve list of all active currencies.

**Authentication**: Required

**Query Parameters**: None

**Request Body**: None

**Response** (200 OK):

```json
{
  "data": [
    {
      "id": 1,
      "code": "PLN",
      "description": "Polish Zloty",
      "active": true
    },
    {
      "id": 2,
      "code": "EUR",
      "description": "Euro",
      "active": true
    }
  ]
}
```

**Error Responses**:

- `401 Unauthorized`: Missing or invalid authentication token

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

---

### 3.3 Accounts

#### GET /api/accounts

Retrieve all user's accounts with calculated balances.

**Authentication**: Required

**Query Parameters**:

- `include_inactive` (boolean, optional): Include soft-deleted accounts (default: false)

**Request Body**: None

**Response** (200 OK):

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

**Error Responses**:

- `401 Unauthorized`: Missing or invalid authentication token

---

#### GET /api/accounts/:id

Retrieve a single account with calculated balance.

**Authentication**: Required

**Path Parameters**:

- `id` (integer, required): Account ID

**Request Body**: None

**Response** (200 OK):

```json
{
  "data": {
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
}
```

**Error Responses**:

- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Account not found or doesn't belong to user

```json
{
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account not found"
  }
}
```

---

#### POST /api/accounts

Create a new account.

**Authentication**: Required

**Request Body**:

```json
{
  "name": "Savings Account",
  "currency_id": 1,
  "tag": "SAV"
}
```

**Validation Rules**:

- `name`: Required, not empty after trim, max 100 characters
- `currency_id`: Required, must exist in currencies table
- `tag`: Optional, max 10 characters

**Response** (201 Created):

```json
{
  "data": {
    "id": 2,
    "user_id": "uuid-here",
    "name": "Savings Account",
    "currency_id": 1,
    "currency_code": "PLN",
    "currency_description": "Polish Zloty",
    "tag": "SAV",
    "balance": 0.0,
    "active": true,
    "created_at": "2025-10-10T10:00:00Z",
    "updated_at": "2025-10-10T10:00:00Z"
  }
}
```

**Error Responses**:

- `400 Bad Request`: Validation error

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

- `401 Unauthorized`: Missing or invalid authentication token

---

#### PATCH /api/accounts/:id

Update an existing account.

**Authentication**: Required

**Path Parameters**:

- `id` (integer, required): Account ID

**Request Body** (all fields optional):

```json
{
  "name": "Updated Account Name",
  "currency_id": 2,
  "tag": "NEW"
}
```

**Validation Rules**:

- `name`: If provided, not empty after trim, max 100 characters
- `currency_id`: If provided, must exist in currencies table
- `tag`: If provided, max 10 characters

**Response** (200 OK):

```json
{
  "data": {
    "id": 2,
    "user_id": "uuid-here",
    "name": "Updated Account Name",
    "currency_id": 2,
    "currency_code": "EUR",
    "currency_description": "Euro",
    "tag": "NEW",
    "balance": 0.0,
    "active": true,
    "created_at": "2025-10-10T10:00:00Z",
    "updated_at": "2025-10-10T11:00:00Z"
  }
}
```

**Error Responses**:

- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Account not found or doesn't belong to user

---

#### DELETE /api/accounts/:id

Soft delete an account (sets active=false and cascades to related transactions).

**Authentication**: Required

**Path Parameters**:

- `id` (integer, required): Account ID

**Request Body**: None

**Response** (204 No Content)

**Business Logic**:

- Sets `account.active = false`
- Sets `transactions.active = false` for all transactions related to this account

**Error Responses**:

- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Account not found or doesn't belong to user

---

### 3.4 Categories

#### GET /api/categories

Retrieve all user's categories.

**Authentication**: Required

**Query Parameters**:

- `type` (string, optional): Filter by category type ('income' or 'expense')
- `parent_id` (integer, optional): Filter by parent category (0 for main categories, >0 for subcategories)
- `include_inactive` (boolean, optional): Include soft-deleted categories (default: false)

**Request Body**: None

**Response** (200 OK):

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
    },
    {
      "id": 2,
      "user_id": "uuid-here",
      "name": "Food",
      "category_type": "expense",
      "parent_id": 0,
      "tag": null,
      "active": true,
      "created_at": "2025-10-01T10:00:00Z",
      "updated_at": "2025-10-01T10:00:00Z"
    },
    {
      "id": 3,
      "user_id": "uuid-here",
      "name": "Groceries",
      "category_type": "expense",
      "parent_id": 2,
      "tag": null,
      "active": true,
      "created_at": "2025-10-01T10:00:00Z",
      "updated_at": "2025-10-01T10:00:00Z"
    }
  ]
}
```

**Error Responses**:

- `401 Unauthorized`: Missing or invalid authentication token

---

#### GET /api/categories/:id

Retrieve a single category.

**Authentication**: Required

**Path Parameters**:

- `id` (integer, required): Category ID

**Request Body**: None

**Response** (200 OK):

```json
{
  "data": {
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
}
```

**Error Responses**:

- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Category not found or doesn't belong to user

---

#### POST /api/categories

Create a new category.

**Authentication**: Required

**Request Body**:

```json
{
  "name": "Groceries",
  "category_type": "expense",
  "parent_id": 2,
  "tag": "GROC"
}
```

**Validation Rules**:

- `name`: Required, not empty after trim, max 100 characters
- `category_type`: Required, must be 'income' or 'expense' (default: 'expense')
- `parent_id`: Required, >= 0 (default: 0)
- `tag`: Optional, max 10 characters
- **Hierarchy Validation**:
  - If `parent_id > 0`: Parent must exist, be active, and belong to user
  - If `parent_id > 0`: Parent cannot be a subcategory (max 2 levels)
  - If `parent_id > 0`: `category_type` must match parent's `category_type`

**Response** (201 Created):

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

**Error Responses**:

- `400 Bad Request`: Validation error

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

```json
{
  "error": {
    "code": "HIERARCHY_ERROR",
    "message": "Maximum category depth is 2 levels"
  }
}
```

```json
{
  "error": {
    "code": "TYPE_MISMATCH_ERROR",
    "message": "Subcategory type must match parent category type"
  }
}
```

- `401 Unauthorized`: Missing or invalid authentication token

---

#### PATCH /api/categories/:id

Update an existing category.

**Authentication**: Required

**Path Parameters**:

- `id` (integer, required): Category ID

**Request Body** (all fields optional):

```json
{
  "name": "Updated Category Name",
  "category_type": "income",
  "parent_id": 0,
  "tag": "NEW"
}
```

**Validation Rules**:

- Same as POST /api/categories
- **Note**: Changing `category_type` on a parent category will cascade to all child categories

**Response** (200 OK):

```json
{
  "data": {
    "id": 3,
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

**Error Responses**:

- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Category not found or doesn't belong to user

---

#### DELETE /api/categories/:id

Soft delete a category (only if no active transactions exist).

**Authentication**: Required

**Path Parameters**:

- `id` (integer, required): Category ID

**Request Body**: None

**Response** (204 No Content)

**Business Logic**:

- Checks if category has any active transactions
- If yes, returns 409 Conflict error
- If no, sets `category.active = false`

**Error Responses**:

- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Category not found or doesn't belong to user
- `409 Conflict`: Category has active transactions

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

---

### 3.5 Transactions

#### GET /api/transactions

Retrieve user's transactions with filtering, sorting, and pagination.

**Authentication**: Required

**Query Parameters**:

- `date_from` (string, optional): Start date in ISO 8601 format (e.g., "2025-10-01")
- `date_to` (string, optional): End date in ISO 8601 format (e.g., "2025-10-31")
- `account_id` (integer, optional): Filter by account
- `category_id` (integer, optional): Filter by category
- `search` (string, optional): Text search in comment field
- `sort` (string, optional): Sort field and direction (default: "transaction_date:desc")
  - Options: "transaction_date:asc", "transaction_date:desc", "amount:asc", "amount:desc"
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 50, max: 100)
- `include_inactive` (boolean, optional): Include soft-deleted transactions (default: false)

**Request Body**: None

**Response** (200 OK):

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
      "amount": 45.5,
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

**Error Responses**:

- `400 Bad Request`: Invalid query parameters

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

- `401 Unauthorized`: Missing or invalid authentication token

---

#### GET /api/transactions/:id

Retrieve a single transaction.

**Authentication**: Required

**Path Parameters**:

- `id` (integer, required): Transaction ID

**Request Body**: None

**Response** (200 OK):

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

**Error Responses**:

- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Transaction not found or doesn't belong to user

---

#### POST /api/transactions

Create a new transaction.

**Authentication**: Required

**Request Body**:

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

**Validation Rules**:

- `transaction_date`: Required, valid ISO 8601 timestamp
- `account_id`: Required, must exist in user's accounts and be active
- `category_id`: Required, must exist in user's categories and be active
- `amount`: Required, must be > 0, max 9999999999.99, decimal with 2 decimal places
- `currency_id`: Required, must exist in currencies table
- `comment`: Optional, max 255 characters

**Response** (201 Created):

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

**Error Responses**:

- `400 Bad Request`: Validation error

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

- `401 Unauthorized`: Missing or invalid authentication token

---

#### PATCH /api/transactions/:id

Update an existing transaction.

**Authentication**: Required

**Path Parameters**:

- `id` (integer, required): Transaction ID

**Request Body** (all fields optional):

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

**Validation Rules**:

- Same as POST /api/transactions

**Response** (200 OK):

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

**Error Responses**:

- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Transaction not found or doesn't belong to user

---

#### DELETE /api/transactions/:id

Soft delete a transaction (sets active=false).

**Authentication**: Required

**Path Parameters**:

- `id` (integer, required): Transaction ID

**Request Body**: None

**Response** (204 No Content)

**Business Logic**:

- Sets `transaction.active = false`

**Error Responses**:

- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Transaction not found or doesn't belong to user

---

### 3.6 Reports

#### GET /api/reports/monthly-summary

Retrieve monthly summary of transactions grouped by category with hierarchical aggregation.

**Authentication**: Required

**Query Parameters**:

- `year` (integer, optional): Year (default: current year)
- `month` (integer, optional): Month 1-12 (default: current month)

**Request Body**: None

**Response** (200 OK):

```json
{
  "data": {
    "year": 2025,
    "month": 10,
    "report_date": "2025-10-10",
    "income_categories": [
      {
        "category_id": 1,
        "category_name": "Salary",
        "category_type": "income",
        "parent_id": 0,
        "total_amount": 5000.0,
        "transaction_count": 2
      }
    ],
    "expense_categories": [
      {
        "category_id": 2,
        "category_name": "Food",
        "category_type": "expense",
        "parent_id": 0,
        "total_amount": 850.0,
        "transaction_count": 25
      },
      {
        "category_id": 3,
        "category_name": "Groceries",
        "category_type": "expense",
        "parent_id": 2,
        "total_amount": 450.0,
        "transaction_count": 12
      }
    ],
    "totals": {
      "total_income": 5000.0,
      "total_expenses": 850.0,
      "net_balance": 4150.0
    }
  }
}
```

**Business Logic**:

- Uses `view_category_monthly_summary` database view
- Hierarchical aggregation: subcategory amounts are included in parent category totals
- Only active categories and transactions included
- Separated by income/expense type
- If no transactions for the month, returns empty arrays

**Error Responses**:

- `400 Bad Request`: Invalid year or month parameters

```json
{
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Invalid query parameters",
    "details": [
      {
        "field": "month",
        "message": "Month must be between 1 and 12"
      }
    ]
  }
}
```

- `401 Unauthorized`: Missing or invalid authentication token

---

## 4. Authentication and Authorization

### 4.1 Authentication Mechanism

The application uses **Supabase Authentication** with JWT (JSON Web Tokens).

**Implementation Details**:

1. **User Registration/Login**: Handled by Supabase Auth service directly from frontend
2. **Token Management**:
   - Access token (JWT) provided by Supabase after successful authentication
   - Token included in `Authorization: Bearer <token>` header for all API requests
   - Token contains `user_id` (UUID) used for data isolation
3. **Token Validation**:
   - Astro middleware validates JWT on every API request
   - Extracts `user_id` from validated token
   - Passes `user_id` to API endpoint handlers

### 4.2 Authorization Strategy

**Row Level Security (RLS)**:

- All database queries automatically filtered by `user_id` from authenticated token
- Supabase RLS policies enforce: `auth.uid() = user_id`
- Users can only access their own data:
  - Accounts: `WHERE user_id = auth.uid()`
  - Categories: `WHERE user_id = auth.uid()`
  - Transactions: `WHERE user_id = auth.uid()`
- Exception: Currencies table is read-only for all authenticated users

**API Layer Authorization**:

1. Middleware extracts `user_id` from JWT token
2. All database queries include `user_id` filter
3. Foreign key validation checks ownership (e.g., account_id must belong to user)
4. Soft delete operations verify ownership before marking inactive

### 4.3 Security Headers

All API responses include security headers:

```
Content-Type: application/json
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

---

## 5. Validation and Business Logic

### 5.1 Validation Rules by Resource

#### Currencies (Read-only for users)

No validation needed for user operations.

#### Accounts

- **name**:
  - Required
  - Not empty after trim: `LENGTH(TRIM(name)) > 0`
  - Max length: 100 characters
- **currency_id**:
  - Required
  - Must exist in `currencies` table
  - Must be active currency
- **tag**:
  - Optional
  - Max length: 10 characters

#### Categories

- **name**:
  - Required
  - Not empty after trim: `LENGTH(TRIM(name)) > 0`
  - Max length: 100 characters
- **category_type**:
  - Required
  - Must be enum value: 'income' or 'expense'
  - Default: 'expense'
- **parent_id**:
  - Required
  - Must be >= 0
  - Default: 0
  - If > 0: Parent must exist, be active, and belong to user
  - If > 0: Parent cannot be a subcategory (max 2-level hierarchy)
  - Cannot equal category's own id (cannot be self-parent)
- **tag**:
  - Optional
  - Max length: 10 characters
- **Hierarchy validation**:
  - If parent_id > 0: category_type must match parent's category_type

#### Transactions

- **transaction_date**:
  - Required
  - Valid ISO 8601 timestamp
- **account_id**:
  - Required
  - Must exist in user's `accounts` table
  - Account must be active
- **category_id**:
  - Required
  - Must exist in user's `categories` table
  - Category must be active
- **amount**:
  - Required
  - Must be > 0 (positive only)
  - Max: 9999999999.99
  - Decimal with 2 decimal places (12,2)
- **currency_id**:
  - Required
  - Must exist in `currencies` table
  - Must be active currency
- **comment**:
  - Optional
  - Max length: 255 characters

### 5.2 Business Logic Implementation

#### BL-1: Soft Delete Strategy

**Accounts Deletion**:

```
DELETE /api/accounts/:id
1. Verify account belongs to user
2. Set account.active = false
3. Cascade: Set transactions.active = false WHERE account_id = :id AND user_id = current_user
```

**Categories Deletion**:

```
DELETE /api/categories/:id
1. Verify category belongs to user
2. Check for active transactions: SELECT COUNT(*) FROM transactions WHERE category_id = :id AND active = true
3. If count > 0: Return 409 Conflict with transaction count
4. If count = 0: Set category.active = false
```

**Transactions Deletion**:

```
DELETE /api/transactions/:id
1. Verify transaction belongs to user
2. Set transaction.active = false
```

#### BL-2: Balance Calculation

**Account Balance**:

- NOT stored in database
- Calculated using database function: `calculate_account_balance(account_id, user_id)`
- Formula: `SUM(CASE WHEN category_type = 'income' THEN amount ELSE -amount END)`
- Only includes active transactions and active categories
- Returned in GET /api/accounts and GET /api/accounts/:id

#### BL-3: Transaction Type Derivation

- Transaction type (income/expense) is NOT stored in transactions table
- Automatically derived from linked category's `category_type`
- API responses include `category_type` from joined category data
- Balance calculations use category type to determine if amount adds or subtracts

#### BL-4: Category Hierarchy

**Validation on Create/Update**:

```
1. If parent_id = 0: Main category (no additional checks)
2. If parent_id > 0:
   a. Verify parent exists and belongs to user
   b. Verify parent is active
   c. Check parent is NOT a subcategory: SELECT parent_id FROM categories WHERE id = parent_id
      - If parent.parent_id > 0: Error "Maximum category depth is 2 levels"
   d. Verify category_type matches parent's category_type
      - If mismatch: Error "Subcategory type must match parent category type"
```

**Type Change Cascade**:

```
When PATCH /api/categories/:id changes category_type on parent (parent_id = 0):
1. Update category.category_type = new_type
2. Trigger cascades: UPDATE categories SET category_type = new_type WHERE parent_id = :id
3. Affects all historical transaction balance calculations
```

#### BL-5: Monthly Summary

**Aggregation Logic**:

```
1. Filter transactions by date range:
   - Start: DATE_TRUNC('month', '{year}-{month}-01')
   - End: Start + INTERVAL '1 month'
2. Join with categories to get category_type
3. Group by category_id, category_type
4. Hierarchical rollup:
   - Subcategories show individual totals
   - Parent categories include rolled-up subcategory totals
5. Separate income and expense in response
6. Calculate summary totals
```

#### BL-6: Filtering and Pagination

**Transaction Filtering**:

```
GET /api/transactions supports:
- date_from, date_to: WHERE transaction_date >= date_from AND transaction_date < date_to
- account_id: WHERE account_id = :account_id
- category_id: WHERE category_id = :category_id
- search: WHERE comment ILIKE '%:search%'
- Combined with AND logic
- Always includes: WHERE user_id = current_user AND active = true (unless include_inactive=true)
```

**Pagination**:

```
- Default: 50 items per page
- Max: 100 items per page
- Offset calculation: (page - 1) * limit
- Response includes: total_items, total_pages, current page, limit
```

**Sorting**:

```
- Default: transaction_date DESC (most recent first)
- Options: transaction_date:asc, transaction_date:desc, amount:asc, amount:desc
- Format: ORDER BY {field} {direction}
```

### 5.3 Error Handling

**Validation Errors (400 Bad Request)**:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "field_name",
        "message": "Specific validation error message"
      }
    ]
  }
}
```

**Business Logic Errors**:

- `409 Conflict`: Category has active transactions (cannot delete)
- `400 Bad Request`: Hierarchy violation, type mismatch
- `404 Not Found`: Resource not found or doesn't belong to user

**Authentication/Authorization Errors**:

- `401 Unauthorized`: Missing, invalid, or expired token
- `403 Forbidden`: Valid token but insufficient permissions (if needed)

### 5.4 Performance Considerations

**Database Optimization**:

- Use database views for complex queries (`view_accounts_with_balance`, `view_category_monthly_summary`)
- Leverage indexes defined in database schema:
  - `idx_transactions_user_date` for transaction lists
  - `idx_transactions_monthly` for monthly summaries
  - `idx_categories_type` for category filtering
- Implement pagination to limit result sets
- Use conditional indexes with `WHERE active = true`

**Response Time Targets** (from database PRD):

- Single transaction: < 10ms
- Transaction list (50 records): < 50ms
- Account balance: < 100ms
- Monthly summary: < 150ms

**Caching Strategy**:

- Currency list can be cached (static data)
- Account balances calculated on-demand (real-time accuracy)
- Monthly summaries can be cached per user per month

---

## 6. API Versioning

Current version: **v1** (implicit, no version in URL for MVP)

Future versioning strategy:

- URL-based: `/api/v2/resource` when breaking changes needed
- Header-based: `Accept: application/vnd.expensetracker.v2+json` (alternative)

---

## 7. Rate Limiting

**Rate Limits** (to be implemented):

- Authenticated users: 1000 requests per hour
- Per endpoint: 100 requests per minute
- Response headers:
  ```
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 950
  X-RateLimit-Reset: 1633024800
  ```
- Status code: `429 Too Many Requests`

---

## 8. CORS Configuration

**Allowed Origins**:

- Development: `http://localhost:4321`, `http://localhost:3000`
- Production: Application's production domain

**Allowed Methods**:

- GET, POST, PATCH, DELETE, OPTIONS

**Allowed Headers**:

- Authorization, Content-Type

---

## 9. API Response Standards

### 9.1 Success Responses

**Single Resource**:

```json
{
  "data": {
    /* resource object */
  }
}
```

**Resource Collection**:

```json
{
  "data": [
    /* array of resource objects */
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_items": 150,
    "total_pages": 3
  }
}
```

**No Content** (204):

- Empty response body
- Used for successful DELETE operations

### 9.2 Error Responses

**Standard Error Format**:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      /* optional additional context */
    }
  }
}
```

**HTTP Status Codes**:

- `200 OK`: Successful GET, PATCH
- `201 Created`: Successful POST
- `204 No Content`: Successful DELETE
- `400 Bad Request`: Validation error, invalid parameters
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Business logic conflict (e.g., category in use)
- `422 Unprocessable Entity`: Semantic errors
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## 10. Implementation Notes for Astro + Supabase

### 10.1 Middleware Structure

**Location**: `/src/middleware/index.ts`

```typescript
// Middleware responsibilities:
1. Extract JWT from Authorization header
2. Validate JWT using Supabase client
3. Extract user_id from token payload
4. Attach user_id to request context
5. Handle authentication errors
6. Pass control to route handlers
```

### 10.2 API Route Structure

**Location**: `/src/pages/api/**/*.ts`

```typescript
// Route handler responsibilities:
1. Extract user_id from context (provided by middleware)
2. Parse and validate request body/query parameters
3. Execute business logic with user_id
4. Use Supabase client for database operations
5. Format response according to standards
6. Handle errors and return appropriate status codes
```

### 10.3 Supabase Client Usage

```typescript
// Use Supabase client with RLS:
- Client automatically applies RLS policies
- Include user_id in context for additional filtering
- Use service role key only for admin operations (if needed)
- Regular operations use authenticated user context
```

### 10.4 Database Views Integration

```typescript
// Accessing views:
- view_accounts_with_balance: Use for GET /api/accounts
- view_category_monthly_summary: Use for GET /api/reports/monthly-summary
- Views respect RLS and user_id filtering
- Provide pre-calculated data for better performance
```

---

## 11. Testing Considerations

### 11.1 API Testing Requirements

**Unit Tests**:

- Validation logic for each resource
- Business logic functions (balance calculation, hierarchy validation)
- Error handling

**Integration Tests**:

- Complete CRUD flows for each resource
- Authentication and authorization
- Cascading soft deletes
- Monthly summary calculations
- Filtering and pagination

**Test Data**:

- Multiple users for RLS verification
- Hierarchical categories (parent/child)
- Mixed income/expense transactions
- Edge cases: empty results, maximum values, boundary conditions

### 11.2 Manual Testing Checklist

- [ ] User cannot access another user's data
- [ ] Soft delete cascades correctly
- [ ] Balance calculations reflect income/expense types
- [ ] Category hierarchy validation works (max 2 levels)
- [ ] Category type mismatch prevented for subcategories
- [ ] Category deletion blocked when transactions exist
- [ ] Transaction amount must be positive
- [ ] Monthly summary shows hierarchical aggregation
- [ ] Filtering combinations work correctly
- [ ] Pagination calculates totals correctly

---

## 12. Future Enhancements (Post-MVP)

**API Extensions**:

1. **Bulk Operations**: POST /api/transactions/bulk for importing multiple transactions
2. **Data Export**: GET /api/export/transactions?format=csv|json
3. **Recurring Transactions**: CRUD endpoints for recurring transaction templates
4. **Budget Management**: CRUD endpoints for budget tracking
5. **Multi-currency**: GET /api/accounts/total-balance with currency conversion
6. **Sharing**: Endpoints for sharing accounts between users
7. **Audit Log**: GET /api/audit-log for tracking changes
8. **Analytics**: GET /api/reports/spending-trends, GET /api/reports/category-comparison

---

## Appendix A: Complete Endpoint Summary

| Method | Endpoint                     | Description                               | Auth Required |
| ------ | ---------------------------- | ----------------------------------------- | ------------- |
| GET    | /api/currencies              | List all currencies                       | Yes           |
| GET    | /api/accounts                | List accounts with balances               | Yes           |
| GET    | /api/accounts/:id            | Get account with balance                  | Yes           |
| POST   | /api/accounts                | Create account                            | Yes           |
| PATCH  | /api/accounts/:id            | Update account                            | Yes           |
| DELETE | /api/accounts/:id            | Soft delete account                       | Yes           |
| GET    | /api/categories              | List categories (filterable)              | Yes           |
| GET    | /api/categories/:id          | Get single category                       | Yes           |
| POST   | /api/categories              | Create category                           | Yes           |
| PATCH  | /api/categories/:id          | Update category                           | Yes           |
| DELETE | /api/categories/:id          | Soft delete category                      | Yes           |
| GET    | /api/transactions            | List transactions (filterable, paginated) | Yes           |
| GET    | /api/transactions/:id        | Get single transaction                    | Yes           |
| POST   | /api/transactions            | Create transaction                        | Yes           |
| PATCH  | /api/transactions/:id        | Update transaction                        | Yes           |
| DELETE | /api/transactions/:id        | Soft delete transaction                   | Yes           |
| GET    | /api/reports/monthly-summary | Get monthly category summary              | Yes           |

---

## Appendix B: Database Schema Quick Reference

**Tables**:

- `currencies` (id, code, description, active)
- `accounts` (id, user_id, name, currency_id, tag, active)
- `categories` (id, user_id, name, category_type, parent_id, tag, active)
- `transactions` (id, user_id, transaction_date, account_id, category_id, amount, currency_id, comment, active)

**Views**:

- `view_accounts_with_balance` (accounts with calculated balance)
- `view_category_monthly_summary` (monthly hierarchical category aggregation)

**Functions**:

- `calculate_account_balance(account_id, user_id)` → DECIMAL(12,2)
- `get_category_type(category_id)` → category_type_enum

**ENUM Types**:

- `category_type_enum` ('income', 'expense')

---

_End of REST API Plan_
