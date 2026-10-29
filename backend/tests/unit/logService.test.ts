/**
 * Unit tests for the log service using an isolated in-memory repository.
 * No Express involved: this is why services are kept HTTP-free.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../../src/lib/AppError';
import { createMemoryLogRepository } from '../../src/repositories/logRepository';
import { createLogService } from '../../src/services/logService';

let service: ReturnType<typeof createLogService>;

beforeEach(() => {
  service = createLogService(createMemoryLogRepository());
});

describe('logService', () => {
  it('creates a log with defaults', async () => {
    const log = await service.createLog('u1', { activity: 'STUDY', minutes: 15 });
    expect(log.userId).toBe('u1');
    expect(log.note).toBeNull();
    expect(log.loggedAt).toBeInstanceOf(Date);
  });

  it('lists only the given user logs, newest first', async () => {
    await service.createLog('u1', { activity: 'STUDY', minutes: 1, loggedAt: '2026-01-01T00:00:00Z' });
    await service.createLog('u1', { activity: 'STUDY', minutes: 2, loggedAt: '2026-01-02T00:00:00Z' });
    await service.createLog('u2', { activity: 'STUDY', minutes: 3 });
    const logs = await service.listLogs('u1');
    expect(logs.map((l) => l.minutes)).toEqual([2, 1]);
  });

  it('delete throws NOT_FOUND for unknown id', async () => {
    await expect(service.deleteLog('u1', 'x')).rejects.toBeInstanceOf(AppError);
  });

  it('a user cannot delete another user log', async () => {
    const log = await service.createLog('u1', { activity: 'OTHER', minutes: 5 });
    await expect(service.deleteLog('u2', log.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await service.listLogs('u1')).toHaveLength(1);
  });
});
