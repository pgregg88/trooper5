import https from 'https';
import fs from 'fs';
import { parse } from 'url';
import next from 'next';
import os from 'os';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync('./certificates/private.key'),
  cert: fs.readFileSync('./certificates/certificate.crt')
};

const port = process.env.HTTPS_PORT || 3443;

// Get network interfaces
function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      // Skip internal and IPv6 addresses
      if (!addr.internal && addr.family === 'IPv4') {
        addresses.push(addr.address);
      }
    }
  }
  return addresses;
}

// Format hostname for local network
function getFormattedHostname() {
  const hostname = os.hostname();
  // Add .local if it's not already there
  return hostname.endsWith('.local') ? hostname : `${hostname}.local`;
}

app.prepare().then(() => {
  // Get hostname
  const formattedHostname = getFormattedHostname();
  const addresses = getNetworkInfo();
  
  console.log('\nAvailable on:');
  console.log(`  • Hostname: https://${formattedHostname}:${port}`);
  addresses.forEach(addr => {
    console.log(`  • IP Address: https://${addr}:${port}`);
  });
  console.log('\nNote: You may need to accept the self-signed certificate warning.');

  https.createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, '0.0.0.0', (err) => {
    if (err) throw err;
    console.log(`\n> Server started on port ${port}`);
  });
});
