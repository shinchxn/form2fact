import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../logger/index.ts';

export interface StorageMetadata {
  storageKey: string;
  sizeBytes: number;
  checksum: string;
  mimeType: string;
}

export interface IStorageProvider {
  save(applicationId: string, docId: string, buffer: Buffer, mimeType?: string): Promise<StorageMetadata>;
  getStream(storageKey: string): Promise<fs.ReadStream>;
  getBuffer(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<boolean>;
  exists(storageKey: string): Promise<boolean>;
  getAbsolutePath(storageKey: string): string;
}

export class LocalDiskStorageProvider implements IStorageProvider {
  private baseDir: string;

  constructor(customBaseDir?: string) {
    this.baseDir = customBaseDir || path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  public async save(applicationId: string, docId: string, buffer: Buffer, mimeType: string = 'application/pdf'): Promise<StorageMetadata> {
    const docketDir = path.join(this.baseDir, 'dockets', applicationId);
    if (!fs.existsSync(docketDir)) {
      fs.mkdirSync(docketDir, { recursive: true });
    }

    const filename = `${docId}.pdf`;
    const targetPath = path.join(docketDir, filename);
    await fs.promises.writeFile(targetPath, buffer);

    const checksum = `sha256-${crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16)}`;
    const relativeKey = `dockets/${applicationId}/${filename}`;

    logger.info('File saved to durable local storage', {
      applicationId,
      docId,
      storageKey: relativeKey,
      sizeBytes: buffer.length
    });

    return {
      storageKey: relativeKey,
      sizeBytes: buffer.length,
      checksum,
      mimeType
    };
  }

  public async getStream(storageKey: string): Promise<fs.ReadStream> {
    const fullPath = this.getAbsolutePath(storageKey);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File binary not found at storage key: ${storageKey}`);
    }
    return fs.createReadStream(fullPath);
  }

  public async getBuffer(storageKey: string): Promise<Buffer> {
    const fullPath = this.getAbsolutePath(storageKey);
    return fs.promises.readFile(fullPath);
  }

  public async delete(storageKey: string): Promise<boolean> {
    const fullPath = this.getAbsolutePath(storageKey);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      logger.info('Deleted stored document binary', { storageKey });
      return true;
    }
    return false;
  }

  public async exists(storageKey: string): Promise<boolean> {
    return fs.existsSync(this.getAbsolutePath(storageKey));
  }

  public getAbsolutePath(storageKey: string): string {
    return path.resolve(this.baseDir, storageKey);
  }
}

// Default storage provider singleton
export const storageProvider: IStorageProvider = new LocalDiskStorageProvider();

