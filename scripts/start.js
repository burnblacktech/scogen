#!/usr/bin/env node

/**
 * SCOGEN Start Script
 * Starts the unified server (serves both API and web content)
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting SCOGEN Platform...\n');

// Check if .env exists
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env file not found. Running setup first...\n');
  const setup = spawn('node', ['scripts/setup.js'], {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  setup.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ Setup failed');
      process.exit(1);
    }
    startServer();
  });
} else {
  startServer();
}

function startServer() {
  // Load environment variables
  require('dotenv').config();
  
  // The server serves both API and web content on the same port
  const port = process.env.PORT || process.env.WEB_PORT || 3000;
  
  console.log(`🚀 Starting SCOGEN Platform on port ${port}...`);
  console.log(`   Web Interface: http://localhost:${port}`);
  console.log(`   API Endpoint: http://localhost:${port}/api\n`);
  
  // Start the unified server (serves both API and web)
  console.log('Starting server...');
  const server = spawn('node', ['src/web-server.js'], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, PORT: port }
  });
  
  // Handle server errors
  server.on('error', (error) => {
    console.error('❌ Server error:', error.message);
  });
  
  server.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Server exited with code ${code}`);
    }
  });
  
  // Open browser after a delay
  setTimeout(() => {
    const url = `http://localhost:${port}`;
    console.log(`\n✅ Server started!`);
    console.log(`\n📋 Access the platform:`);
    console.log(`   Web Interface: ${url}`);
    console.log(`   API Endpoint: ${url}/api`);
    console.log(`\n💡 Test credentials:`);
    console.log(`   Email: test@scogen.ai`);
    console.log(`   Password: test123\n`);
    
    // Try to open browser (optional)
    try {
      const { exec } = require('child_process');
      const platform = process.platform;
      let command;
      
      if (platform === 'win32') {
        command = `start ${url}`;
      } else if (platform === 'darwin') {
        command = `open ${url}`;
      } else {
        command = `xdg-open ${url}`;
      }
      
      exec(command, (error) => {
        if (error) {
          // Browser opening failed, but that's okay
        }
      });
    } catch (error) {
      // Ignore browser opening errors
    }
  }, 5000);
  
  // Graceful shutdown
  const shutdown = () => {
    console.log('\n\n🛑 Shutting down server...');
    if (server) {
      server.kill();
    }
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
