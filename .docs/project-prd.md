# Product Requirements Document (PRD) - Expense Tracker Web App

## 1. Product Overview

This document outlines the product requirements for a responsive web application designed to simplify personal expense tracking. The application will serve as a user-friendly alternative to cumbersome spreadsheet-based methods, offering a centralized and accessible platform for managing personal finances. The Minimum Viable Product (MVP) focuses on core functionalities, including the management of accounts, categories, and transactions, along with essential reporting and user management features. The system will be built using a modern web stack, leveraging Supabase for authentication and backend data storage.

## 2. User Problem

Currently, many individuals track their expenses using spreadsheet software like Microsoft Excel. This method presents several challenges:

- *Accessibility*: Spreadsheets are often stored as large, single files on one device, making them difficult to access and update from other devices.
- *Usability*: Manual data entry, formula management, and maintaining the file's structure can be troublesome and prone to errors.
- *Software Dependency*: It requires specific software (e.g., Microsoft Office) which may not be available or convenient for all users on all their devices.

A responsive web application solves these problems by providing a centralized, device-agnostic solution that is more comfortable and efficient for tracking income and expenses.

## 3. Functional Requirements

### 3.1 User Account Management

- FR-001: Users must be able to create an account and log in. Authentication will be managed via Supabase.
- FR-002: The system must implement a "Forgot Password" workflow allowing users to reset their password via an email link.
- FR-003: All user data (accounts, categories, transactions) must be stored on the server and be securely associated with the individual user's account to ensure data privacy and persistence across devices.


### 3.2 Account Management

- FR-004: Users can perform CRUD (Create, Read, Edit, Delete) operations on their financial accounts (e.g., "Main Bank Account," "Cash").
- FR-005: Each account must have a user-defined name and a currency field (using 3-letter ISO codes like 'PLN', 'USD').
- FR-006: The application must automatically calculate and display the current balance for each account. Balances are updated in real-time as transactions are added, edited, or deleted.


### 3.3 Category Management

- FR-007: Users can perform CRUD operations on transaction categories.
- FR-008: Each category must have a name and be assigned a type: 'Income' or 'Expense'.
- FR-009: The system must prevent the deletion of a category if it is associated with any existing transactions.
- FR-010: The user interface for managing categories will be separated, for instance using tabs for 'Income' and 'Expense' categories.


### 3.4 Transaction Management

- FR-011: Users can perform CRUD operations on transactions.
- FR-012: The main application view will feature an always-visible component for adding/editing/deleting transactions. Double-clicking a transaction in the list will populate this component for editing.
- FR-013: Each transaction must include: date, associated account, category, amount, and an optional comment (max 255 characters).
- FR-014: The transaction's type ('income' or 'expense') is automatically determined by the type of the selected category.
- FR-015: The 'amount' field must be a positive numeric value greater than zero. The application will interpret it as a positive or negative value for balance calculations based on the category type.


### 3.5 Data Display and Filtering

- FR-016: The main dashboard will display a table of accounts with their balances and a table of transactions.
- FR-017: The transaction list will be sorted by date in descending order (most recent first) by default.
- FR-018: Users can filter transactions by a date range, account, category, and the text in the 'comment' field.
- FR-019: The application will calculate and display a monthly summary of expenses per category in a simple table.
- FR-020: The monthly summary will default to the current calendar month and include navigation controls to view previous and next months.
- FR-021: If no transactions are recorded for a selected month, a user-friendly message ("No expenses were recorded for this month.") will be displayed.


## 4. Product Boundaries

### 4.1 In Scope for MVP

- A responsive web application accessible via modern web browsers.
- User registration and authentication system to keep data private.
- Full CRUD functionality for accounts, categories (split by income/expense), and transactions.
- Automatic calculation of account balances.
- A monthly summary view of expenses per category.
- Basic search and filtering capabilities for transactions.
- All data stored securely on a server-side database (Supabase).


### 4.2 Out of Scope for MVP

- Native mobile applications (iOS/Android).
- Sharing data or accounts between different users.
- Importing data from files (e.g., CSV, QIF).
- Exporting data to files.
- Advanced budgeting and financial planning features.
- A dedicated feature for handling transfers between user accounts (will be logged as two separate transactions).
- Consolidated balance view with automatic currency conversion.


## 5. User Stories

### 5.1 Authentication and Onboarding

- ID: US-001
- Title: User Registration
- Description: As a new user, I want to create a personal account using my email and a password so that I can securely store and manage my financial data.
- Acceptance Criteria:
    - Given I am on the application's landing page, when I click "Sign Up," I am taken to a registration form.
    - The form requires an email and a password.
    - Upon successful registration, I am logged into the application.
    - My user data is stored in the Supabase backend.
- ID: US-002
- Title: User Login
- Description: As a returning user, I want to log in to my account so I can access my financial data.
- Acceptance Criteria:
    - Given I am on the login page, I can enter my email and password.
    - Upon successful login, I am redirected to my main dashboard.
    - If my credentials are incorrect, I see a clear error message.
- ID: US-003
- Title: First-time User Experience
- Description: As a new user who has just logged in for the first time, I want to see a guided interface so I can understand how to start using the app.
- Acceptance Criteria:
    - Given I have just signed up and logged in, I am presented with a configuration screen to add my first accounts and categories.
    - I have the option to skip this initial setup and go directly to the main dashboard.
    - If I skip setup, the dashboard shows "empty state" cards with calls-to-action like "Add Your First Account."
- ID: US-004
- Title: Password Reset
- Description: As a user who has forgotten my password, I want to be able to reset it so I can regain access to my account.
- Acceptance Criteria:
    - Given I am on the login page, there is a "Forgot Password?" link.
    - When I enter my registered email address, I receive an email with a secure password reset link.
    - Clicking the link allows me to set a new password and log in.


### 5.2 Account Management

- ID: US-005
- Title: Create a New Account
- Description: As a user, I want to create multiple financial accounts (e.g., checking, savings, cash) so that I can track my balances separately.
- Acceptance Criteria:
    - I can access a form to create a new account.
    - The form requires an 'Account Name' and a 'Currency' (selected from a list of ISO codes).
    - Upon saving, the new account appears in my list of accounts with a balance of 0.00.
- ID: US-006
- Title: View Account Balances
- Description: As a user, I want to see a list of all my accounts with their current balances on the main dashboard so I can get a quick overview of my finances.
- Acceptance Criteria:
    - The dashboard displays a list or table of all my created accounts.
    - Each entry shows the account name, the calculated balance, and its currency code.
    - Balances are automatically updated whenever a linked transaction is created, edited, or deleted.


### 5.3 Category Management

- ID: US-007
- Title: Create a New Category
- Description: As a user, I want to define custom categories for my income and expenses so I can organize my transactions meaningfully.
- Acceptance Criteria:
    - I can access a category management page.
    - The form requires a 'Category Name' and a 'Type' (a choice between 'Income' and 'Expense').
    - The new category is available for selection when adding a new transaction.
- ID: US-008
- Title: Manage Categories
- Description: As a user, I want to view, edit, or delete my categories so I can keep my categorization system up to date.
- Acceptance Criteria:
    - I can view my 'Income' and 'Expense' categories in separate lists or tabs.
    - I can edit the name of an existing category.
    - I can delete a category, but only if it has no transactions linked to it. If it does, I see an error message and an option to "Archive" it instead.


### 5.4 Transaction Management

- ID: US-009
- Title: Add a New Transaction
- Description: As a user, I want to quickly add a new income or expense transaction so I can keep my financial records current.
- Acceptance Criteria:
    - The main view has a visible component to add a new transaction.
    - The form requires me to select a date, an account, and a category, and to enter an amount. An optional comment field is available.
    - The amount must be a positive number.
    - When I select a category, the transaction type ('income' or 'expense') is set automatically.
    - Upon saving, the transaction appears in the transaction list and the relevant account balance is updated.
- ID: US-010
- Title: Edit a Transaction
- Description: As a user, I want to edit an existing transaction in case I made a mistake or need to update its details.
- Acceptance Criteria:
    - I can double-click a transaction row in the list to load its data into the add/edit component.
    - I can modify any of the transaction's fields.
    - When I save the changes, the transaction list and all relevant account balances are updated immediately.
- ID: US-011
- Title: Delete a Transaction
- Description: As a user, I want to delete a transaction if it was created in error.
- Acceptance Criteria:
    - From the edit view, I can choose to delete the transaction.
    - I am asked to confirm the deletion.
    - Upon confirmation, the transaction is removed from the list and the relevant account balance is updated.


### 5.5 Reporting and Filtering

- ID: US-012
- Title: View Transaction History
- Description: As a user, I want to see a list of all my past transactions so I can review my activity.
- Acceptance Criteria:
    - The main dashboard shows a table of my transactions.
    - By default, transactions are sorted with the most recent one at the top.
    - The table displays key details like date, category, comment, and amount.
- ID: US-013
- Title: Filter Transactions
- Description: As a user, I want to filter my transactions by different criteria so I can find specific information.
- Acceptance Criteria:
    - I can filter the transaction list by a specific account.
    - I can filter the list by a specific category.
    - I can filter the list by a date range (start date and end date).
    - I can search for transactions containing specific text in the 'comment' field.
- ID: US-014
- Title: View Monthly Expense Summary
- Description: As a user, I want to see a summary of my spending per category for a given month so I can understand my spending habits.
- Acceptance Criteria:
    - There is a view that shows a table of expense categories and their total summed amounts for a specific month.
    - By default, it shows data for the current calendar month.
    - I can use "Previous" and "Next" controls to navigate to other months.
    - If a month has no expenses, a message "No expenses were recorded for this month" is shown.


## 6. Success Metrics

The success of the Expense Tracker MVP will be evaluated based on the following key metrics, which focus on user adoption, engagement, and retention.

- *Monthly Active Users (MAU)*: This metric will measure the total number of unique users who log in and interact with the application at least once within a 30-day period. It will be the primary indicator of the product's overall reach and growth.
- *User Retention Rate*: We will track the percentage of new users who return to use the application in the 30 days following their sign-up. This will indicate whether the product is providing ongoing value and solving the core problem effectively.
- *Core Feature Engagement*: To measure how well the app is replacing the old Excel workflow, we will track the average number of transactions logged per active user per month. A steady or increasing number indicates healthy engagement with the application's core functionality.

