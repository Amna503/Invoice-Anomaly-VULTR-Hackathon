import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import env from './env.js';

const connectDB = async (retries = 5, delay = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      logger.info(`MongoDB connected: ${mongoose.connection.host}`);

      mongoose.connection.on('error', (err) => {
        logger.error({ err }, 'MongoDB connection error');
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      return;
    } catch (error) {
      logger.error({
        attempt,
        retries,
        error: error.message
      }, `MongoDB connection attempt ${attempt}/${retries} failed`);

      if (attempt === retries) {
        logger.fatal('MongoDB connection failed after all retries');
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export default connectDB;
