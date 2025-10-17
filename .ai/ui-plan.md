# UI Architecture for Expense Tracker Web App

## 1. UI Structure Overview

The application uses a responsive, single-page layout with a top navigation bar and a main content area. On large screens, the dashboard displays a two-column grid (with two-rows): in first row a transaction table on the left and accounts table on the right, in second row transaction form on the left and nothing on the right. On mobile, the view collapses to a single column and the accounts table is hidden by default. A filter modal overlays the dashboard when triggered.

## 2. View List

### 2.1 Login View

- View path: `/login`
- Main purpose: Authenticate users via email/password.
- Key information: Email and password inputs, “Forgot Password” link, inline validation errors.
- Key components: Shadcn/ui `<Input>`, `<Button>`, error message `<Text>`.
- UX/accessibility/security:
  - `aria-describedby` for error messages
  - Secure handling of credentials in React Context

### 2.2 Password Reset View

- View path: `/reset-password`
- Main purpose: Send password reset email.
- Key information: Email input, submit button, confirmation feedback.
- Key components: `<Input type="email">`, `<Button>`.
- UX/accessibility/security:
  - Inline feedback on success/failure
  - Prevent reflection attacks by generic success message

### 2.3 Transactions View

- View path: `/`
- Main purpose: Add/edit transactions and view transaction history with account balances.
- Key information:
  - Always-visible transaction form (date, account, category, amount, comment)
  - Transactions table sorted desc by date
  - Accounts table (hidden below `md:` breakpoint)
  - Filter button and pagination controls (default limit=50)
- Key components:
  - `<TransactionForm>` (Shadcn/ui DatePicker + Select primitives)
  - `<TransactionTable>` and `<AccountTable>` (accessible `<table>` with `aria-label`)
  - `<FilterModal>` (dialog with focus trap, Shadcn/ui primitives)
  - `<Pagination>`
- UX/accessibility/security:
  - Inline field error messages (`aria-invalid`, `aria-describedby`)
  - Empty state cards with CTAs when no data
  - Keyboard focus in modal, close via Escape or close icon

### 2.4 Accounts Management View

- View path: `/accounts`
- Main purpose: CRUD operations on financial accounts.
- Key information: List of accounts with name, currency, balance, active status.
- Layout: Single column grid with tow rows: 1. table, 2. form
- Key components:
  - `<AccountList>` table
  - `<AccountForm>` inline form
- UX/accessibility/security:
  - Disable delete if soft-deleted
  - Confirm delete action
  - Inline validation based on API `details`

### 2.5 Categories Management View

- View path: `/categories`
- Main purpose: CRUD operations on income and expense categories.
- Layout for each tab: Single column grid with tow rows: 1. table, 2. form
- Key information:
  - Tabs for 'Income' and 'Expense'
  - Hierarchical list (parent > subcategories)
- Key components:
  - `<Tabs>` for type filter
  - `<CategoryList>` table/tree
  - `<CategoryForm>` inline form
- UX/accessibility/security:
  - Prevent delete when in use, show archive option
  - Inline validation for hierarchy/type mismatch

## 3. User Journey Map

1. **Unauthenticated**: User lands on `/login` → enters credentials → on success, store JWT in `AuthContext` → redirect to `/`
2. **Transactions**: On `/`, fetch `/api/transactions` & `/api/accounts` → display transaction form and tables.
3. **Add Transaction**: User fills form → POST `/api/transactions` → on success, refetch data via context → clear form.
4. **Filter Transactions**: Click filter button → open `<FilterModal>` → set criteria → apply → fetch `/api/transactions?…` → close modal.
5. **Edit/Delete Transaction**: Double-click row → load data into `<TransactionForm>` → PATCH or DELETE on API → refetch data.
6. **Navigate to Accounts**: Click “Accounts” → fetch `/api/accounts` → CRUD operations → return to `/` or via nav.
7. **Navigate to Categories**: Click “Categories” → fetch `/api/categories` → CRUD operations with tabs.
8. **Logout**: Click logout icon → clear JWT → redirect to `/login`.

## 4. Layout and Navigation Structure

- **Top Navigation Bar**: Links to Transactions, Accounts, Categories, Logout.
  - Collapses to hamburger menu below `lg:` breakpoint.
- **Grid Layout** (on Transactions):
  - `lg:grid grid-cols-2 gap-4`
  - Left: `<TransactionTable>` above `<TransactionForm>`
  - Right: `<AccountTable>`
- **Responsive**:
  - At `md:` breakpoint and below, hide `<AccountTable>`; at `sm:` collapse to single column.
  - Tables stack vertically.

## 5. Key Components

- **AuthContext** & **TransactionFormContext** & **FilterModalContext**: Manage JWT, form state, filter state, refetch callbacks.
- **TransactionForm**: Uses Shadcn/ui DatePicker, Select, `<input type="number">`, `<input type="text" maxLength=255>`.
- **FilterModal**: `<dialog aria-modal="true">` with focus trap, Shadcn/ui primitives for multi-select, date pickers, number inputs.
- **Tables**: Accessible `<table>` with `role="table"`, sortable headers, pagination controls, empty states.
- **Forms**: Inline field-level validation displaying messages from API `details` under inputs with `aria-invalid`.
- **Tabs**: For Category types.
- **Icons**: Heroicons via Shadcn/ui for actions (hamburger, close, edit, delete, filter).
