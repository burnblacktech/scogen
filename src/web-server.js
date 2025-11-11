#!/usr/bin/env node

const APIServer = require('./api/server');

async function startWebServer() {
  const server = new APIServer();
  
  // Store shutdown handlers for cleanup
  const shutdownHandlers = [];
  
  const gracefulShutdown = async (signal) => {
    console.log(`\nReceived ${signal}, shutting down web server...`);
    
    // Remove all listeners to prevent multiple shutdowns
    shutdownHandlers.forEach(({ event, handler }) => {
      process.removeListener(event, handler);
    });
    
    try {
      await server.stop();
      console.log('Shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };
  
  const sigIntHandler = () => gracefulShutdown('SIGINT');
  const sigTermHandler = () => gracefulShutdown('SIGTERM');
  
  shutdownHandlers.push(
    { event: 'SIGINT', handler: sigIntHandler },
    { event: 'SIGTERM', handler: sigTermHandler }
  );
  
  process.on('SIGINT', sigIntHandler);
  process.on('SIGTERM', sigTermHandler);
  
  try {
    await server.initialize();
    await server.start();
  } catch (error) {
    console.error('Failed to start web server:', error);
    // Clean up listeners on startup failure
    shutdownHandlers.forEach(({ event, handler }) => {
      process.removeListener(event, handler);
    });
    await server.stop().catch(() => {}); // Try to cleanup even on startup failure
    process.exit(1);
  }
}

if (require.main === module) {
  startWebServer();
}

module.exports = { startWebServer };

