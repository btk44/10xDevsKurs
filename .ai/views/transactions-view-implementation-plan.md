# View Implementation Plan Transactions View

## 1. Overview

The Transactions View is the main dashboard for managing user transactions and viewing account balances. It provides an always-visible transaction form for creating and editing transactions, a paginated and sortable transactions table, filtering controls, and an accounts summary table. The layout is responsive and built with Astro, React, TailwindCSS, and Shadcn/ui components.

## 2. View Routing

- Path: `/`

## 3. Component Structure

- `TransactionsPage`
  - `FilterModal`
  - Grid Container (`lg:grid grid-cols-2 gap-4`)
    - Left Column
      - `TransactionTable`
        - `Pagination`
      - `TransactionForm`
    - Right Column
      - `AccountTable`

## 4. Component Details

### TransactionsPage

- Description: Root view component orchestrating data fetching, state, and layout.
- Elements: Filter button, grid container, child components.
- Handled events: open/close filter modal, page changes, sort changes, row double-click, form submit/edit/delete, filter apply/cancel.
- Props: none.
- State: filters, pagination, sort, selectedTransaction, showFilterModal.

### FilterModal

- Description: Dialog for setting filter criteria (date range, account, category, search).
- Elements: Date pickers (`DatePicker`), selects (`Select`), input for text, apply and cancel buttons.
- Events: onApply(filters), onCancel().
- Validation: date_from ≤ date_to; search length ≤ 100.
- Props:
  - `isOpen: boolean`
  - `initialFilters: TransactionFilters`
  - `onApply(filters: TransactionFilters): void`
  - `onCancel(): void`

### TransactionTable

- Description: Displays list of transactions in a sortable table.
- Elements: `<table>` with columns: Date, Account, Category, Amount, Comment, Actions.
- Events: onSortChange(sort: SortOption), onRowDoubleClick(transaction: TransactionDTO).
- Props:
  - `transactions: TransactionDTO[]`
  - `pagination: PaginationDTO`
  - `sort: SortOption`
  - `onPageChange(page: number): void`
  - `onSortChange(sort: SortOption): void`
  - `onRowDoubleClick(transaction: TransactionDTO): void`

### Pagination

- Description: Controls for navigating pages.
- Elements: Prev/Next buttons, page numbers.
- Events: onPageChange(page: number).
- Props: `pagination: PaginationDTO`, `onPageChange(page: number)`.

### TransactionForm

- Description: Form for creating or editing a transaction.
- Elements: DatePicker (`transaction_date`), Select (`account_id`), Select (`category_id`), `<input type="number">` (`amount`), `<input type="text" maxLength=255>` (`comment`), Save, Cancel, Delete buttons.
- Events: onSubmit(command: CreateTransactionCommand | UpdateTransactionCommand), onCancel(), onDelete(id: number).
- Validation:
  - `transaction_date`: required
  - `account_id`: required
  - `category_id`: required
  - `amount`: required, > 0
  - `comment`: max length 255
- Props:
  - `accounts: AccountDTO[]`
  - `categories: CategoryDTO[]`
  - `initialData?: TransactionDTO`
  - `onSubmit(data)`
  - `onCancel()`
  - `onDelete?(id: number)`

### AccountTable

- Description: Displays list of user accounts with balances.
- Elements: `<table>` with columns: Name, Balance, Currency.
- Props:
  - `accounts: AccountDTO[]`

## 5. Types

- `TransactionDTO` (from API)
- `AccountDTO`, `CategoryDTO`
- `CreateTransactionCommand`, `UpdateTransactionCommand`
- `TransactionFilters`:
  ```ts
  interface TransactionFilters {
    date_from?: string;
    date_to?: string;
    account_id?: number;
    category_id?: number;
    search?: string;
    sort: "transaction_date:desc" | "transaction_date:asc" | "amount:asc" | "amount:desc";
    page: number;
    limit: number;
  }
  ```
- `SortOption` alias for `TransactionFilters['sort']`

## 6. State Management

- Use React state in `TransactionsPage` for `filters`, `selectedTransaction`, `showFilterModal`.
- Custom hooks:
  - `useTransactions(filters: TransactionFilters)` to fetch and return `{ data: TransactionDTO[], pagination }`.
  - `useAccounts()` to fetch `AccountDTO[]`.
  - `useCategories()` to fetch `CategoryDTO[]`.
  - `useTransactionMutations()` for create, update, delete operations with automatic invalidation of `useTransactions` and `useAccounts`.

## 7. API Integration

- GET `/api/transactions?${params}` → returns `ApiCollectionResponse<TransactionDTO>`
- POST `/api/transactions` (body: `CreateTransactionCommand`) → `ApiResponse<TransactionDTO>`
- PATCH `/api/transactions/:id` (body: `UpdateTransactionCommand`) → `ApiResponse<TransactionDTO>`
- DELETE `/api/transactions/:id` → 204 No Content
- GET `/api/accounts?include_inactive=false` → `ApiCollectionResponse<AccountDTO>`
- GET `/api/categories?include_inactive=false` → `ApiCollectionResponse<CategoryDTO>`

## 8. User Interactions

- **Add Transaction**: Fill form + Save → POST → refetch data + reset form
- **Edit Transaction**: Double-click row → form populated → Save → PATCH → refetch + reset form
- **Delete Transaction**: In edit mode, click Delete → confirm → DELETE → refetch + reset form
- **Filter**: Click Filter button → open `FilterModal` → set criteria → Apply → update `filters` state → refetch transactions → close modal
- **Pagination**: Click page controls → update `filters.page` → refetch
- **Sort**: Click table headers → toggle sort → update `filters.sort` → refetch

## 9. Conditions and Validation

- Form cannot submit until all required fields are valid (client-side guard).
- Disable Save when validation fails.
- Prevent invalid date ranges in filter modal.
- Ensure search text length ≤ 100.

## 10. Error Handling

- Show inline field-level errors from API `error.details` under inputs.
- Display toast or alert for network/server errors.
- Handle empty transaction list or no accounts: show empty state cards with CTAs.
- Disable action buttons during network calls and show loading spinners.

## 11. Implementation Steps

1. Create `TransactionsPage.astro` or `.tsx` under `src/pages/index.astro` import React component.
2. Define `TransactionsPage` React component in `src/components/Transactions/TransactionsPage.tsx`.
3. Implement `useTransactions`, `useAccounts`, `useCategories` in `src/components/Transactions/hooks/`.
4. Scaffold `TransactionTable`, `TransactionForm`, `FilterModal`, `Pagination`, `AccountTable` under `src/components/Transactions/`.
5. Implement API calls with fetch or React Query in custom hooks.
6. Wire state in `TransactionsPage`: filters, selectedTransaction, showFilterModal.
7. Connect components: pass props & callbacks.
8. Add client-side validation logic.
9. Add loading and error states.
10. Test interactions: create, edit, delete, filter, sort, paginate.
11. Ensure accessibility (ARIA attributes, keyboard focus, modal trap).
12. Style components with TailwindCSS and Shadcn/ui primitives.
