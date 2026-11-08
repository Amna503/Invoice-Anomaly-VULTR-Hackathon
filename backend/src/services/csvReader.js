import fs from 'fs/promises';
import logger from '../utils/logger.js';

/**
 * Parse CSV file
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array>} Array of objects (rows)
 */
export async function parseCSV(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    if (lines.length === 0) {
      return [];
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim());

    // Parse rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      rows.push(row);
    }

    logger.debug({ filePath, rowCount: rows.length }, 'CSV parsed successfully');

    return rows;
  } catch (error) {
    logger.error({ filePath, error }, 'Failed to parse CSV');
    return [];
  }
}
