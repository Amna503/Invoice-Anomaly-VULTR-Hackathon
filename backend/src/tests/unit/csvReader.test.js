import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { parseCSV } from '../../services/csvReader.js';
import fs from 'fs/promises';
import path from 'path';

const TEMP_DIR = 'E:/Temp/claude/218597edd0ff17a9/3c4de474-0180-4085-b8b2-291ffe82281c/scratchpad/csv-test';

describe('CSV Reader', () => {
  beforeAll(async () => {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
  });

  it('should convert valid CSV to array of objects', async () => {
    const csvPath = path.join(TEMP_DIR, 'valid.csv');
    await fs.writeFile(csvPath, 'name,price,qty\nItem1,100,5\nItem2,200,10');

    const result = await parseCSV(csvPath);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'Item1', price: '100', qty: '5' });
    expect(result[1]).toEqual({ name: 'Item2', price: '200', qty: '10' });
  });

  it('should return empty array for empty CSV', async () => {
    const csvPath = path.join(TEMP_DIR, 'empty.csv');
    await fs.writeFile(csvPath, '');

    const result = await parseCSV(csvPath);

    expect(result).toEqual([]);
  });

  it('should handle CSV with only headers', async () => {
    const csvPath = path.join(TEMP_DIR, 'headers-only.csv');
    await fs.writeFile(csvPath, 'col1,col2,col3');

    const result = await parseCSV(csvPath);

    expect(result).toEqual([]);
  });

  it('should trim whitespace from values', async () => {
    const csvPath = path.join(TEMP_DIR, 'whitespace.csv');
    await fs.writeFile(csvPath, ' name , price , qty \n Item1 , 100 , 5 ');

    const result = await parseCSV(csvPath);

    expect(result[0]).toEqual({ name: 'Item1', price: '100', qty: '5' });
  });

  it('should handle large CSV (500 rows)', async () => {
    const csvPath = path.join(TEMP_DIR, 'large.csv');
    const rows = ['name,value'];
    for (let i = 0; i < 500; i++) {
      rows.push(`row${i},${i}`);
    }
    await fs.writeFile(csvPath, rows.join('\n'));

    const result = await parseCSV(csvPath);

    expect(result).toHaveLength(500);
    expect(result[499]).toEqual({ name: 'row499', value: '499' });
  });
});
