# Authentication Module Technical Specification

## 1. User Interface Architecture

### 1.1 Pages and Components Structure

#### New Pages
- **`src/pages/auth/login.astro`** - Login page
- **`src/pages/auth/register.astro`** - Registration page
- **`src/pages/auth/reset-password.astro`** - Password reset page
- **`src/pages/auth/update-password.astro`** - Password update page after reset

#### New React Components
- **`src/components/Auth/LoginForm.tsx`** - Login form
- **`src/components/Auth/RegisterForm.tsx`** - Registration form
- **`src/components/Auth/ResetPasswordForm.tsx`** - Password reset form
- **`src/components/Auth/UpdatePasswordForm.tsx`** - Password update form
- **`src/components/Auth/LogoutButton.tsx`** - Logout button

#### Modifications to Existing Components
- **`src/components/Navigation.astro`** - Adding logout button and logged-in user information
- **`src/layouts/Layout.astro`** - Modification to handle authentication state

### 1.2 Separation of Responsibilities

#### Astro Pages (`.astro`)
- Responsible for rendering page structure
- Passing authentication state to components
- Redirecting unauthenticated users to the login page
- Redirecting authenticated users to the main page (from login/registration)

#### React Components (`.tsx`)
- Managing form state
- Handling input validation
- Communication with Supabase Auth API
- Error handling and user messaging
- Managing loading state during authentication operations

### 1.3 Authentication Flow

#### Login
1. User accesses any page in the application
2. Middleware checks authentication state
3. If the user is not authenticated, they are redirected to `/auth/login`
4. User enters login credentials
5. After successful authentication, the user is redirected to the main page `/`

#### Registration
1. User navigates to `/auth/register` from a link on the login page
2. User fills out the registration form
3. After successful registration, the user is automatically logged in
4. User is redirected to the main page `/`

#### Password Reset
1. User clicks "Forgot password" on the login page
2. User provides their email address on the `/auth/reset-password` page
3. System sends a password reset link
4. User clicks the link in the email, which directs to `/auth/update-password?token=xxx`
5. User sets a new password
6. After successfully changing the password, the user is redirected to the login page

#### Logout
1. User clicks the logout button in the navigation
2. User session is removed
3. User is redirected to the login page

### 1.4 Validation and Error Handling

#### Form Validation
- **Login**:
  - Email: required, email format
  - Password: required, min. 6 characters
- **Registration**:
  - Email: required, email format, unique
  - Password: required, min. 8 characters, at least 1 digit, 1 uppercase letter
  - Password confirmation: must match password
- **Password Reset**:
  - Email: required, email format
- **Password Update**:
  - New password: required, min. 8 characters, at least 1 digit, 1 uppercase letter
  - Password confirmation: must match password

#### Error Messages
- Invalid email or password
- Email already exists in the system
- Password does not meet security requirements
- Passwords do not match
- Server error during authentication operation
- Password reset link expired or invalid
- Email does not exist in the system

## 2. Backend Logic

### 2.1 API Structure and Data Models

#### Middleware Modification
- **`src/middleware/index.ts`** - Extension to check authentication state and handle redirects

```typescript
import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client.ts";

export const onRequest = defineMiddleware(async ({ request, locals, redirect }, next) => {
  locals.supabase = supabaseClient;
  
  // Check user session
  const { data: { session } } = await supabaseClient.auth.getSession();
  locals.session = session;
  
  // Get URL and check if it's an authentication page
  const url = new URL(request.url);
  const isAuthPage = url.pathname.startsWith('/auth/');
  const isApiRoute = url.pathname.startsWith('/api/');
  
  // Redirect to login page if user is not logged in
  if (!session && !isAuthPage && !isApiRoute) {
    return redirect('/auth/login');
  }
  
  // Redirect to main page if user is logged in and trying to access auth page
  if (session && isAuthPage) {
    return redirect('/');
  }
  
  // If everything is okay, continue
  return next();
});
```

#### Type Updates
- **`src/env.d.ts`** - Extension to include session types

```typescript
/// <reference types="astro/client" />

import type { SupabaseClient, Session } from '@supabase/supabase-js';
import type { Database } from './db/database.types.ts';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      session: Session | null;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

#### Removing Temporary User ID
- Replacing the `DEFAULT_USER_ID` constant with the actual user ID from the session in all services

```typescript
// Before:
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

// After:
const userId = locals.session?.user.id;
```

### 2.2 Input Data Validation

#### New Validation Schemas
- **`src/lib/validation/schemas.ts`** - Adding schemas for authentication forms

```typescript
// Login form schema
export const LoginFormSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format"),
  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters"),
});

// Registration form schema
export const RegisterFormSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format"),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one digit"),
  confirmPassword: z
    .string({ required_error: "Password confirmation is required" }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Password reset form schema
export const ResetPasswordFormSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format"),
});

// Password update form schema
export const UpdatePasswordFormSchema = z.object({
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one digit"),
  confirmPassword: z
    .string({ required_error: "Password confirmation is required" }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
```

### 2.3 Exception Handling

- Implementation of a consistent error handling system for authentication operations
- Mapping Supabase Auth errors to user-friendly messages
- Logging authentication errors for diagnostic purposes

```typescript
// Example function for mapping Supabase Auth errors
function mapAuthError(error: any): string {
  const errorCode = error?.code;
  const errorMessage = error?.message;
  
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/user-not-found':
      return 'User with this email does not exist';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/email-already-in-use':
      return 'Email is already in use';
    case 'auth/weak-password':
      return 'Password is too weak';
    case 'auth/expired-action-code':
      return 'Password reset link has expired';
    case 'auth/invalid-action-code':
      return 'Password reset link is invalid';
    default:
      console.error('Auth error:', errorCode, errorMessage);
      return 'An unexpected error occurred. Please try again later.';
  }
}
```

### 2.4 Server-Side Rendering Update

- Modification of the `astro.config.mjs` file to ensure proper authentication functionality
- Configuration remains unchanged as current settings (`output: "server"`) are appropriate for authentication implementation

## 3. Authentication System

### 3.1 Supabase Auth Integration

#### Supabase Client
- Using the existing Supabase client from `src/db/supabase.client.ts`
- Accessing the client through `locals.supabase` in Astro components and API

#### Authentication Service
- **`src/lib/services/AuthService.ts`** - New service to handle authentication operations

```typescript
import type { supabaseClient } from "../../db/supabase.client";
import type { AuthError } from "@supabase/supabase-js";

export class AuthService {
  private supabase: typeof supabaseClient;

  constructor(supabase: typeof supabaseClient) {
    this.supabase = supabase;
  }

  /**
   * User login with email and password
   * @param email - User's email
   * @param password - User's password
   * @returns Promise with login result
   */
  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  /**
   * Register a new user
   * @param email - User's email
   * @param password - User's password
   * @returns Promise with registration result
   */
  async signUp(email: string, password: string) {
    return await this.supabase.auth.signUp({
      email,
      password,
    });
  }

  /**
   * User logout
   * @returns Promise with logout result
   */
  async signOut() {
    return await this.supabase.auth.signOut();
  }

  /**
   * Send password reset email
   * @param email - User's email
   * @returns Promise with email sending result
   */
  async resetPassword(email: string) {
    return await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
  }

  /**
   * Update user's password
   * @param password - New password
   * @returns Promise with password update result
   */
  async updatePassword(password: string) {
    return await this.supabase.auth.updateUser({
      password,
    });
  }

  /**
   * Get current user session
   * @returns Promise with user session
   */
  async getSession() {
    return await this.supabase.auth.getSession();
  }

  /**
   * Handle authentication errors
   * @param error - Error returned by Supabase Auth
   * @returns User-friendly error message
   */
  handleAuthError(error: AuthError | null): string {
    if (!error) return '';
    
    switch (error.message) {
      case 'Invalid login credentials':
        return 'Invalid email or password';
      case 'User already registered':
        return 'User with this email already exists';
      case 'Email not confirmed':
        return 'Email not confirmed. Please check your inbox';
      case 'Invalid user':
        return 'Invalid user';
      default:
        console.error('Auth error:', error);
        return 'An unexpected error occurred. Please try again later.';
    }
  }
}
```

### 3.2 Authentication Components Implementation

#### LoginForm.tsx Component

```typescript
import { useState } from 'react';
import { Button } from '../ui/button';
import { AuthService } from '../../lib/services/AuthService';
import { supabaseClient } from '../../db/supabase.client';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const authService = new AuthService(supabaseClient);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const { error } = await authService.signIn(email, password);
      
      if (error) {
        setError(authService.handleAuthError(error));
        return;
      }
      
      // Redirect to main page handled by middleware
      window.location.href = '/';
    } catch (err) {
      setError('An unexpected error occurred. Please try again later.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <a href="/auth/reset-password" className="font-medium text-indigo-600 hover:text-indigo-500">
              Forgot password?
            </a>
          </div>
          <div className="text-sm">
            <a href="/auth/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              Register
            </a>
          </div>
        </div>
        
        <div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4"
          >
            {isLoading ? 'Logging in...' : 'Log in'}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

#### login.astro Page

```astro
---
import Layout from "../../layouts/Layout.astro";
import LoginForm from "../../components/Auth/LoginForm";
---

<Layout title="Login | Finance Tracker">
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-md mx-auto bg-white p-8 border border-gray-200 rounded-lg shadow-md">
      <h1 class="text-2xl font-bold text-center mb-6">Log in to the application</h1>
      <LoginForm client:load />
    </div>
  </div>
</Layout>
```

### 3.3 Application Access Protection

#### Middleware Modification
- Implementation of session checking and redirects in middleware
- Securing all pages and API from access without authentication

#### Component Updates
- Adding logout button to navigation
- Displaying logged-in user information

```astro
<!-- src/components/Navigation.astro -->
---
const pathname = Astro.url.pathname;
const session = Astro.locals.session;
---

<nav class="bg-slate-800 text-white shadow-md">
  <div class="container mx-auto px-4">
    <div class="flex items-center justify-between h-16">
      <div class="flex items-center">
        <span class="font-bold text-xl">Finance Tracker</span>
      </div>
      
      {session ? (
        <div class="flex space-x-4">
          <a
            href="/"
            class={`px-3 py-2 rounded-md text-sm font-medium ${pathname === "/" ? "bg-slate-900 text-white" : "text-gray-300 hover:bg-slate-700 hover:text-white"}`}
            aria-current={pathname === "/" ? "page" : undefined}
          >
            Transactions
          </a>
          <a
            href="/accounts"
            class={`px-3 py-2 rounded-md text-sm font-medium ${pathname === "/accounts" ? "bg-slate-900 text-white" : "text-gray-300 hover:bg-slate-700 hover:text-white"}`}
            aria-current={pathname === "/accounts" ? "page" : undefined}
          >
            Accounts
          </a>
          <a
            href="/categories"
            class={`px-3 py-2 rounded-md text-sm font-medium ${pathname === "/categories" ? "bg-slate-900 text-white" : "text-gray-300 hover:bg-slate-700 hover:text-white"}`}
            aria-current={pathname === "/categories" ? "page" : undefined}
          >
            Categories
          </a>
          
          <div class="flex items-center ml-4">
            <span class="text-sm text-gray-300 mr-2">{session.user.email}</span>
            <button
              id="logout-button"
              class="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-slate-700 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </div>
  </div>
</nav>

<script>
  // Client-side logout handling
  document.getElementById('logout-button')?.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (response.ok) {
        window.location.href = '/auth/login';
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  });
</script>
```

### 3.4 Logout API Endpoint

```typescript
// src/pages/api/auth/logout.ts
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ locals, redirect }) => {
  try {
    const { error } = await locals.supabase.auth.signOut();
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    return redirect('/auth/login');
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

## 4. Key Scenarios

### 4.1 New User Registration
1. User navigates to `/auth/register`
2. Fills out the registration form (email, password, password confirmation)
3. System validates input data
4. If data is valid, the system creates a new account in Supabase Auth
5. User is automatically logged in and redirected to the main page
6. If an error occurs (e.g., email already exists), the system displays an appropriate message

### 4.2 Existing User Login
1. User navigates to `/auth/login`
2. Enters login credentials (email, password)
3. System validates input data
4. If data is valid, the system creates a user session
5. User is redirected to the main page
6. If data is invalid, the system displays an error message

### 4.3 Forgotten Password Reset
1. User clicks "Forgot password" on the login page
2. User enters their email address on the `/auth/reset-password` page
3. System sends an email with a password reset link
4. User clicks the link in the email, which redirects to `/auth/update-password?token=xxx`
5. User enters a new password and confirmation
6. System updates the password in Supabase Auth
7. User is redirected to the login page

### 4.4 Resource Protection
1. User tries to access a protected page (e.g., `/accounts`)
2. Middleware checks if the user is authenticated
3. If not, the user is redirected to the login page
4. After logging in, the user is redirected back to the requested page

### 4.5 Logout
1. User clicks the "Logout" button in the navigation
2. System removes the user's session in Supabase Auth
3. User is redirected to the login page

## 5. Conclusions and Recommendations

1. **Security** - The implementation uses Supabase Auth mechanisms, which provide secure password storage, session management, and protection against common attacks.

2. **Performance** - Middleware checks the user's session on each request, which may affect performance. Implementing a client-side session caching mechanism is recommended.

3. **User Experience** - The authentication interface is simple and intuitive, with clear error messages and guidance for users.

4. **Extensibility** - The architecture allows for easy addition of additional authentication methods in the future (e.g., OAuth, two-factor authentication).

5. **Integration** - The authentication system is tightly integrated with the existing application structure, using Supabase Auth for user management and Row Level Security for data protection.

6. **Testing** - Comprehensive testing of all authentication scenarios is recommended, with particular attention to error handling and edge cases.
