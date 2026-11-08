import Invoice from '../models/Invoice.js';
import logger from '../utils/logger.js';
import { logAuditEvent } from '../services/auditLog.js';

// Pipeline steps - will be implemented in phases
const STEPS = [
  { name: 'ingest', module: './steps/ingest.js' },
  { name: 'extract', module: './steps/extract.js' },
  { name: 'check', module: './steps/check.js' },
  { name: 'score_route', module: './steps/scoreRoute.js' },
  { name: 'explain', module: './steps/explain.js' },
  { name: 'draft_email', module: './steps/draftEmail.js' }
];

/**
 * Run the complete invoice processing pipeline
 * @param {string} invoiceId - Invoice ID to process
 */
export async function runPipeline(invoiceId) {
  const invoice = await Invoice.findById(invoiceId);

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  logger.info({ invoiceId, status: invoice.status }, 'Pipeline started');

  // Update status to processing
  await Invoice.findByIdAndUpdate(invoiceId, {
    status: 'processing',
    currentStep: null
  });

  await logAuditEvent({
    invoiceId,
    actor: 'agent',
    action: 'pipeline_started',
    details: { initialStatus: invoice.status }
  });

  try {
    for (const step of STEPS) {
      await executeStep(invoiceId, step);

      // Check if should continue
      const updated = await Invoice.findById(invoiceId);
      if (updated.status === 'failed' || updated.route === 'blocked') {
        logger.info({ invoiceId, step: step.name }, 'Pipeline stopped early');
        break;
      }

      // Skip explain and draft_email for auto_cleared
      if (updated.route === 'auto_cleared' &&
          (step.name === 'explain' || step.name === 'draft_email')) {
        logger.info({ invoiceId, step: step.name }, 'Skipping step for auto_cleared invoice');
        continue;
      }
    }

    const final = await Invoice.findById(invoiceId);

    await logAuditEvent({
      invoiceId,
      actor: 'agent',
      action: 'pipeline_completed',
      details: {
        finalStatus: final.status,
        route: final.route,
        riskScore: final.riskScore
      }
    });

    logger.info({
      invoiceId,
      status: final.status,
      route: final.route
    }, 'Pipeline completed');

  } catch (error) {
    logger.error({ invoiceId, error }, 'Pipeline failed');

    await Invoice.findByIdAndUpdate(invoiceId, {
      status: 'failed',
      failureReason: error.message
    });

    await logAuditEvent({
      invoiceId,
      actor: 'system',
      action: 'pipeline_failed',
      details: { error: error.message }
    });

    throw error;
  }
}

/**
 * Execute a single pipeline step with retry logic
 */
async function executeStep(invoiceId, step) {
  const MAX_RETRIES = 1;
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      logger.info({ invoiceId, step: step.name, attempt: attempt + 1 }, 'Executing step');

      // Update current step
      await Invoice.findByIdAndUpdate(invoiceId, {
        currentStep: step.name
      });

      // Dynamically import step module
      let stepFunction;
      try {
        const module = await import(step.module);
        stepFunction = module.default || module[step.name];
      } catch (importError) {
        // Step not implemented yet
        logger.warn({
          invoiceId,
          step: step.name
        }, 'Step module not implemented yet, skipping');
        return;
      }

      if (typeof stepFunction !== 'function') {
        logger.warn({ invoiceId, step: step.name }, 'Step function not found, skipping');
        return;
      }

      // Execute step
      await stepFunction(invoiceId);

      await logAuditEvent({
        invoiceId,
        actor: 'agent',
        action: `step_${step.name}_completed`,
        details: { attempt: attempt + 1 }
      });

      return; // Success

    } catch (error) {
      attempt++;

      logger.error({
        invoiceId,
        step: step.name,
        attempt,
        error
      }, 'Step failed');

      if (attempt > MAX_RETRIES) {
        await Invoice.findByIdAndUpdate(invoiceId, {
          status: 'needs_review',
          failureReason: `Step ${step.name} failed: ${error.message}`
        });

        await logAuditEvent({
          invoiceId,
          actor: 'system',
          action: `step_${step.name}_failed`,
          details: {
            error: error.message,
            attempts: attempt
          }
        });

        throw error;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
