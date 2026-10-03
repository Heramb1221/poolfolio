import app from './app';
import { env } from './config/env';
import prisma from './config/prisma';
import { initSentry } from './config/sentry';

// Initialize Sentry monitoring if configured
initSentry();

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Poolfolio server running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
  // eslint-disable-next-line no-console
  console.log(`📡 Health check available at: http://localhost:${env.PORT}/api/health`);
});

const gracefulShutdown = async (signal: string): Promise<void> => {
  // eslint-disable-next-line no-console
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    // eslint-disable-next-line no-console
    console.log('HTTP server closed.');
    try {
      await prisma.$disconnect();
      // eslint-disable-next-line no-console
      console.log('Database connection closed.');
      process.exit(0);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error during database disconnection:', err);
      process.exit(1);
    }
  });

  // Force close after 10 seconds if not already closed
  setTimeout(() => {
    // eslint-disable-next-line no-console
    console.error('Forcefully terminating process after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
