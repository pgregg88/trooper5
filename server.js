import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { parse } from 'url';
import next from 'next';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;
const httpsPort = process.env.HTTPS_PORT || 3443;

// Create Next.js app instance
const app = next({ dev });
const handle = app.getRequestHandler();

// Try to load HTTPS certificates
let httpsOptions;
try {
  const certDir = join(__dirname, 'certificates');
  httpsOptions = {
    key: readFileSync(join(certDir, 'key.pem')),
    cert: readFileSync(join(certDir, 'cert.pem')),
  };
} catch (error) {
  console.error('\nError loading HTTPS certificates:', error.message);
  console.error('Make sure you have created the certificates in the ./certificates directory:');
  console.error('  • key.pem');
  console.error('  • cert.pem');
  console.error('\nFor local development without HTTPS, use:');
  console.error('  npm run dev');
  console.error('\nTo create certificates, follow the instructions in the README.md\n');
  process.exit(1);
}

app.prepare().then(() => {
  // Create HTTP server that handles both localhost and non-localhost requests
  createHttpServer((req, res) => {
    const host = req.headers.host?.split(':')[0];
    if (host && host !== 'localhost') {
      res.writeHead(301, {
        Location: `https://${host}:${httpsPort}${req.url}`
      });
      res.end();
    } else {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }
  }).listen(port, '0.0.0.0', (err) => {
    if (err) {
      if (err.code === 'EADDRINUSE') {
        console.log(`\n> Port ${port} is already in use. This is expected if you're running both HTTP and HTTPS servers.`);
      } else {
        console.error('Error starting HTTP server:', err);
      }
    } else {
      console.log(`\n> HTTP server ready:`);
      console.log(`  • http://localhost:${port}`);
      console.log(`\n> HTTP->HTTPS redirect active:`);
      console.log(`  • Non-localhost requests on port ${port} will redirect to HTTPS port ${httpsPort}`);
    }
  });

  // Create HTTPS server for all interfaces
  createHttpsServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(httpsPort, '0.0.0.0', (err) => {
    if (err) {
      console.error('Error starting HTTPS server:', err);
      process.exit(1);
    }
    console.log(`\n> HTTPS server ready:`);
    console.log(`  • https://localhost:${httpsPort}`);
    console.log(`  • https://[your-ip]:${httpsPort}`);
    console.log('\nNote: You will need to accept the self-signed certificate warning in your browser.');
  });
}); 