# Expense Tracker Web App

[![version](https://img.shields.io/badge/version-0.0.1-blue)](https://github.com/your-org/your-repo/releases)  
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A responsive web application that simplifies personal expense tracking by replacing traditional spreadsheets with an intuitive, centralized platform. Built with Astro, React, and Supabase, this app provides secure user authentication and real-time balance updates.

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Getting Started](#getting-started)
3. [Available Scripts](#available-scripts)
4. [Project Scope](#project-scope)
   - [In Scope (MVP)](#in-scope-mvp)
   - [Out of Scope](#out-of-scope)
5. [Project Status](#project-status)
6. [License](#license)

## Tech Stack

- **TypeScript**
- **Astro**
- **React**
- **Tailwind CSS**
- **Supabase** (Authentication & Database)
- **Vitest** + **Testing Library** (unit & integration testing)
- **Playwright** (end-to-end testing)

## Getting Started

### Prerequisites

- **Node.js** v22.14.0 (use `.nvmrc` or [nvm](https://github.com/nvm-sh/nvm))
- **npm** (bundled with Node)
- Create a `.env` file in the project root with your Supabase credentials:
  ```bash
  SUPABASE_URL=your_supabase_url
  SUPABASE_ANON_KEY=your_supabase_anon_key
  ```

### Installation

```bash
git clone https://github.com/your-org/your-repo.git
cd your-repo
npm install
```

### Running Locally

Start the development server:

```bash
npm run dev
```

Open your browser at [http://localhost:3000](http://localhost:3000) to view the app.

## Available Scripts

In the project directory, you can run:

- `npm run dev`  
  Start Astro in development mode with hot-reload.

- `npm run build`  
  Build the app for production.

- `npm run preview`  
  Preview the production build locally.

- `npm run astro`  
  Run Astro CLI commands.

- `npm run lint`  
  Run ESLint to check for code issues.

- `npm run lint:fix`  
  Run ESLint with auto-fix.

- `npm run format`  
  Format code with Prettier.

## Project Scope

### In Scope (MVP)

- Responsive web application accessible on modern browsers
- User registration, login, and password reset via Supabase
- Secure storage of user data (accounts, categories, transactions)
- CRUD operations for:
  - **Accounts** (name, currency; real-time balance)
  - **Categories** (Income vs. Expense)
  - **Transactions** (date, account, category, amount, optional comment)
- Transaction list with sorting (newest first) and multi-criteria filtering
- Monthly expense summary per category with navigation controls

### Out of Scope

- Native mobile applications (iOS/Android)
- Sharing accounts or data between users
- Importing/exporting data (CSV, QIF)
- Advanced budgeting/financial planning features
- Dedicated transfers feature (handled as separate transactions)
- Automatic currency conversion

## Project Status

🚧 MVP in active development. Features and API may change. Contributions welcome!

## License

This project is licensed under the [MIT License](LICENSE).
