#!/usr/bin/env node

/**
 * Backup Service Runner
 * 
 * This script runs the TypeScript backup service using ts-node
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('Starting S3 Backup Service...\n');

const backupProcess = spawn('npx', ['ts-node', path.join(__dirname, 'backup-service.ts')], {
  stdio: 'inherit',
  env: process.env
});

backupProcess.on('error', (error) => {
  console.error('Failed to start backup service:', error);
  process.exit(1);
});

backupProcess.on('exit', (code) => {
  console.log(`Backup service exited with code ${code}`);
  process.exit(code || 0);
});

// Forward signals
process.on('SIGINT', () => {
  backupProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  backupProcess.kill('SIGTERM');
});
