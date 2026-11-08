import pdfParse from 'pdf-parse';
import fs from 'fs/promises';
import logger from '../utils/logger.js';

/**
 * Extract text from PDF file
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<string>} Extracted text
 */
export async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);

    logger.debug({ filePath, pages: data.numpages }, 'PDF parsed successfully');

    return data.text;
  } catch (error) {
    logger.error({ filePath, error }, 'Failed to extract text from PDF');
    return ''; // Return empty string on failure
  }
}
