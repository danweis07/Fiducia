/**
 * Audit Logger Service
 *
 * Provides structured audit logging for tracking user actions and system events.
 * Logs are stored in Supabase for persistence and analysis.
 *
 * Features:
 * - Structured log entries with timestamps and user context
 * - Severity levels (debug, info, warn, error)
 * - Action categorization (create, update, delete, view, export, etc.)
 * - Entity tracking (what was affected)
 * - Metadata support for additional context
 * - Batch logging for performance
 */

import { getBackend } from "@/lib/backend";

// =============================================================================
// TYPES
// =============================================================================

export type AuditSeverity = "debug" | "info" | "warn" | "error";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "view"
  | "export"
  | "import"
  | "login"
  | "logout"
  | "permission_change"
  | "score_calculate"
  | "bulk_operation"
  | "system_event"
  // Banking-specific actions
  | "transfer"
  | "payment"
  | "deposit"
  | "consent_grant"
  | "consent_revoke"
  | "card_lock"
  | "card_unlock"
  | "beneficiary_add"
  | "beneficiary_remove"
  | "mfa_enroll"
  | "mfa_verify"
  | "session_revoke";

export type AuditEntity =
  | "property"
  | "deal"
  | "task"
  | "activity"
  | "contact"
  | "user"
  | "firm"
  | "score"
  | "document"
  | "settings"
  | "system"
  // Banking-specific entities
  | "account"
  | "transaction"
  | "transfer"
  | "beneficiary"
  | "card"
  | "deposit"
  | "bill"
  | "loan"
  | "consent"
  | "session"
  | "notification"
  | "wire"
  | "standing_instruction";

export interface AuditLogEntry {
  id?: string;
  timestamp: string;
  severity: AuditSeverity;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | number;
  userId?: string;
  firmId?: string;
  message: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditContext {
  userId?: string;
  firmId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditQueryOptions {
  firmId?: string;
  userId?: string;
  action?: AuditAction;
  entity?: AuditEntity;
  severity?: AuditSeverity;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// LOGGER CLASS
// =============================================================================

class AuditLogger {
  private context: AuditContext = {};
  private logBuffer: AuditLogEntry[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly BUFFER_SIZE = 10;
  private readonly FLUSH_INTERVAL_MS = 5000;
  private enabled = true;

  constructor() {
    // Set up periodic flush
    if (typeof window !== "undefined") {
      this.flushInterval = setInterval(() => this.flush(), this.FLUSH_INTERVAL_MS);

      // Flush on page unload
      window.addEventListener("beforeunload", () => this.flush());
    }
  }

  /**
   * Set the current user context for logging
   */
  setContext(context: AuditContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear the current context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Enable or disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Log an audit entry
   */
  async log(
    severity: AuditSeverity,
    action: AuditAction,
    entity: AuditEntity,
    message: string,
    options?: {
      entityId?: string | number;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      severity,
      action,
      entity,
      entityId: options?.entityId,
      userId: this.context.userId,
      firmId: this.context.firmId,
      message,
      metadata: options?.metadata,
      ipAddress: this.context.ipAddress,
      userAgent: this.context.userAgent,
    };

    // For errors, log immediately
    if (severity === "error") {
      await this.writeLog(entry);
      console.error(`[AUDIT] ${message}`, entry);
      return;
    }

    // For other severities, buffer the log
    this.logBuffer.push(entry);

    // Flush if buffer is full
    if (this.logBuffer.length >= this.BUFFER_SIZE) {
      await this.flush();
    }

    // Also log to console in development
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      const logFn =
        severity === "warn" ? console.warn : severity === "debug" ? console.debug : console.log;
      logFn(`[AUDIT:${severity.toUpperCase()}] ${message}`, entry.metadata || {});
    }
  }

  /**
   * Convenience methods for different severity levels
   */
  async debug(
    action: AuditAction,
    entity: AuditEntity,
    message: string,
    options?: { entityId?: string | number; metadata?: Record<string, unknown> },
  ): Promise<void> {
    return this.log("debug", action, entity, message, options);
  }

  async info(
    action: AuditAction,
    entity: AuditEntity,
    message: string,
    options?: { entityId?: string | number; metadata?: Record<string, unknown> },
  ): Promise<void> {
    return this.log("info", action, entity, message, options);
  }

  async warn(
    action: AuditAction,
    entity: AuditEntity,
    message: string,
    options?: { entityId?: string | number; metadata?: Record<string, unknown> },
  ): Promise<void> {
    return this.log("warn", action, entity, message, options);
  }

  async error(
    action: AuditAction,
    entity: AuditEntity,
    message: string,
    options?: { entityId?: string | number; metadata?: Record<string, unknown> },
  ): Promise<void> {
    return this.log("error", action, entity, message, options);
  }

  /**
   * Log a user action with common patterns
   */
  async logUserAction(
    action: AuditAction,
    entity: AuditEntity,
    message: string,
    entityId?: string | number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.info(action, entity, message, { entityId, metadata });
  }

  /**
   * Log a create action
   */
  async logCreate(
    entity: AuditEntity,
    entityId: string | number,
    entityName?: string,
  ): Promise<void> {
    const name = entityName ? ` "${entityName}"` : "";
    return this.info("create", entity, `Created ${entity}${name}`, {
      entityId,
      metadata: { entityName },
    });
  }

  /**
   * Log an update action
   */
  async logUpdate(
    entity: AuditEntity,
    entityId: string | number,
    changes?: Record<string, { from: unknown; to: unknown }>,
  ): Promise<void> {
    const changeCount = changes ? Object.keys(changes).length : 0;
    return this.info("update", entity, `Updated ${entity} (${changeCount} fields changed)`, {
      entityId,
      metadata: { changes },
    });
  }

  /**
   * Log a delete action
   */
  async logDelete(
    entity: AuditEntity,
    entityId: string | number,
    entityName?: string,
  ): Promise<void> {
    const name = entityName ? ` "${entityName}"` : "";
    return this.info("delete", entity, `Deleted ${entity}${name}`, {
      entityId,
      metadata: { entityName },
    });
  }

  /**
   * Log a view action (for sensitive data access)
   */
  async logView(entity: AuditEntity, entityId: string | number): Promise<void> {
    return this.debug("view", entity, `Viewed ${entity}`, { entityId });
  }

  /**
   * Log a bulk operation
   */
  async logBulkOperation(
    entity: AuditEntity,
    operation: string,
    count: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.info("bulk_operation", entity, `Bulk ${operation}: ${count} ${entity}(s)`, {
      metadata: { operation, count, ...metadata },
    });
  }

  /**
   * Log a system event
   */
  async logSystemEvent(message: string, metadata?: Record<string, unknown>): Promise<void> {
    return this.info("system_event", "system", message, { metadata });
  }

  /**
   * Log an error with stack trace
   */
  async logError(
    error: Error,
    context: {
      action?: AuditAction;
      entity?: AuditEntity;
      entityId?: string | number;
    } = {},
  ): Promise<void> {
    return this.error(context.action || "system_event", context.entity || "system", error.message, {
      entityId: context.entityId,
      metadata: {
        errorName: error.name,
        stack: error.stack,
      },
    });
  }

  private flushing = false;

  /**
   * Flush the log buffer to database
   */
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0 || this.flushing) {
      return;
    }

    this.flushing = true;
    const entries = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await this.writeLogs(entries);
    } catch (error) {
      // Re-add failed entries before any new entries that arrived during the write
      this.logBuffer = [...entries, ...this.logBuffer];
      console.error("Failed to flush audit logs:", error);
    } finally {
      this.flushing = false;
    }
  }

  /**
   * Write a single log entry to database via the gateway
   */
  private async writeLog(entry: AuditLogEntry): Promise<void> {
    try {
      const backend = getBackend();
      await backend.gateway.invoke("audit.write", {
        entries: [this.toRecord(entry)],
      });
    } catch (error) {
      console.error("Failed to write audit log:", error);
    }
  }

  /**
   * Write multiple log entries to database via the gateway
   */
  private async writeLogs(entries: AuditLogEntry[]): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    try {
      const backend = getBackend();
      await backend.gateway.invoke("audit.write", {
        entries: entries.map((e) => this.toRecord(e)),
      });
    } catch (error) {
      console.error("Failed to write audit logs:", error);
    }
  }

  private toRecord(entry: AuditLogEntry): Record<string, unknown> {
    return {
      timestamp: entry.timestamp,
      severity: entry.severity,
      action: entry.action,
      entityType: entry.entity,
      entityId: entry.entityId?.toString(),
      userId: entry.userId,
      firmId: entry.firmId,
      message: entry.message,
      metadata: entry.metadata,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    };
  }

  /**
   * Query audit logs via the gateway
   */
  async query(options: AuditQueryOptions = {}): Promise<AuditLogEntry[]> {
    try {
      const backend = getBackend();
      const response = await backend.gateway.invoke("audit.log", {
        firmId: options.firmId,
        userId: options.userId,
        action: options.action,
        entity: options.entity,
        severity: options.severity,
        startDate: options.startDate,
        endDate: options.endDate,
        limit: options.limit,
        offset: options.offset,
      });

      const responseData = response.data as Record<string, unknown> | undefined;
      const entries = (Array.isArray(responseData?.entries) ? responseData.entries : []) as Array<
        Record<string, unknown>
      >;
      return entries.map((row) => ({
        id: row.id,
        timestamp: row.timestamp,
        severity: row.severity as AuditSeverity,
        action: row.action as AuditAction,
        entity: (row.entityType ?? row.entity_type) as AuditEntity,
        entityId: row.entityId ?? row.entity_id,
        userId: row.userId ?? row.user_id,
        firmId: row.firmId ?? row.firm_id,
        message: row.message,
        metadata: row.metadata,
        ipAddress: row.ipAddress ?? row.ip_address,
        userAgent: row.userAgent ?? row.user_agent,
      }));
    } catch (error) {
      console.error("Failed to query audit logs:", error);
      return [];
    }
  }

  /**
   * Clean up old logs (for maintenance)
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const backend = getBackend();
      const response = await backend.gateway.invoke("audit.cleanup", {
        cutoffDate: cutoffDate.toISOString(),
      });
      const responseData = response.data as Record<string, unknown> | undefined;
      return typeof responseData?.deletedCount === "number" ? responseData.deletedCount : 0;
    } catch (error) {
      console.error("Failed to cleanup old audit logs:", error);
      return 0;
    }
  }

  /**
   * Destroy the logger (cleanup)
   */
  async destroy(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flush();
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const auditLogger = new AuditLogger();

// =============================================================================
// REACT HOOK
// =============================================================================

import { useEffect } from "react";
import { useAuth } from "@/contexts/TenantContext";

/**
 * Hook to set up audit logging context based on current user
 */
export function useAuditLogger() {
  const { user, tenant } = useAuth();

  useEffect(() => {
    if (user && tenant) {
      auditLogger.setContext({
        userId: user.id,
        firmId: tenant?.tenantId,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      });
    } else {
      auditLogger.clearContext();
    }

    return () => {
      auditLogger.clearContext();
    };
  }, [user, tenant]);

  return auditLogger;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Log a property action
 */
export function logPropertyAction(
  action: AuditAction,
  propertyId: number,
  propertyName?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return auditLogger.logUserAction(
    action,
    "property",
    `${action} property ${propertyName || propertyId}`,
    propertyId,
    metadata,
  );
}

/**
 * Log a deal action
 */
export function logDealAction(
  action: AuditAction,
  dealId: string,
  dealName?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return auditLogger.logUserAction(
    action,
    "deal",
    `${action} deal ${dealName || dealId}`,
    dealId,
    metadata,
  );
}

/**
 * Log a task action
 */
export function logTaskAction(
  action: AuditAction,
  taskId: string,
  taskTitle?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return auditLogger.logUserAction(
    action,
    "task",
    `${action} task ${taskTitle || taskId}`,
    taskId,
    metadata,
  );
}

/**
 * Log a score calculation
 */
export function logScoreCalculation(
  propertyId: number,
  score: number,
  trigger: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return auditLogger.info("score_calculate", "score", `Calculated transition score: ${score}`, {
    entityId: propertyId,
    metadata: { score, trigger, ...metadata },
  });
}

// =============================================================================
// BANKING-SPECIFIC CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Log a transfer action (create, schedule, cancel)
 */
export function logTransferAction(
  action: "create" | "update" | "delete",
  transferId: string,
  amountCents?: number,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return auditLogger.info(
    action === "delete" ? "delete" : "transfer",
    "transfer",
    `${action} transfer ${transferId}${amountCents ? ` ($${(amountCents / 100).toFixed(2)})` : ""}`,
    {
      entityId: transferId,
      metadata: { amountCents, ...metadata },
    },
  );
}

/**
 * Log an open banking consent action (grant or revoke)
 */
export function logConsentAction(
  action: "consent_grant" | "consent_revoke",
  consentId: string,
  providerName: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const verb = action === "consent_grant" ? "Granted" : "Revoked";
  return auditLogger.info(action, "consent", `${verb} data access consent for ${providerName}`, {
    entityId: consentId,
    metadata: { providerName, ...metadata },
  });
}

/**
 * Log a card action (lock, unlock, limit change)
 */
export function logCardAction(
  action: "card_lock" | "card_unlock" | "update",
  cardId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return auditLogger.info(action, "card", `${action.replace("card_", "")} card ${cardId}`, {
    entityId: cardId,
    metadata,
  });
}

/**
 * Log a session management action
 */
export function logSessionAction(
  action: "session_revoke",
  sessionId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return auditLogger.info(action, "session", `Revoked session ${sessionId}`, {
    entityId: sessionId,
    metadata,
  });
}

/**
 * Log a deposit action (RDC)
 */
export function logDepositAction(
  depositId: string,
  amountCents?: number,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return auditLogger.info(
    "deposit",
    "deposit",
    `Submitted deposit ${depositId}${amountCents ? ` ($${(amountCents / 100).toFixed(2)})` : ""}`,
    {
      entityId: depositId,
      metadata: { amountCents, ...metadata },
    },
  );
}
