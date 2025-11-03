/**
 * S3 Backup Service
 * 
 * Automatically creates a compressed zip of the mc folder and uploads to S3
 * Runs every 10 minutes
 */

import { S3Client, PutObjectCommand, CreateBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';

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

class S3BackupService {
  private s3Client: S3Client;
  private backupInterval: NodeJS.Timeout | null = null;
  private isBackupRunning = false;
  private mcFolderPath: string = '';
  private tempZipPath: string = '';

  constructor() {
    this.s3Client = new S3Client(S3_CONFIG);
  }

  /**
   * Initialize the backup service
   */
  async initialize(mcPath: string): Promise<void> {
    this.mcFolderPath = mcPath;
    this.tempZipPath = path.join('/tmp', ZIP_NAME);
    
    console.log('[S3Backup] Initializing backup service...');
    console.log(`[S3Backup] MC folder: ${this.mcFolderPath}`);
    console.log(`[S3Backup] Temp zip: ${this.tempZipPath}`);
    console.log(`[S3Backup] Interval: ${BACKUP_INTERVAL / 1000 / 60} minutes`);

    // Test S3 connection and ensure bucket exists
    try {
      await this.ensureBucket();
      console.log('[S3Backup] S3 connection successful');
    } catch (error) {
      console.error('[S3Backup] S3 connection failed:', error);
      throw error;
    }
  }

  /**
   * Ensure bucket exists, create if not
   */
  private async ensureBucket(): Promise<void> {
    try {
      const listCommand = new ListBucketsCommand({});
      const response = await this.s3Client.send(listCommand);
      
      const bucketExists = response.Buckets?.some(b => b.Name === BUCKET_NAME);
      
      if (!bucketExists) {
        console.log(`[S3Backup] Bucket "${BUCKET_NAME}" does not exist, creating...`);
        const createCommand = new CreateBucketCommand({ Bucket: BUCKET_NAME });
        await this.s3Client.send(createCommand);
        console.log(`[S3Backup] Bucket "${BUCKET_NAME}" created`);
      } else {
        console.log(`[S3Backup] Bucket "${BUCKET_NAME}" exists`);
      }
    } catch (error: any) {
      console.error('[S3Backup] Error checking/creating bucket:', error);
      throw error;
    }
  }

  /**
   * Start automatic backups
   */
  startAutoBackup(): void {
    if (this.backupInterval) {
      console.log('[S3Backup] Auto backup already running');
      return;
    }

    console.log('[S3Backup] Starting automatic backups...');

    // Run initial backup after a short delay
    setTimeout(() => this.performBackup(), 5000);

    // Schedule periodic backups
    this.backupInterval = setInterval(() => {
      this.performBackup();
    }, BACKUP_INTERVAL);
  }

  /**
   * Stop automatic backups
   */
  stopAutoBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      console.log('[S3Backup] Automatic backups stopped');
    }
  }

  /**
   * Create a compressed zip of the mc folder
   */
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
        console.log(`[S3Backup] Zip created: ${this.formatBytes(totalBytes)}`);
        resolve({ path: this.tempZipPath, size: totalBytes });
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn('[S3Backup] Warning:', err);
        } else {
          reject(err);
        }
      });

      archive.pipe(output);

      // Add the entire mc folder to the zip
      archive.directory(this.mcFolderPath, false);

      archive.finalize();
    });
  }

  /**
   * Upload zip file to S3
   */
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

  /**
   * Delete local zip file
   */
  private deleteLocalZip(): void {
    try {
      if (fs.existsSync(this.tempZipPath)) {
        fs.unlinkSync(this.tempZipPath);
        console.log('[S3Backup] Local zip file deleted');
      }
    } catch (error) {
      console.error('[S3Backup] Failed to delete local zip:', error);
    }
  }

  /**
   * Perform backup
   */
  private async performBackup(): Promise<void> {
    if (this.isBackupRunning) {
      console.log('[S3Backup] Backup already in progress, skipping...');
      return;
    }

    this.isBackupRunning = true;
    const startTime = Date.now();

    try {
      console.log('[S3Backup] ═══════════════════════════════════════');
      console.log('[S3Backup] Starting backup at', new Date().toLocaleString());

      // Check if mc folder exists
      if (!fs.existsSync(this.mcFolderPath)) {
        console.log('[S3Backup] MC folder does not exist, skipping backup');
        return;
      }

      // Step 1: Create compressed zip
      console.log('[S3Backup] Creating compressed zip...');
      const { size } = await this.createZip();

      // Step 2: Upload to S3
      console.log('[S3Backup] Uploading to S3...');
      await this.uploadZip(this.tempZipPath);
      console.log(`[S3Backup] Uploaded to s3://${BUCKET_NAME}/${ZIP_NAME}`);

      // Step 3: Delete local zip
      console.log('[S3Backup] Cleaning up...');
      this.deleteLocalZip();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('[S3Backup] ✓ Backup completed successfully');
      console.log(`[S3Backup]   Duration: ${duration}s`);
      console.log(`[S3Backup]   Size: ${this.formatBytes(size)}`);
      console.log(`[S3Backup]   Next backup: ${new Date(Date.now() + BACKUP_INTERVAL).toLocaleTimeString()}`);
      console.log('[S3Backup] ═══════════════════════════════════════');
    } catch (error) {
      console.error('[S3Backup] ✗ Backup failed:', error);
      // Try to clean up zip file even on error
      this.deleteLocalZip();
    } finally {
      this.isBackupRunning = false;
    }
  }

  /**
   * Manually trigger a backup
   */
  async manualBackup(): Promise<void> {
    console.log('[S3Backup] Manual backup triggered');
    await this.performBackup();
  }

  /**
   * Get backup status
   */
  getStatus(): { running: boolean; interval: number } {
    return {
      running: this.backupInterval !== null,
      interval: BACKUP_INTERVAL / 1000 / 60,
    };
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

// Export singleton instance
export const s3BackupService = new S3BackupService();
