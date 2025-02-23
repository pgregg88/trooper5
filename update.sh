#!/bin/bash

echo "Starting update process..."

# Backup certificates if they exist
if [ -d "certificates" ]; then
    echo "Backing up certificates..."
    cp -r certificates certificates.bak
fi

# Stash any local changes
echo "Stashing any local changes..."
git stash

# Reset and clean the working directory (excluding certificates and update script)
echo "Resetting and cleaning working directory..."
git reset --hard
git clean -fd -e certificates/ -e "*.key" -e "*.crt" -e "update.sh"

# Fetch all changes
echo "Fetching all changes..."
git fetch origin

# Reset to match remote main exactly
echo "Resetting to origin/main..."
git reset --hard origin/main

# Restore certificates if they were backed up
if [ -d "certificates.bak" ]; then
    echo "Restoring certificates..."
    rm -rf certificates
    mv certificates.bak certificates
fi

# Install dependencies and ignore package-lock changes
echo "Installing dependencies..."
npm install
git checkout -- package-lock.json

# Find the current server process
SERVER_PID=$(netstat -tulpn 2>/dev/null | grep :3443 | awk '{print $7}' | cut -d'/' -f1)

if [ ! -z "$SERVER_PID" ]; then
    echo "Stopping current server (PID: $SERVER_PID)..."
    kill $SERVER_PID
    sleep 2
fi

# Start the server in the background
echo "Starting server..."
nohup npm run dev:https > server.log 2>&1 &

echo "Update complete! Server restarting..."
echo "You can check server.log for startup progress"