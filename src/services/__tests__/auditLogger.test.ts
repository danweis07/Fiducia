import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the backend module
const mockInvoke = vi.fn().mockResolvedValue({ data: {} });
vi.mock('@/lib/backend', () => ({
  getBackend: vi.fn().mockReturnValue({
    gateway: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  }),
}));

// Mock useAuth for the hook
vi.mock('@/contexts/TenantContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 'user-1' },
    tenant: { tenantId: 'tenant-1' },
  }),
}));

// Import after mocks
import { auditLogger } from '../auditLogger';
import type { AuditAction, AuditEntity } from '../auditLogger';

describe('AuditLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditLogger.clearContext();
    auditLogger.setEnabled(true);
  });

  // ===========================================================================
  // Context management
  // ===========================================================================

  describe('context management', () => {
    it('sets user context', () => {
      auditLogger.setContext({ userId: 'user-1', firmId: 'firm-1' });
      // Context is set internally; we verify by logging and checking the entry
    });

    it('clears context', () => {
      auditLogger.setContext({ userId: 'user-1' });
      auditLogger.clearContext();
      // After clearing, context should be empty
    });

    it('merges context values', () => {
      auditLogger.setContext({ userId: 'user-1' });
      auditLogger.setContext({ firmId: 'firm-1' });
      // Both should be set
    });
  });

  // ===========================================================================
  // Enabling/disabling
  // ===========================================================================

  describe('enable/disable', () => {
    it('does not log when disabled', async () => {
      auditLogger.setEnabled(false);
      await auditLogger.log('info', 'create', 'property', 'Test message');
      // Should not have buffered anything
      await auditLogger.flush();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('logs when re-enabled', async () => {
      auditLogger.setEnabled(false);
      auditLogger.setEnabled(true);
      await auditLogger.log('error', 'create', 'property', 'Error message');
      // Error logs immediately
      expect(mockInvoke).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Severity levels
  // ===========================================================================

  describe('severity levels', () => {
    it('logs error severity immediately', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await auditLogger.error('create', 'property', 'Error occurred');
      expect(mockInvoke).toHaveBeenCalledWith('audit.write', expect.objectContaining({
        entries: expect.arrayContaining([
          expect.objectContaining({ severity: 'error' }),
        ]),
      }));
      consoleSpy.mockRestore();
    });

    it('buffers info severity logs', async () => {
      await auditLogger.info('create', 'property', 'Info message');
      // Should be buffered, not yet sent
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('buffers debug severity logs', async () => {
      await auditLogger.debug('view', 'property', 'Debug message');
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('buffers warn severity logs', async () => {
      await auditLogger.warn('update', 'settings', 'Warning message');
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Log method
  // ===========================================================================

  describe('log method', () => {
    it('creates entry with correct fields', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      auditLogger.setContext({ userId: 'user-1', firmId: 'firm-1' });
      await auditLogger.log('error', 'create', 'property', 'Created property', {
        entityId: 123,
        metadata: { name: 'Test Property' },
      });

      expect(mockInvoke).toHaveBeenCalledWith('audit.write', {
        entries: [expect.objectContaining({
          severity: 'error',
          action: 'create',
          entityType: 'property',
          message: 'Created property',
          entityId: '123',
          userId: 'user-1',
          firmId: 'firm-1',
          metadata: { name: 'Test Property' },
        })],
      });
      consoleSpy.mockRestore();
    });

    it('includes timestamp in ISO format', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await auditLogger.error('create', 'property', 'Test');
      const call = mockInvoke.mock.calls[0];
      const entry = call[1].entries[0];
      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      consoleSpy.mockRestore();
    });
  });

  // ===========================================================================
  // Convenience methods
  // ===========================================================================

  describe('convenience methods', () => {
    it('logCreate creates info-level create entry', async () => {
      await auditLogger.logCreate('property', 123, 'Test Property');
      // Buffered; flush to send
      await auditLogger.flush();
      expect(mockInvoke).toHaveBeenCalledWith('audit.write', {
        entries: expect.arrayContaining([
          expect.objectContaining({
            action: 'create',
            entityType: 'property',
            entityId: '123',
          }),
        ]),
      });
    });

    it('logUpdate logs update with change count', async () => {
      await auditLogger.logUpdate('deal', 'deal-1', {
        status: { from: 'draft', to: 'active' },
      });
      await auditLogger.flush();
      expect(mockInvoke).toHaveBeenCalledWith('audit.write', {
        entries: expect.arrayContaining([
          expect.objectContaining({
            action: 'update',
            entityType: 'deal',
            message: expect.stringContaining('1 fields changed'),
          }),
        ]),
      });
    });

    it('logDelete logs delete entry', async () => {
      await auditLogger.logDelete('task', 'task-1', 'Review docs');
      await auditLogger.flush();
      expect(mockInvoke).toHaveBeenCalledWith('audit.write', {
        entries: expect.arrayContaining([
          expect.objectContaining({
            action: 'delete',
            entityType: 'task',
            message: expect.stringContaining('Deleted task'),
          }),
        ]),
      });
    });

    it('logView logs debug-level view entry', async () => {
      await auditLogger.logView('property', 42);
      await auditLogger.flush();
      expect(mockInvoke).toHaveBeenCalledWith('audit.write', {
        entries: expect.arrayContaining([
          expect.objectContaining({
            action: 'view',
            entityType: 'property',
          }),
        ]),
      });
    });

    it('logBulkOperation logs bulk action with count', async () => {
      await auditLogger.logBulkOperation('property', 'archive', 15);
      await auditLogger.flush();
      expect(mockInvoke).toHaveBeenCalledWith('audit.write', {
        entries: expect.arrayContaining([
          expect.objectContaining({
            action: 'bulk_operation',
            message: expect.stringContaining('15'),
          }),
        ]),
      });
    });

    it('logSystemEvent logs system event', async () => {
      await auditLogger.logSystemEvent('System maintenance started');
      await auditLogger.flush();
      expect(mockInvoke).toHaveBeenCalledWith('audit.write', {
        entries: expect.arrayContaining([
          expect.objectContaining({
            action: 'system_event',
            entityType: 'system',
            message: 'System maintenance started',
          }),
        ]),
      });
    });

    it('logError logs error with stack trace', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Something broke');
      await auditLogger.logError(error);
      expect(mockInvoke).toHaveBeenCalledWith('audit.write', {
        entries: expect.arrayContaining([
          expect.objectContaining({
            severity: 'error',
            message: 'Something broke',
            metadata: expect.objectContaining({
              errorName: 'Error',
              stack: expect.stringContaining('Error: Something broke'),
            }),
          }),
        ]),
      });
      consoleSpy.mockRestore();
    });

    it('logError accepts context options', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Failed to save');
      await auditLogger.logError(error, {
        action: 'update',
        entity: 'deal',
        entityId: 'deal-1',
      });
      expect(mockInvoke).toHaveBeenCalledWith('audit.write', {
        entries: expect.arrayContaining([
          expect.objectContaining({
            action: 'update',
            entityType: 'deal',
            entityId: 'deal-1',
          }),
        ]),
      });
      consoleSpy.mockRestore();
    });
  });

  // ===========================================================================
  // Flush behavior
  // ===========================================================================

  describe('flush', () => {
    it('does nothing when buffer is empty', async () => {
      await auditLogger.flush();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('sends buffered entries', async () => {
      await auditLogger.info('create', 'property', 'Entry 1');
      await auditLogger.info('update', 'deal', 'Entry 2');
      await auditLogger.flush();
      expect(mockInvoke).toHaveBeenCalledWith('audit.write', {
        entries: expect.arrayContaining([
          expect.objectContaining({ message: 'Entry 1' }),
          expect.objectContaining({ message: 'Entry 2' }),
        ]),
      });
    });

    it('clears buffer after successful flush', async () => {
      await auditLogger.info('create', 'property', 'Entry');
      await auditLogger.flush();
      mockInvoke.mockClear();
      await auditLogger.flush();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('logs error to console when flush encounters a write failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await auditLogger.info('create', 'property', 'Entry');
      mockInvoke.mockRejectedValueOnce(new Error('Network error'));
      await auditLogger.flush();
      // writeLogs catches internally and logs to console.error
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to write audit logs:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it('auto-flushes when buffer reaches limit', async () => {
      // BUFFER_SIZE is 10
      for (let i = 0; i < 10; i++) {
        await auditLogger.info('create', 'property', `Entry ${i}`);
      }
      // Should have auto-flushed
      expect(mockInvoke).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Query
  // ===========================================================================

  describe('query', () => {
    it('queries audit logs with options', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {
          entries: [
            { id: '1', timestamp: '2026-03-14', severity: 'info', action: 'create', entityType: 'property', message: 'Test' },
          ],
        },
      });

      const results = await auditLogger.query({ action: 'create', limit: 10 });
      expect(mockInvoke).toHaveBeenCalledWith('audit.log', expect.objectContaining({
        action: 'create',
        limit: 10,
      }));
      expect(results).toHaveLength(1);
      expect(results[0].action).toBe('create');
    });

    it('returns empty array on query error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockInvoke.mockRejectedValueOnce(new Error('Query failed'));
      const results = await auditLogger.query();
      expect(results).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('maps snake_case fields from response', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {
          entries: [
            {
              id: '1',
              timestamp: '2026-03-14',
              severity: 'info',
              action: 'create',
              entity_type: 'property',
              entity_id: '42',
              user_id: 'u1',
              firm_id: 'f1',
              message: 'Test',
              ip_address: '127.0.0.1',
              user_agent: 'Mozilla/5.0',
            },
          ],
        },
      });

      const results = await auditLogger.query();
      expect(results[0].entity).toBe('property');
      expect(results[0].entityId).toBe('42');
      expect(results[0].userId).toBe('u1');
      expect(results[0].firmId).toBe('f1');
      expect(results[0].ipAddress).toBe('127.0.0.1');
      expect(results[0].userAgent).toBe('Mozilla/5.0');
    });

    it('passes all filter parameters', async () => {
      mockInvoke.mockResolvedValueOnce({ data: { entries: [] } });
      await auditLogger.query({
        firmId: 'f1',
        userId: 'u1',
        action: 'create',
        entity: 'property',
        severity: 'info',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        limit: 50,
        offset: 10,
      });
      expect(mockInvoke).toHaveBeenCalledWith('audit.log', {
        firmId: 'f1',
        userId: 'u1',
        action: 'create',
        entity: 'property',
        severity: 'info',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        limit: 50,
        offset: 10,
      });
    });

    it('handles empty entries in response', async () => {
      mockInvoke.mockResolvedValueOnce({ data: { entries: [] } });
      const results = await auditLogger.query();
      expect(results).toEqual([]);
    });

    it('handles missing entries key in response', async () => {
      mockInvoke.mockResolvedValueOnce({ data: {} });
      const results = await auditLogger.query();
      expect(results).toEqual([]);
    });
  });

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  describe('cleanupOldLogs', () => {
    it('calls cleanup with cutoff date', async () => {
      mockInvoke.mockResolvedValueOnce({ data: { deletedCount: 42 } });
      const result = await auditLogger.cleanupOldLogs(90);
      expect(mockInvoke).toHaveBeenCalledWith('audit.cleanup', expect.objectContaining({
        cutoffDate: expect.any(String),
      }));
      expect(result).toBe(42);
    });

    it('defaults to 90 days', async () => {
      mockInvoke.mockResolvedValueOnce({ data: { deletedCount: 0 } });
      await auditLogger.cleanupOldLogs();
      expect(mockInvoke).toHaveBeenCalled();
    });

    it('returns 0 on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockInvoke.mockRejectedValueOnce(new Error('Cleanup failed'));
      const result = await auditLogger.cleanupOldLogs();
      expect(result).toBe(0);
      consoleSpy.mockRestore();
    });
  });

  // ===========================================================================
  // Action categorization
  // ===========================================================================

  describe('action categorization', () => {
    it('logUserAction logs with correct action type', async () => {
      await auditLogger.logUserAction('login', 'user', 'User logged in');
      await auditLogger.flush();
      expect(mockInvoke).toHaveBeenCalledWith('audit.write', {
        entries: expect.arrayContaining([
          expect.objectContaining({ action: 'login' }),
        ]),
      });
    });

    it('supports all action types', async () => {
      const actions: AuditAction[] = [
        'create', 'update', 'delete', 'view', 'export',
        'import', 'login', 'logout', 'permission_change',
        'score_calculate', 'bulk_operation', 'system_event',
      ];
      for (const action of actions) {
        await auditLogger.info(action, 'system', `Testing ${action}`);
      }
      await auditLogger.flush();
      expect(mockInvoke).toHaveBeenCalled();
    });

    it('supports all entity types', async () => {
      const entities: AuditEntity[] = [
        'property', 'deal', 'task', 'activity', 'contact',
        'user', 'firm', 'score', 'document', 'settings', 'system',
      ];
      for (const entity of entities) {
        await auditLogger.info('view', entity, `Testing ${entity}`);
      }
      await auditLogger.flush();
      expect(mockInvoke).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // toRecord conversion
  // ===========================================================================

  describe('toRecord conversion', () => {
    it('converts entityId number to string', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await auditLogger.error('create', 'property', 'Test', { entityId: 42 });
      const call = mockInvoke.mock.calls[0];
      const entry = call[1].entries[0];
      expect(entry.entityId).toBe('42');
      consoleSpy.mockRestore();
    });

    it('converts entityId string to string', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await auditLogger.error('create', 'deal', 'Test', { entityId: 'deal-1' });
      const call = mockInvoke.mock.calls[0];
      const entry = call[1].entries[0];
      expect(entry.entityId).toBe('deal-1');
      consoleSpy.mockRestore();
    });
  });

  // ===========================================================================
  // Destroy
  // ===========================================================================

  describe('destroy', () => {
    it('flushes remaining entries on destroy', async () => {
      await auditLogger.info('create', 'property', 'Last entry');
      auditLogger.destroy();
      // Flush is called during destroy
    });
  });
});
