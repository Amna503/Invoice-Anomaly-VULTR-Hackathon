import { z } from 'zod';
import { callInference } from './inferenceClient.js';
import { EXTRACT_INVOICE } from './prompts.js';
import logger from '../../utils/logger.js';

// Zod schema for extracted invoice data
const extractedInvoiceSchema = z.object({
  vendorName: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  invoiceDate: z.string().nullable(), // Will be converted to Date
  currency: z.string().default('USD'),
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    amount: z.number()
  })).default([]),
  subtotal: z.number().nullable(),
  tax: z.number().nullable(),
  total: z.number().nullable(),
  bankAccount: z.string().nullable(),
  poNumber: z.string().nullable()
});

/**
 * Extract invoice data from raw text using AI
 * @param {string} rawText - Raw invoice text
 * @returns {Promise<Object>} Validated extracted data
 */
export async function extractInvoiceData(rawText) {
  try {
    // Truncate very long text (keep first 10000 chars)
    const truncatedText = rawText.substring(0, 10000);

    // Wrap text in delimiters to prevent prompt injection
    const prompt = `Extract invoice data from the following text:

---BEGIN INVOICE TEXT---
${truncatedText}
---END INVOICE TEXT---

Return only the JSON object with extracted data.`;

    const response = await callInference(prompt, {
      systemPrompt: EXTRACT_INVOICE,
      temperature: 0, // Deterministic extraction
      maxTokens: 1500
    });

    // Parse JSON response
    let parsed;
    try {
      // Try to extract JSON if wrapped in markdown code blocks
      const jsonMatch = response.match(/```json?\s*([\s\S]*?)\s*```/) ||
                       response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      logger.error({ response, error: parseError }, 'Failed to parse AI response as JSON');
      throw new Error('AI returned invalid JSON');
    }

    // Validate with Zod
    const validated = extractedInvoiceSchema.parse(parsed);

    // Convert date string to Date object
    if (validated.invoiceDate) {
      try {
        validated.invoiceDate = new Date(validated.invoiceDate);
      } catch {
        validated.invoiceDate = null;
      }
    }

    logger.info({
      vendorName: validated.vendorName,
      invoiceNumber: validated.invoiceNumber,
      total: validated.total
    }, 'Invoice data extracted successfully');

    return validated;

  } catch (error) {
    logger.error({ error }, 'Failed to extract invoice data');
    throw error;
  }
}
