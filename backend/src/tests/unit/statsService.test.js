import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb, clearCollections } from '../utils/testDb.js';
import { createTestInvoice } from '../utils/fixtures.js';
import Invoice from '../../models/Invoice.js';
import { calculateStats } from '../../services/statsService.js';

describe('Stats Service', () => {
  beforeAll(async () => {
    await setupTestDb();
  }, 30000);

  afterAll(async () => {
    await teardownTestDb();
  }, 30000);

  beforeEach(async () => {
    await clearCollections();
  });

  it('should calculate hours saved correctly', async () => {
    // ponytail: hours saved = (auto_cleared * 5) / 60
    await Invoice.create([
      createTestInvoice({ status: 'auto_cleared' }),
      createTestInvoice({ status: 'auto_cleared' }),
      createTestInvoice({ status: 'auto_cleared' })
    ]);

    const stats = await calculateStats();

    // 3 auto_cleared * 0.25 hours (15 min) = 0.75, rounded to 1
    expect(stats.estimatedHoursSaved).toBe(1);
  });

  it('should calculate money at risk from needs_review and blocked', async () => {
    await Invoice.create([
      createTestInvoice({ status: 'needs_review', extracted: { total: 1000 } }),
      createTestInvoice({ status: 'blocked', extracted: { total: 2000 } }),
      createTestInvoice({ status: 'auto_cleared', extracted: { total: 500 } })
    ]);

    const stats = await calculateStats();

    expect(stats.moneyAtRisk).toBe(3000); // 1000 + 2000
  });

  it('should count invoices by status', async () => {
    await Invoice.create([
      createTestInvoice({ status: 'auto_cleared' }),
      createTestInvoice({ status: 'needs_review' }),
      createTestInvoice({ status: 'blocked' }),
      createTestInvoice({ status: 'approved' }),
      createTestInvoice({ status: 'rejected' })
    ]);

    const stats = await calculateStats();

    expect(stats.totalInvoices).toBe(5);
    expect(stats.autoCleared).toBe(1);
    expect(stats.needsReview).toBe(1);
    expect(stats.blocked).toBe(1);
    expect(stats.approved).toBe(1);
    expect(stats.rejected).toBe(1);
  });

  it('should handle empty database', async () => {
    const stats = await calculateStats();

    expect(stats.totalInvoices).toBe(0);
    expect(stats.autoCleared).toBe(0);
    expect(stats.moneyAtRisk).toBe(0);
    expect(stats.estimatedHoursSaved).toBe(0);
  });

  it('should handle invoices without extracted totals', async () => {
    await Invoice.create([
      createTestInvoice({ status: 'needs_review', extracted: {} }),
      createTestInvoice({ status: 'blocked', extracted: { total: null } })
    ]);

    const stats = await calculateStats();

    expect(stats.moneyAtRisk).toBe(0);
  });
});
