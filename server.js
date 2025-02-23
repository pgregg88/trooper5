import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { parse } from 'url';
import next from 'next';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;
const httpsPort = process.env.HTTPS_PORT || 3443;

// Create Next.js app instance
const app = next({ dev });
const handle = app.getRequestHandler();

// Try to load HTTPS certificates
let httpsOptions;
try {
  httpsOptions = {
    key: readFileSync(join(__dirname, 'certificates', 'private.key')),
    cert: readFileSync(join(__dirname, 'certificates', 'certificate.crt')),
  };
} catch {
  console.error('\nError loading HTTPS certificates:');
  console.error('Make sure you have created the certificates in the ./certificates directory:');
  console.error('  • private.key');
  console.error('  • certificate.crt');
  console.error('\nFor local development without HTTPS, use:');
  console.error('  npm run dev');
  console.error('\nTo create certificates, follow the instructions in the README.md\n');
  process.exit(1);
}

app.prepare().then(() => {
  // Create HTTP server for localhost only
  createHttpServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, 'localhost', (err) => {
    if (err) throw err;
    console.log(`\n> Local development server ready:`);
    console.log(`  • http://localhost:${port}`);
  });

  // Create HTTP server that redirects to HTTPS for non-localhost
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
    if (err) throw err;
    console.log(`\n> HTTP->HTTPS redirect active:`);
    console.log(`  • Non-localhost requests on port ${port} will redirect to HTTPS port ${httpsPort}`);
  });

  // Create HTTPS server for all interfaces
  createHttpsServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(httpsPort, '0.0.0.0', (err) => {
    if (err) throw err;
    console.log(`\n> HTTPS server ready:`);
    console.log(`  • https://localhost:${httpsPort}`);
    console.log(`  • https://[your-ip]:${httpsPort}`);
    console.log('\nNote: You will need to accept the self-signed certificate warning in your browser.');
  });
}); 