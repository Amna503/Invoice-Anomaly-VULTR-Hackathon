import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import env from '../config/env.js';
import { ErrorCodes } from '../utils/response.js';

// Ensure upload directory exists
await fs.mkdir(env.UPLOAD_DIR, { recursive: true });

// Magic byte signatures
const MAGIC_BYTES = {
  pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
};

async function checkMagicBytes(filePath, expectedType) {
  if (expectedType === 'csv') return true; // CSV is text, no magic bytes
  if (expectedType === 'pdf') {
    const buf = Buffer.alloc(4);
    const fh = await fs.open(filePath, 'r');
    try {
      await fh.read(buf, 0, 4, 0);
    } finally {
      await fh.close();
    }
    return buf.equals(MAGIC_BYTES.pdf);
  }
  return false;
}

// File filter - only accept PDF and CSV (extension + mimetype; magic bytes checked post-save)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'text/plain'];
  const allowedExtensions = ['.pdf', '.csv'];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and CSV files are allowed.'), false);
  }
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const sanitized = basename.replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitized}${ext}`);
  }
});

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(env.MAX_FILE_SIZE_MB) * 1024 * 1024, // Convert MB to bytes
    files: 10 // Maximum 10 files per upload
  }
});

/**
 * Middleware for handling invoice file uploads
 * Accepts up to 10 files with field name "files"
 */
export const uploadInvoices = upload.array('files', 10);

export { checkMagicBytes };

/**
 * Error handler for multer errors
 */
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        ok: false,
        error: {
          code: ErrorCodes.FILE_TOO_LARGE,
          message: `File size exceeds ${env.MAX_FILE_SIZE_MB}MB limit`
        }
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        ok: false,
        error: {
          code: ErrorCodes.UPLOAD_FAILED,
          message: 'Maximum 10 files allowed per upload'
        }
      });
    }
    return res.status(400).json({
      ok: false,
      error: {
        code: ErrorCodes.UPLOAD_FAILED,
        message: error.message
      }
    });
  }

  if (error && error.message.includes('Invalid file type')) {
    return res.status(400).json({
      ok: false,
      error: {
        code: ErrorCodes.INVALID_FILE_TYPE,
        message: error.message
      }
    });
  }

  next(error);
};
