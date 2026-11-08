import OpenAI from 'openai';
import env from '../../config/env.js';
import { retry } from '../../utils/retry.js';
import logger from '../../utils/logger.js';

// Initialize Vultr Serverless Inference client
const client = new OpenAI({
  apiKey: env.VULTR_INFERENCE_API_KEY,
  baseURL: env.VULTR_INFERENCE_BASE_URL
});

/**
 * Call Vultr Serverless Inference
 * @param {string} prompt - User prompt
 * @param {Object} options - Additional options
 * @param {number} options.temperature - Temperature (0-1)
 * @param {number} options.maxTokens - Max tokens
 * @param {string} options.systemPrompt - System prompt
 * @returns {Promise<string>} Response text
 */
export async function callInference(prompt, options = {}) {
  const {
    temperature = 0,
    maxTokens = 2000,
    systemPrompt = 'You are a helpful assistant.'
  } = options;

  return retry(
    async () => {
      const completion = await client.chat.completions.create({
        model: env.MODEL_NAME,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature,
        max_tokens: maxTokens
      }, {
        timeout: 30000 // 30 second timeout
      });

      return completion.choices[0].message.content;
    },
    {
      maxRetries: 2,
      operationName: 'Vultr AI inference call'
    }
  );
}
