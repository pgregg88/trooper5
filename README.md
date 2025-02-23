# Imperial Communications Terminal

A secure communications terminal that processes voice through an authentic stormtrooper helmet audio system. Features include:

- Real-time voice processing to simulate stormtrooper helmet acoustics
- Authentic radio clicks and static effects
- Push-to-talk functionality
- Secure encrypted communications

## Prerequisites

### Cleaning Previous Node.js Installations

1. Remove existing Node.js installations

   ```bash
   # macOS
   brew uninstall node
   brew cleanup
   # Remove global packages
   rm -rf ~/.node-gyp
   rm -rf ~/.npm

   # Windows
   # Use Control Panel to uninstall Node.js
   # Then remove remaining directories:
   rmdir /s /q %AppData%\npm
   rmdir /s /q %AppData%\npm-cache
   rmdir /s /q %UserProfile%\.node-gyp
   
   # Linux/Ubuntu
   sudo apt remove nodejs npm
   sudo apt purge nodejs npm
   sudo apt autoremove
   # Remove global packages
   rm -rf ~/.node-gyp
   rm -rf ~/.npm
   ```

2. Verify Node.js is completely removed

   ```bash
   # These should all return "command not found"
   node --version
   npm --version
   npx --version
   ```

### Installing Node.js

1. Install Node Version Manager (nvm)

   ```bash
   # macOS and Linux
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

   # Windows
   # Download and run nvm-windows installer from:
   # https://github.com/coreybutler/nvm-windows/releases
   ```

2. Restart your terminal, then verify nvm installation

   ```bash
   nvm --version
   ```

3. Install Node.js v20.18.1

   ```bash
   # Install the specific version
   nvm install 20.18.1

   # Set it as the default version
   nvm use 20.18.1

   # Verify installation
   node --version  # Should output v20.18.1
   npm --version
   ```

   Note: On Windows, use `nvm use 20.18.1` in an Administrator command prompt.

## Installation

1. Clone the repository

   ```bash
   git clone [repository-url]
   cd [repository-name]
   ```

2. Set up environment variables

   ```bash
   # Create .env file
   cp .env.example .env

   # Edit .env file with your OpenAI API key
   # macOS/Linux
   nano .env
   # Windows
   notepad .env
   ```

   Required variables in `.env`:
   ```bash
   OPENAI_API_KEY=your_api_key_here
   # Optional: Configure custom HTTPS port (default: 3443)
   HTTPS_PORT=3443
   ```

3. Configure HTTPS for network access

   ```bash
   # Create certificates directory
   mkdir certificates
   cd certificates

   # Generate self-signed certificate (macOS/Linux)
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout private.key -out certificate.crt \
     -subj "/CN=localhost"

   # Windows (in PowerShell as Administrator)
   New-SelfSignedCertificate -DnsName "localhost" `
     -CertStoreLocation "cert:\LocalMachine\My" `
     -NotAfter (Get-Date).AddYears(1)
   # Export the certificate and key from Windows Certificate Manager
   ```

   Place the certificates in the `certificates` directory:
   ```
   certificates/
   ├── private.key
   └── certificate.crt
   ```

4. Add HTTPS script to package.json
   ```bash
   # Open package.json
   nano package.json  # or your preferred editor
   ```

   Add the following to the "scripts" section:
   ```json
   {
     "scripts": {
       "dev": "next dev",
       "dev:https": "node server.js",
       "build": "next build",
       "start": "next start"
     }
   }
   ```

5. Create HTTPS server configuration
   ```bash
   # Create server.js in project root
   cat > server.js << 'EOL'
const https = require('https');
const fs = require('fs');
const { parse } = require('url');
const next = require('next');
const os = require('os');
const dns = require('dns');

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
EOL

   # Verify server.js was created
   ls -l server.js
   ```

   The file should be created in your project root directory. You can verify its contents with:
   ```bash
   cat server.js
   ```

   When you run the server, it will show all available network addresses:
   ```bash
   > Server started on port 3443

   Available on:
     • Hostname: https://your-computer-name.local:3443
     • IP Address: https://192.168.1.100:3443
     • IP Address: https://10.0.0.100:3443

   Note: You may need to accept the self-signed certificate warning.
   ```

6. Verify you're in the correct directory

   ```bash
   # Confirm you're in the project directory
   pwd  # Should show /path/to/[repository-name]
   
   # Verify package.json exists
   ls package.json  # Should show package.json
   ```

7. Clean up old packages (if updating/reinstalling)

   ```bash
   # Remove old packages and lock file
   rm -rf node_modules
   rm package-lock.json

   # Windows alternative
   rmdir /s /q node_modules
   del package-lock.json
   ```

8. Install dependencies

   ```bash
   # Clean npm cache (optional but recommended)
   npm cache clean --force

   # Install packages
   npm install
   ```

   If you see "ENOENT: no such file or directory, open 'package.json'":

   ```bash
   # You're likely in the wrong directory. Check current location:
   pwd

   # Navigate to project directory:
   cd /path/to/[repository-name]

   # Verify package.json exists:
   ls package.json

   # Then try install again:
   npm install
   ```

## Running the Terminal

1. Start the development server

   ```bash
   # Local development (HTTP)
   npm run dev

   # Network access (HTTPS)
   npm run dev:https   # Runs on port 3443 by default
   ```

2. Access the terminal
   - Local development: http://localhost:3000
   - Network access: https://[your-ip]:3443

   Note: When accessing via HTTPS, you'll need to:
   1. Accept the self-signed certificate warning in your browser
   2. Grant microphone permissions
   3. Ensure your firewall allows connections on port 3443

## Usage

1. Connect to the terminal using the "Connect" button
2. Grant microphone permissions when prompted
3. Use the following controls:
   - **Push to talk**: Toggle for push-to-talk mode
   - **Voice effect**: Toggle stormtrooper voice processing
   - **Audio playback**: Toggle audio output
   - **Logs**: View communication logs

## Security Notice

This terminal requires a secure connection. Always access via:

- http://localhost:3000 (local development)
- https://[your-ip]:3443 (network access)

For network access, ensure:
1. Your firewall allows incoming connections on port 3443
2. The self-signed certificate is properly configured
3. You're using HTTPS when accessing from other devices

## Troubleshooting

1. **Node.js Installation Issues**
   - If `nvm` command is not found after installation, try:

     ```bash
     export NVM_DIR="$HOME/.nvm"
     [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
     ```

   - On Windows, ensure you're using an Administrator command prompt
   - If you see permission errors, try running the commands with `sudo` (Unix/Linux)
   - If you see "node already installed" errors:

     ```bash
     # List all Node.js versions managed by nvm
     nvm ls
     
     # Remove a specific version
     nvm uninstall <version>
     
     # Or remove all versions
     nvm deactivate  # Stop using current version
     rm -rf ~/.nvm/* # Unix/Linux
     rmdir /s /q %UserProfile%\.nvm # Windows
     ```

2. **No audio processing**
   - Ensure microphone permissions are granted
   - Check that you're using a secure connection
   - Verify audio playback is enabled

3. **Connection issues**
   - Confirm you're using the correct URL
   - Check network connectivity
   - Verify the server is running

4. **HTTPS/Certificate Issues**
   - If you see certificate warnings:
     ```bash
     # Verify certificate files exist
     ls certificates/private.key certificates/certificate.crt

     # Check certificate expiration
     openssl x509 -in certificates/certificate.crt -noout -dates

     # Verify certificate permissions
     chmod 600 certificates/private.key
     chmod 644 certificates/certificate.crt
     ```
   - If port 3443 is in use:
     ```bash
     # Check what's using the port
     lsof -i :3443    # macOS/Linux
     netstat -ano | findstr :3443  # Windows

     # Change the port in .env
     HTTPS_PORT=3444  # Or another available port
     ```

## Support

For technical support, contact your local Imperial IT department.

## Security Classification

IMPERIAL RESTRICTED - Level 3 Clearance Required

## Repository Structure

This repository uses the following branching strategy:
```
main ................ Primary development branch with stormtrooper voice implementation
upstream-main ....... Tracks the original source repository for updates
feature/* .......... Feature branches for new development
```

### Managing Upstream Updates

1. First-time setup (if you haven't already):
   ```bash
   # Add the upstream repository
   git remote add upstream https://github.com/replit/realtime-agents-demo.git

   # Ensure upstream-main is tracking upstream
   git checkout upstream-main
   git reset --hard upstream/main
   ```

2. To get updates from the source repository:
   ```bash
   # Fetch upstream changes
   git fetch upstream

   # Update upstream-main branch
   git checkout upstream-main
   git reset --hard upstream/main

   # Return to your main branch
   git checkout main

   # Merge updates (resolve conflicts as needed)
   git merge upstream-main
   ```

3. For new features:
   ```bash
   # Create a feature branch
   git checkout -b feature/new-feature

   # After development, merge back to main
   git checkout main
   git merge feature/new-feature
   ```
