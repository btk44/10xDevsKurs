import type { GetTransactionsQuery, CreateTransactionCommand, UpdateTransactionCommand } from "../../types";

/**
 * Enhanced logging utility for transaction operations
 */
export const TransactionLogger = {
  /**
   * Logs transaction query attempts with performance metrics
   */
  logQueryAttempt(
    userId: string,
    query: GetTransactionsQuery | { id: number },
    success: boolean,
    duration: number,
    error?: string,
    resultCount?: number,
    operation = "GET_TRANSACTIONS"
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      userId,
      query: {
        page: query.page,
        limit: query.limit,
        hasFilters: !!(query.date_from || query.date_to || query.account_id || query.category_id || query.search),
        sort: query.sort,
      },
      performance: {
        duration_ms: duration,
        slow_query: duration > 1000,
      },
      result: {
        success,
        count: resultCount,
        error: error ? { message: error } : undefined,
      },
    };

    // In production, this should be sent to a proper logging service (e.g., Winston, Pino)
    if (!success) {
      console.error("Transaction query failed:", JSON.stringify(logEntry, null, 2));
    } else if (duration > 2000) {
      console.warn("Slow transaction query:", JSON.stringify(logEntry, null, 2));
    }

    // For now, we'll track successful operations silently
    // In production: send to monitoring service (DataDog, New Relic, etc.)
  },

  /**
   * Logs security-related events for monitoring
   */
  logSecurityEvent(
    userId: string,
    event: string,
    details: Record<string, unknown>,
    severity: "low" | "medium" | "high" = "medium"
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: "SECURITY_EVENT",
      userId,
      event,
      severity,
      details,
    };

    // In production, security events should always be logged
    if (severity === "high") {
      console.error("High severity security event:", JSON.stringify(logEntry, null, 2));
    } else {
      console.warn("Security event:", JSON.stringify(logEntry, null, 2));
    }
  },
};

/**
 * Logs transaction creation attempts for monitoring
 */
export function logTransactionCreation(
  userId: string,
  command: CreateTransactionCommand,
  success: boolean,
  error?: string
): void {
  // In production, this should be sent to a proper logging service
  // For now, we'll just track the attempt without console output
  if (!success && error) {
    // Log to error tracking service in production
    // Could track: userId, command.account_id, command.category_id, command.amount, error
  }
}

/**
 * Logs transaction update attempts for monitoring
 */
export function logTransactionUpdate(
  userId: string,
  command: UpdateTransactionCommand,
  success: boolean,
  error?: string
): void {
  // In production, this should be sent to a proper logging service
  // For now, we'll just track the attempt without console output
  if (!success && error) {
    // Log to error tracking service in production
    // Could track: userId, command fields, error
  }
}

/**
 * Logs transaction deletion attempts for monitoring
 */
export function logTransactionDeletion(userId: string, transactionId: number, success: boolean, error?: string): void {
  // In production, this should be sent to a proper logging service
  // For now, we'll just track the attempt without console output
  if (!success && error) {
    // Log to error tracking service in production
    // Could track: userId, transactionId, error
  }
}
