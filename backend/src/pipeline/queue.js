import logger from '../utils/logger.js';
import { runPipeline } from './runPipeline.js';

// ponytail: DB-backed queue for restart recovery; upgrade to Bull/Redis if throughput > 100/min
class InvoiceQueue {
  constructor() {
    this.processing = new Set();
    this.isRunning = false;
  }

  async enqueue(invoiceId) {
    if (this.processing.has(invoiceId.toString())) {
      logger.warn({ invoiceId }, 'Invoice already in processing queue');
      return;
    }

    // Persist queued state to DB so restarts can recover it
    const { default: Invoice } = await import('../models/Invoice.js');
    await Invoice.findByIdAndUpdate(invoiceId, { status: 'queued', queuedAt: new Date() });

    logger.info({ invoiceId }, 'Invoice enqueued');

    if (!this.isRunning) {
      this.processQueue();
    }
  }

  async processQueue() {
    this.isRunning = true;

    const { default: Invoice } = await import('../models/Invoice.js');

    while (true) {
      const next = await Invoice.findOne({ status: 'queued' }).sort({ queuedAt: 1 }).select('_id');
      if (!next) break;

      const invoiceId = next._id;
      this.processing.add(invoiceId.toString());

      try {
        await Invoice.findByIdAndUpdate(invoiceId, { status: 'processing' });
        logger.info({ invoiceId }, 'Starting pipeline processing');
        await runPipeline(invoiceId);
        logger.info({ invoiceId }, 'Pipeline processing completed');
      } catch (error) {
        logger.error({ invoiceId, error }, 'Pipeline processing failed');
      } finally {
        this.processing.delete(invoiceId.toString());
      }
    }

    this.isRunning = false;
    logger.info('Queue processing stopped - queue empty');
  }

  /**
   * On startup, re-enqueue invoices stuck in processing state from a prior crash.
   */
  async resumeAfterRestart() {
    const { default: Invoice } = await import('../models/Invoice.js');

    const { modifiedCount } = await Invoice.updateMany(
      { status: 'processing' },
      { status: 'queued' }
    );

    if (modifiedCount > 0) {
      logger.info({ count: modifiedCount }, 'Reset stuck invoices to queued after restart');
    }

    const pending = await Invoice.countDocuments({ status: 'queued' });
    if (pending > 0) {
      logger.info({ count: pending }, 'Resuming queue after restart');
      this.processQueue();
    }
  }

  getStatus() {
    return {
      processing: Array.from(this.processing),
      isRunning: this.isRunning
    };
  }
}

export const invoiceQueue = new InvoiceQueue();
