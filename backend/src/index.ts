import app from './app';
import { ENV } from './config/env';
import prisma from './config/prisma';

const server = app.listen(ENV.PORT, async () => {
  console.log(`=========================================`);
  console.log(`Operations Portal API Server running`);
  console.log(`Port: ${ENV.PORT}`);
  console.log(`Environment: ${ENV.NODE_ENV}`);
  console.log(`Health Check: http://localhost:${ENV.PORT}/health`);
  console.log(`=========================================`);

  try {
    await prisma.$connect();
    console.log('Database connection established.');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
});

const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Database client disconnected.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
