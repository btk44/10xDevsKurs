# View Implementation Plan: Categories Management

## 1. Overview
The Categories Management view enables users to create, view, edit, and delete income and expense categories in a two-level hierarchy. It provides tabs to switch between 'Income' and 'Expense' categories, an inline table/tree for listing categories, and an inline form for creating or editing categories.

## 2. View Routing
Path: `/categories`
Defined in `src/pages/categories.astro`, rendering the `CategoriesView` React component.

## 3. Component Structure
```
CategoriesPage (Astro)
└── CategoriesView (React)
    ├── CategoriesTabs
    ├── CategoryList
    │   └── CategoryRow* (recursive)
    ├── CategoryForm
    └── DeleteConfirmationModal
```  

## 4. Component Details

### CategoriesView
- Description: Page-level container; manages state and coordinates child components.
- Elements: `<Tabs>`, `<CategoryList>`, `<CategoryForm>`, `<DeleteConfirmationModal>`, `<ErrorBanner>`
- Handled events: tab change, list refresh trigger, form submit, edit button click, delete button click.
- Validation: none directly; passes handlers and errors down.
- Types: none directly; uses hooks types.
- Props: none.

### CategoriesTabs
- Description: Renders two tabs ('Income', 'Expense') using Shadcn/ui `<Tabs>`.
- Elements: `<TabsList>`, `<TabsTrigger>`.
- Events: onValueChange(type: CategoryType).
- Validation: none.
- Types: CategoryType ('income'|'expense').
- Props: `activeType: CategoryType`, `onTypeChange(type: CategoryType) -> void`.

### CategoryList
- Description: Displays hierarchical list of categories for active type.
- Elements: `<table role="table">`, `<thead>`, `<tbody>`.
- Child: multiple `CategoryRow`.
- Events: edit/delete button callbacks passed via props.
- Validation: none.
- Types: `CategoryVM[]` (flattened hierarchy list).
- Props: `categories: CategoryVM[]`, `onEdit(cat: CategoryVM)`, `onDelete(cat: CategoryVM)`.

### CategoryRow
- Description: Renders one category row; indent based on level.
- Elements: `<tr>`, `<td>` for indent, name, tag, actions icons/buttons.
- Events: click edit, click delete.
- Props: `category: CategoryVM`, `indentLevel: number`, `onEdit(cat)`, `onDelete(cat)`.

### CategoryForm
- Description: Inline form to create or update category.
- Elements: `<form>`, inputs: name (text), tag (text), parent (select), hidden type field or disabled select.
- Events: onSubmit(formData), onCancel().
- Validation conditions:
  - name: required, trimmed, max 100 chars
  - tag: optional, max 10 chars
  - parent_id: >=0, not equal to own id, only main categories of same type
- Types: `CategoryFormData`.
- Props:
  - `initialData?: CategoryFormData`
  - `parentOptions: CategoryOption[]`
  - `onSubmit(data: CategoryFormData)`
  - `onCancel()`
  - `isSubmitting: boolean`
  - `errors?: Record<string,string>`

### DeleteConfirmationModal
- Description: Modal asking user to confirm deletion; shows name and warns if in use.
- Elements: `<Dialog>`, message, confirm/cancel buttons.
- Events: onConfirm(), onCancel().
- Types: none.
- Props:
  - `category: CategoryVM` (target)
  - `open: boolean`
  - `onConfirm()`
  - `onCancel()`
  - `isDeleting: boolean`
  - `deleteError?: string`

## 5. Types
- CategoryVM:
  ```ts
  interface CategoryVM extends CategoryDTO {
    children: CategoryVM[];
    level: number;
  }
  ```
- CategoryOption:
  ```ts
  interface CategoryOption {
    value: number;
    label: string;
  }
  ```
- CategoryFormData:
  ```ts
  interface CategoryFormData {
    id?: number;
    name: string;
    tag?: string;
    parent_id: number;
    category_type: CategoryType;
  }
  ```

## 6. State Management
- Local state in `CategoriesView`:
  - `activeType: CategoryType`
  - `categories: CategoryVM[]`
  - `loading: boolean`, `error: string|null`
  - `selectedCategory: CategoryVM|null`
  - `showDeleteModal: boolean`
  - `deleteTarget: CategoryVM|null`
- Custom hooks:
  - `useCategories(type: CategoryType): { categories, loading, error, refetch }`
  - `useCategoryMutations(): { create(), update(), remove() }`

## 7. API Integration
- `useCategories` calls GET `/api/categories?type=${activeType}` → response: `ApiCollectionResponse<CategoryDTO>`
- Create: POST `/api/categories` with `CreateCategoryCommand` → returns `ApiResponse<CategoryDTO>`
- Update: PATCH `/api/categories/{id}` with `UpdateCategoryCommand` → returns `ApiResponse<CategoryDTO>`
- Delete: DELETE `/api/categories/{id}` → 204 or error with `CATEGORY_IN_USE` details

## 8. User Interactions
1. User selects 'Income'/'Expense' tab → `activeType` updates; categories reloaded.
2. User enters category details and clicks 'Save': if `selectedCategory` null → create; else update.
3. On success → form resets; categories reloaded.
4. User clicks 'Edit' on row → `selectedCategory` set; form populated.
5. User clicks 'Delete' on row → `deleteTarget` set; modal opens.
6. User confirms delete → API call; on 204 → modal closes; categories reloaded; on 409 → show error in modal.

## 9. Conditions and Validation
- Form-level checks before submit, mirror API rules:
  - `name.trim() !== ''`
  - `name.length <= 100`
  - `tag?.length <= 10`
  - `parent_id !== id` and `parent_id >= 0`
  - `parent_id === 0` or parent exists in `parentOptions`
- Disable parent select options for subcategories (only main categories parent_id===0).

## 10. Error Handling
- Field errors from API displayed under inputs with `aria-invalid`.
- Global errors (fetch failure) shown in `<ErrorBanner>`.
- Delete conflict error shown in modal as message.
- Network/server errors show generic message.

## 11. Implementation Steps
1. Create `src/pages/categories.astro`, import and render `CategoriesView`.
2. Create `src/components/Categories/CategoriesView.tsx`. Set up state and hooks.
3. Implement `CategoriesTabs` using Shadcn/ui.
4. Implement `useCategories` hook.
5. Implement `CategoryList` and `CategoryRow`, build VM flatten function.
6. Implement `CategoryForm` with validation and field-level error display.
7. Implement `useCategoryMutations` for create/update/delete.
8. Implement `DeleteConfirmationModal` using Shadcn/ui `<Dialog>`.
9. Integrate all components in `CategoriesView`, wire state and event handlers.
10. Style using TailwindCSS and Shadcn/ui tokens; ensure accessibility roles.
11. Test all user stories: create, edit, delete, tab switch, validation, error scenarios.
12. Add unit tests for view-model functions (flatten hierarchy) and hooks.

---
*End of plan.*
