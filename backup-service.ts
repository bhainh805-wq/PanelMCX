/**
 * Standalone S3 Backup Service
 * 
 * Automatically uploads the mc folder to IDrive e2 S3-compatible storage
 * Runs every 10 minutes
 * 
 * Usage: ts-node backup-service.ts
 * Or: node backup-service.js (after compilation)
 */

import { S3Client, PutObjectCommand, ListObjectsV2Command, CreateBucketCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { getConfig } from './src/config';

// S3 Configuration
const S3_CONFIG = {
  endpoint: 'https://s3.ap-southeast-1.idrivee2.com',
  region: 'ap-southeast-1',
  credentials: {
    accessKeyId: 'GXsZlvMvnSJwYn1UDoXN',
    secretAccessKey: 'xpNhjxjaHUBZAhO16nJl73yJrDIQhBhjemdh8E2R',
  },
  forcePathStyle: true,
};

const BUCKET_NAME = 'mc';
const BACKUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

class BackupService {
  private s3Client: S3Client;
  private mcFolderPath: string = '';
  private isBackupRunning = false;
  private backupCount = 0;

  constructor() {
    this.s3Client = new S3Client(S3_CONFIG);
  }

  async initialize(): Promise<void> {
    console.log('='.repeat(60));
    console.log('S3 Backup Service Starting...');
    console.log('='.repeat(60));

    // Get MC folder path from config
    try {
      const config = await getConfig();
      this.mcFolderPath = config.MC_DIR || path.join(process.cwd(), 'mc');
      console.log(`✓ MC folder path: ${this.mcFolderPath}`);
    } catch (error) {
      console.error('✗ Failed to load config, using default path');
      this.mcFolderPath = path.join(process.cwd(), 'mc');
    }

    // Check if folder exists
    if (!fs.existsSync(this.mcFolderPath)) {
      console.error(`✗ MC folder does not exist: ${this.mcFolderPath}`);
      process.exit(1);
    }

    console.log(`✓ MC folder exists`);
    console.log(`✓ Backup interval: ${BACKUP_INTERVAL / 1000 / 60} minutes`);
    console.log(`✓ S3 Endpoint: ${S3_CONFIG.endpoint}`);
    console.log(`✓ Bucket: ${BUCKET_NAME}`);

    // Test S3 connection and create bucket if needed
    await this.ensureBucket();
    console.log('✓ S3 connection successful');
    console.log('='.repeat(60));
  }

  private async ensureBucket(): Promise<void> {
    try {
      // Try to list objects (this will fail if bucket doesn't exist)
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        MaxKeys: 1,
      });
      await this.s3Client.send(command);
      console.log(`✓ Bucket "${BUCKET_NAME}" exists`);
    } catch (error: any) {
      if (error.name === 'NoSuchBucket') {
        console.log(`⚠ Bucket "${BUCKET_NAME}" does not exist, creating...`);
        try {
          const createCommand = new CreateBucketCommand({
            Bucket: BUCKET_NAME,
          });
          await this.s3Client.send(createCommand);
          console.log(`✓ Bucket "${BUCKET_NAME}" created successfully`);
        } catch (createError) {
          console.error('✗ Failed to create bucket:', createError);
          throw createError;
        }
      } else {
        throw error;
      }
    }
  }

  async start(): Promise<void> {
    console.log('\n🚀 Starting automatic backups...\n');

    // Run initial backup
    await this.performBackup();

    // Schedule periodic backups
    setInterval(async () => {
      await this.performBackup();
    }, BACKUP_INTERVAL);

    console.log('✓ Backup service is running');
    console.log(`  Next backup in ${BACKUP_INTERVAL / 1000 / 60} minutes`);
    console.log('  Press Ctrl+C to stop\n');
  }

  private async performBackup(): Promise<void> {
    if (this.isBackupRunning) {
      console.log('⚠ Backup already in progress, skipping...');
      return;
    }

    this.isBackupRunning = true;
    this.backupCount++;
    const startTime = Date.now();

    try {
      console.log('─'.repeat(60));
      console.log(`📦 Backup #${this.backupCount} started at ${new Date().toLocaleString()}`);
      console.log('─'.repeat(60));

      // Check if folder still exists
      if (!fs.existsSync(this.mcFolderPath)) {
        console.log('✗ MC folder does not exist, skipping backup');
        return;
      }

      // Create timestamp for this backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
      const backupPrefix = `backup-${timestamp}/`;

      console.log(`📁 Scanning folder: ${this.mcFolderPath}`);
      
      // Get all files
      const files = await this.getAllFiles(this.mcFolderPath);
      console.log(`✓ Found ${files.length} files to upload`);

      if (files.length === 0) {
        console.log('⚠ No files to backup');
        return;
      }

      let uploadedCount = 0;
      let failedCount = 0;
      let totalBytes = 0;

      // Upload each file
      for (const filePath of files) {
        try {
          const relativePath = path.relative(this.mcFolderPath, filePath);
          const s3Key = `${backupPrefix}${relativePath}`;
          
          const stats = await fs.promises.stat(filePath);
          totalBytes += stats.size;

          await this.uploadFile(filePath, s3Key);
          uploadedCount++;

          // Log progress every 10 files
          if (uploadedCount % 10 === 0) {
            console.log(`  ↑ Progress: ${uploadedCount}/${files.length} files (${this.formatBytes(totalBytes)})`);
          }
        } catch (error) {
          console.error(`  ✗ Failed: ${path.basename(filePath)}`);
          failedCount++;
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log('─'.repeat(60));
      console.log(`✓ Backup completed in ${duration}s`);
      console.log(`  • Uploaded: ${uploadedCount} files`);
      console.log(`  • Failed: ${failedCount} files`);
      console.log(`  • Total size: ${this.formatBytes(totalBytes)}`);
      console.log(`  • S3 path: s3://${BUCKET_NAME}/${backupPrefix}`);
      console.log('─'.repeat(60));
      console.log(`⏰ Next backup at ${new Date(Date.now() + BACKUP_INTERVAL).toLocaleTimeString()}\n`);

    } catch (error) {
      console.error('✗ Backup failed:', error);
    } finally {
      this.isBackupRunning = false;
    }
  }

  private async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const items = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);

        // Skip certain directories
        if (item.isDirectory()) {
          // Skip cache and temp directories
          if (item.name === 'cache' || item.name === 'logs') {
            continue;
          }
          const subFiles = await this.getAllFiles(fullPath);
          files.push(...subFiles);
        } else if (item.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }

    return files;
  }

  private async uploadFile(filePath: string, s3Key: string): Promise<void> {
    const fileContent = await fs.promises.readFile(filePath);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
    });

    await this.s3Client.send(command);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

// Main execution
async function main() {
  const service = new BackupService();

  try {
    await service.initialize();
    await service.start();
  } catch (error) {
    console.error('\n✗ Fatal error:', error);
    process.exit(1);
  }

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down backup service...');
    console.log('✓ Goodbye!\n');
    process.exit(0);
  });
}

// Run the service
main();
