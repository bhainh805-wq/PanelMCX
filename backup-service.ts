/**
 * Standalone S3 Backup Service
 * 
 * Creates a compressed zip of the mc folder and uploads to S3
 * Runs every 10 minutes
 * 
 * Usage: ts-node backup-service.ts
 */

import { S3Client, PutObjectCommand, CreateBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
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

const BUCKET_NAME = 'test';
const ZIP_NAME = 'mc.zip';
const BACKUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

class BackupService {
  private s3Client: S3Client;
  private mcFolderPath: string = '';
  private tempZipPath: string = '';
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

    this.tempZipPath = path.join(process.cwd(), ZIP_NAME);

    // Check if folder exists
    if (!fs.existsSync(this.mcFolderPath)) {
      console.error(`✗ MC folder does not exist: ${this.mcFolderPath}`);
      process.exit(1);
    }

    console.log(`✓ MC folder exists`);
    console.log(`✓ Temp zip path: ${this.tempZipPath}`);
    console.log(`✓ Backup interval: ${BACKUP_INTERVAL / 1000 / 60} minutes`);
    console.log(`✓ S3 Endpoint: ${S3_CONFIG.endpoint}`);
    console.log(`✓ Bucket: ${BUCKET_NAME}`);
    console.log(`✓ Zip name: ${ZIP_NAME}`);

    // Ensure bucket exists
    await this.ensureBucket();
    console.log('✓ S3 connection successful');
    console.log('='.repeat(60));
  }

  private async ensureBucket(): Promise<void> {
    try {
      const listCommand = new ListBucketsCommand({});
      const response = await this.s3Client.send(listCommand);
      
      const bucketExists = response.Buckets?.some(b => b.Name === BUCKET_NAME);
      
      if (!bucketExists) {
        console.log(`⚠ Bucket "${BUCKET_NAME}" does not exist, creating...`);
        const createCommand = new CreateBucketCommand({ Bucket: BUCKET_NAME });
        await this.s3Client.send(createCommand);
        console.log(`✓ Bucket "${BUCKET_NAME}" created successfully`);
      } else {
        console.log(`✓ Bucket "${BUCKET_NAME}" exists`);
      }
    } catch (error) {
      console.error('✗ Failed to check/create bucket:', error);
      throw error;
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

  private async createZip(): Promise<{ path: string; size: number }> {
    return new Promise((resolve, reject) => {
      // Remove old zip if exists
      if (fs.existsSync(this.tempZipPath)) {
        fs.unlinkSync(this.tempZipPath);
      }

      const output = fs.createWriteStream(this.tempZipPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      let totalBytes = 0;

      output.on('close', () => {
        totalBytes = archive.pointer();
        resolve({ path: this.tempZipPath, size: totalBytes });
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn('  ⚠ Warning:', err.message);
        } else {
          reject(err);
        }
      });

      archive.pipe(output);
      archive.directory(this.mcFolderPath, false);
      archive.finalize();
    });
  }

  private async uploadZip(zipPath: string): Promise<void> {
    const fileContent = await fs.promises.readFile(zipPath);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: ZIP_NAME,
      Body: fileContent,
      ContentType: 'application/zip',
    });

    await this.s3Client.send(command);
  }

  private deleteLocalZip(): void {
    try {
      if (fs.existsSync(this.tempZipPath)) {
        fs.unlinkSync(this.tempZipPath);
      }
    } catch (error) {
      console.error('  ✗ Failed to delete local zip:', error);
    }
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

      // Step 1: Create compressed zip
      console.log('📁 Creating compressed zip...');
      const { size } = await this.createZip();
      console.log(`  ✓ Zip created: ${this.formatBytes(size)}`);

      // Step 2: Upload to S3
      console.log('☁️  Uploading to S3...');
      await this.uploadZip(this.tempZipPath);
      console.log(`  ✓ Uploaded to s3://${BUCKET_NAME}/${ZIP_NAME}`);

      // Step 3: Delete local zip
      console.log('🧹 Cleaning up...');
      this.deleteLocalZip();
      console.log('  ✓ Local zip deleted');

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log('─'.repeat(60));
      console.log(`✓ Backup completed in ${duration}s`);
      console.log(`  • Compressed size: ${this.formatBytes(size)}`);
      console.log(`  • S3 location: s3://${BUCKET_NAME}/${ZIP_NAME}`);
      console.log('─'.repeat(60));
      console.log(`⏰ Next backup at ${new Date(Date.now() + BACKUP_INTERVAL).toLocaleTimeString()}\n`);

    } catch (error) {
      console.error('✗ Backup failed:', error);
      this.deleteLocalZip();
    } finally {
      this.isBackupRunning = false;
    }
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
