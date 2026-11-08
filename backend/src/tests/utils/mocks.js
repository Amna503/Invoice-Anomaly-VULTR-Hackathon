import { vi } from 'vitest';

let extractionResponse = null;
let textResponse = null;

export function mockInferenceClient() {
  return {
    chatJson: vi.fn(async () => extractionResponse || {}),
    chatText: vi.fn(async () => textResponse || '')
  };
}

export function setExtractionResponse(data) {
  extractionResponse = data;
}

export function setTextResponse(text) {
  textResponse = text;
}

export function mockPdfReader() {
  return {
    extractTextFromPDF: vi.fn(async () => 'Mock PDF text content')
  };
}

export function mockCsvReader() {
  return {
    parseCSV: vi.fn(async () => [
      { col1: 'value1', col2: 'value2' }
    ])
  };
}

export function resetMocks() {
  extractionResponse = null;
  textResponse = null;
}
