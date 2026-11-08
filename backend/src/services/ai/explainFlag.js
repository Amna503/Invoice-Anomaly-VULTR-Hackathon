import { callInference } from './inferenceClient.js';
import { EXPLAIN_FLAG } from './prompts.js';
import logger from '../../utils/logger.js';

/**
 * Generate human-readable explanation for a flag
 * @param {Object} flag - Flag with type, severity, evidence
 * @returns {Promise<string>} Explanation text
 */
export async function explainFlag(flag) {
  try {
    const prompt = `Explain this invoice anomaly:

Type: ${flag.type}
Severity: ${flag.severity}
Evidence: ${JSON.stringify(flag.evidence, null, 2)}

Provide a clear, professional explanation.`;

    const explanation = await callInference(prompt, {
      systemPrompt: EXPLAIN_FLAG,
      temperature: 0.2, // Slight creativity for natural language
      maxTokens: 300
    });

    return explanation.trim();

  } catch (error) {
    logger.error({ flag, error }, 'Failed to explain flag');
    // Return generic explanation on failure
    return `${flag.type.replace(/_/g, ' ')} detected (${flag.severity} severity)`;
  }
}
