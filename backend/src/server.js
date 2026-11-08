import { createApp } from './app.js';
import connectDB from './config/db.js';
import env from './config/env.js';
import logger from './utils/logger.js';
import { invoiceQueue } from './pipeline/queue.js';

/**
 * Start the server
 */
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Resume any invoices stuck in processing from a prior crash
    await invoiceQueue.resumeAfterRestart();

    // Create Express app
    const app = createApp();

    // Start listening
    const PORT = env.PORT || 3000;
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${env.NODE_ENV} mode`);
      logger.info(`API documentation available at http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await mongoose.connection.close();
          logger.info('MongoDB connection closed');
          process.exit(0);
        } catch (error) {
          logger.error({ error }, 'Error during shutdown');
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Import mongoose for graceful shutdown
import mongoose from 'mongoose';

startServer();
