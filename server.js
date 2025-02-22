const { createServer: createHttpServer } = require('http');
const { createServer: createHttpsServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;
const httpsPort = process.env.HTTPS_PORT || 3443;

// Create Next.js app instance
const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certificates', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certificates', 'cert.pem')),
};

app.prepare().then(() => {
  // Create HTTP server for localhost only
  createHttpServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, 'localhost', (err) => {
    if (err) throw err;
    console.log(`> HTTP Ready on http://localhost:${port}`);
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
    console.log(`> HTTP->HTTPS Redirect Ready on http://0.0.0.0:${port}`);
  });

  // Create HTTPS server for all interfaces
  createHttpsServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(httpsPort, '0.0.0.0', (err) => {
    if (err) throw err;
    console.log(`> HTTPS Ready on https://0.0.0.0:${httpsPort}`);
  });
}); 