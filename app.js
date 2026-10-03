// ====================================================================
// cPanel Passenger Entry Point
// ====================================================================
// This file is required by cPanel's Phusion Passenger to start the app.
// It loads the compiled production server bundle from dist/server.cjs.
//
// SETUP INSTRUCTIONS (cPanel > Setup Node.js App):
//   Application root : /home/smastika/absensi-smastika  (or your app directory)
//   Application URL   : your-domain.com
//   Application startup file : app.js
//   Node.js version   : 18+ (recommended: 20)
// ====================================================================

const path = require('path');
const fs = require('fs');

// Ensure NODE_ENV is production
process.env.NODE_ENV = 'production';

// Load .env from current directory before loading server
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1).trim();
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    });
    console.log('[app.js] Successfully loaded environment variables from .env');
  } catch (err) {
    console.error('[app.js] Error loading .env:', err);
  }
}

// Resolve the compiled server bundle
const serverBundlePath = path.join(__dirname, 'dist', 'server.cjs');

if (!fs.existsSync(serverBundlePath)) {
  console.error('=====================================================');
  console.error('ERROR: dist/server.cjs not found!');
  console.error('Run "npm run build" before deploying to cPanel.');
  console.error('=====================================================');
  process.exit(1);
}

// Load and start the server
require(serverBundlePath);


