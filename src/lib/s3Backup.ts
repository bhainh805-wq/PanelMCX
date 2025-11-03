/**
 * S3 Backup Service
 * 
 * Automatically uploads the mc folder to IDrive e2 S3-compatible storage
 * Runs every 10 minutes
 */

import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// S3 Configuration
const S3_CONFIG = {
  endpoint: 'https://s3.ap-southeast-1.idrivee2.com',
  region: 'ap-southeast-1',
  credentials: {
    accessKeyId: 'GXsZlvMvnSJwYn1UDoXN',
    secretAccessKey: 'xpNhjxjaHUBZAhO16nJl73yJrDIQhBhjemdh8E2R',
  },
  forcePathStyle: true, // Required for S3-compatible services
};

const BUCKET_NAME = 'mc'; // Bucket name same as folder name
const BACKUP_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

class S3BackupService {
  private s3Client: S3Client;
  private backupInterval: NodeJS.Timeout | null = null;
  private isBackupRunning = false;
  private mcFolderPath: string = '';

  constructor() {
    this.s3Client = new S3Client(S3_CONFIG);
  }

  /**
   * Initialize the backup service
   */
  async initialize(mcPath: string): Promise<void> {
    this.mcFolderPath = mcPath;
    console.log('[S3Backup] Initializing backup service...');
    console.log(`[S3Backup] MC folder path: ${this.mcFolderPath}`);
    console.log(`[S3Backup] Backup interval: ${BACKUP_INTERVAL / 1000 / 60} minutes`);

    // Test S3 connection
    try {
      await this.testConnection();
      console.log('[S3Backup] S3 connection successful');
    } catch (error) {
      console.error('[S3Backup] S3 connection failed:', error);
      throw error;
    }
  }

  /**
   * Test S3 connection
   */
  private async testConnection(): Promise<void> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        MaxKeys: 1,
      });
      await this.s3Client.send(command);
    } catch (error: any) {
      if (error.name === 'NoSuchBucket') {
        console.log('[S3Backup] Bucket does not exist. Please create bucket "mc" manually.');
      }
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

    // Run initial backup
    this.performBackup();

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
   * Perform backup of mc folder
   */
  private async performBackup(): Promise<void> {
    if (this.isBackupRunning) {
      console.log('[S3Backup] Backup already in progress, skipping...');
      return;
    }

    this.isBackupRunning = true;
    const startTime = Date.now();

    try {
      console.log('[S3Backup] Starting backup...');

      // Check if mc folder exists
      if (!fs.existsSync(this.mcFolderPath)) {
        console.log('[S3Backup] MC folder does not exist, skipping backup');
        return;
      }

      // Create a timestamp for this backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPrefix = `backup-${timestamp}/`;

      // Get all files in mc folder recursively
      const files = await this.getAllFiles(this.mcFolderPath);
      console.log(`[S3Backup] Found ${files.length} files to upload`);

      let uploadedCount = 0;
      let failedCount = 0;

      // Upload each file
      for (const filePath of files) {
        try {
          const relativePath = path.relative(this.mcFolderPath, filePath);
          const s3Key = `${backupPrefix}${relativePath}`;

          await this.uploadFile(filePath, s3Key);
          uploadedCount++;

          // Log progress every 10 files
          if (uploadedCount % 10 === 0) {
            console.log(`[S3Backup] Progress: ${uploadedCount}/${files.length} files uploaded`);
          }
        } catch (error) {
          console.error(`[S3Backup] Failed to upload ${filePath}:`, error);
          failedCount++;
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[S3Backup] Backup completed in ${duration}s`);
      console.log(`[S3Backup] Uploaded: ${uploadedCount}, Failed: ${failedCount}`);
    } catch (error) {
      console.error('[S3Backup] Backup failed:', error);
    } finally {
      this.isBackupRunning = false;
    }
  }

  /**
   * Get all files in a directory recursively
   */
  private async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    const items = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        // Recursively get files from subdirectories
        const subFiles = await this.getAllFiles(fullPath);
        files.push(...subFiles);
      } else if (item.isFile()) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Upload a single file to S3
   */
  private async uploadFile(filePath: string, s3Key: string): Promise<void> {
    const fileContent = await fs.promises.readFile(filePath);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
    });

    await this.s3Client.send(command);
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
      interval: BACKUP_INTERVAL / 1000 / 60, // in minutes
    };
  }
}

// Export singleton instance
export const s3BackupService = new S3BackupService();
