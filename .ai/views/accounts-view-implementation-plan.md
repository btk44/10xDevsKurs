# View Implementation Plan Accounts Management

## 1. Overview
The Accounts Management view lets users see all their financial accounts with balances, create new accounts, edit existing ones, and soft-delete accounts. It consists of a table of accounts and an inline form for create/edit.

## 2. View Routing
Path: `/accounts`  
Accessible via a new Astro page at `src/pages/accounts.astro`, loading a React component client-side.

## 3. Component Structure
- AccountsPage  
  ├─ AccountList  
  ├─ AccountForm  
  └─ DeleteConfirmationModal  

## 4. Component Details

### AccountsPage
- Description: Root component that fetches data, holds shared state, and renders list, form, and modal.
- Main elements:
  - `<AccountList>`  
  - `<AccountForm>`  
  - `<DeleteConfirmationModal>`  
- Events handled:
  - fetch accounts on mount  
  - `onEdit(account)` → populate form  
  - `onDelete(account)` → open modal  
  - `onSave(command)` → create or update  
  - `onConfirmDelete(id)` → delete  
- Types:
  - Response: `ApiCollectionResponse<AccountDTO>`  
  - Commands: `CreateAccountCommand`, `UpdateAccountCommand`
- State passed via props:
  - `accounts: AccountDTO[]`  
  - `selectedAccount?: AccountDTO`  
  - `isSaving: boolean`, `isDeleting: boolean`  
  - Handlers: `onEdit`, `onSave`, `onDelete`, `onConfirmDelete`

### AccountList
- Description: Table showing `name`, `currency_code`, `balance`, `active`, `created_at`.
- Main elements:
  - `<table role="table">`, `<thead>` with sortable headers, `<tbody>` rows  
  - Action icons: Edit, Delete (using Heroicons/Shadcn)  
- Handled interactions:
  - sort columns (e.g. by name or balance)  
  - click Edit → calls `onEdit(account)`  
  - click Delete → calls `onDelete(account)`
- Types:
  - `AccountDTO[]`
- Props:
  - `accounts: AccountDTO[]`  
  - `onEdit(account: AccountDTO) => void`  
  - `onDelete(account: AccountDTO) => void`

### AccountForm
- Description: Inline form to create or update an account.
- Main elements:
  - `<input name="name">`  
  - `<select name="currency_id">` (populated from CurrencyService or passed as prop)  
  - `<input name="tag">`  
  - Submit button (“Save”), Cancel/Edit toggle  
- Validation:
  - `name`: required, trimmed non-empty, max 100 chars  
  - `currency_id`: required, selected from list  
  - `tag`: optional, max 10 chars  
- Handled events:
  - `onChange` fields → update local form state  
  - `onSubmit` → call `onSave(command)`  
  - `onCancel` → clears form / deselect  
- Types:
  - `CreateAccountCommand`, `UpdateAccountCommand`
- Props:
  - `account?: AccountDTO` (prefill when editing)  
  - `currencies: CurrencyDTO[]`  
  - `onSave(cmd: CreateAccountCommand | UpdateAccountCommand) => void`  
  - `onCancel() => void`  
  - `errors?: ValidationErrorDetail[]`

### DeleteConfirmationModal
- Description: Modal asking user to confirm deletion.
- Main elements:
  - Confirmation message with account name  
  - “Confirm” and “Cancel” buttons  
- Handled events:
  - Confirm → calls `onConfirmDelete(id)`  
  - Cancel → calls `onClose()`
- Props:
  - `account?: AccountDTO`  
  - `onConfirm(id: number) => void`  
  - `onClose() => void`  

## 5. Types

### From `src/types.ts`
- `AccountDTO`  
- `CreateAccountCommand`  
- `UpdateAccountCommand`  
- `CurrencyDTO`  
- `ValidationErrorDetail`  
- `ApiCollectionResponse<T>`, `ApiErrorResponse`

### New ViewModel (optional)
```ts
interface AccountViewModel {
  id: number;
  name: string;
  currency_id: number;
  currency_code: string;
  balance: number;
  tag: string | null;
  active: boolean;
  created_at: string;
}
```

## 6. State Management
Use React `useState` and `useEffect` within `AccountsPage` or a custom hook `useAccounts()`:
- `accounts: AccountDTO[]`  
- `selectedAccount: AccountDTO | null`  
- `formErrors: ValidationErrorDetail[]`  
- `isLoading: boolean, isSaving: boolean, isDeleting: boolean`  
- Fetch on mount, refetch after create/update/delete.

## 7. API Integration
- GET `/api/accounts?include_inactive=false` → `ApiCollectionResponse<AccountDTO>`  
- POST `/api/accounts` with `CreateAccountCommand` → `ApiResponse<AccountDTO>`  
- PATCH `/api/accounts/:id` with `UpdateAccountCommand` → `ApiResponse<AccountDTO>`  
- DELETE `/api/accounts/:id` → 204 No Content  
Handle HTTP 400→ show `ValidationErrorDetail[]`, 404/500→ show toast or alert.

## 8. User Interactions
1. Page load → fetch & display accounts  
2. Fill form → Save → POST → on success clear form, refetch accounts  
3. Click Edit row → populate form with account data  
4. Edit form → Save → PATCH → on success clear form, refetch  
5. Click Delete row → open modal → confirm → DELETE → on success refetch  
6. Cancel form or modal → clear selection

## 9. Conditions and Validation
- Form fields validated before sending: name non-empty, currency chosen, tag ≤10 chars  
- Disable Save until form valid  
- Disable Delete button if `active === false`  
- Show inline errors under fields from API `details`

## 10. Error Handling
- Validation errors (400): highlight fields, display messages under inputs  
- Not found (404): show alert toast “Account not found”  
- Server errors (500): show generic error banner/toast  
- Network errors: show retry option

## 11. Implementation Steps
1. Create `src/pages/accounts.astro`, import `AccountsPage` with `client:load`.  
2. Under `src/components/Accounts/`, add `AccountsPage.tsx`, `AccountList.tsx`, `AccountForm.tsx`, `DeleteConfirmationModal.tsx`.  
3. Implement `useAccounts` hook to wrap fetch & mutations.  
4. Wire `AccountsPage` to call hook, pass state & handlers to child components.  
5. Build `AccountList` table with Tailwind + Shadcn/ui icons.  
6. Build `AccountForm` with controlled inputs, client‐side validation.  
7. Build `DeleteConfirmationModal` using Shadcn/ui Modal.  
8. Integrate API calls (fetch, POST, PATCH, DELETE) using `fetch` or `useFetcher` helper.  
9. Style components with Tailwind CSS per design tokens.  
10. Test all user flows: create, edit, delete, validation.  
11. Add accessibility attributes (`role="table"`, `aria-invalid`, focus management).  
12. Review for edge cases (no accounts empty state, soft-deleted accounts hidden).  