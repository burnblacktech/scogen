// Debug script to check registered routes
const express = require('express');
const app = express();

// Simulate the route mounting
const routes = require('./src/api/routes');
const ChainExecutor = require('./src/modules/chain-executor');
const { initializeSystem } = require('./src/index');

async function debugRoutes() {
  try {
    const system = initializeSystem();
    const executor = new ChainExecutor(
      system.config,
      system.logger,
      system.db,
      system.library
    );

    const router = routes(executor, system.db, system.logger, null, null);
    app.use('/api', router);

    // List all routes
    console.log('\n=== Registered Routes ===\n');
    router.stack.forEach((middleware) => {
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
        console.log(`${methods.padEnd(10)} ${middleware.route.path}`);
      } else if (middleware.name === 'router') {
        console.log(`\nRouter: ${middleware.regexp}`);
        if (middleware.handle && middleware.handle.stack) {
          middleware.handle.stack.forEach((subMiddleware) => {
            if (subMiddleware.route) {
              const methods = Object.keys(subMiddleware.route.methods).join(', ').toUpperCase();
              console.log(`  ${methods.padEnd(10)} ${subMiddleware.route.path}`);
            }
          });
        }
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

debugRoutes();
