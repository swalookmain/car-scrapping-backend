import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import type { StorageProviderType } from 'src/config/storage.config';

export interface UploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface UploadedFileInfo {
  url: string;
  provider: StorageProviderType;
  storageKey: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly provider: StorageProviderType;
  private readonly s3Client?: S3Client;
  private readonly s3Bucket?: string;
  private readonly s3PublicBaseUrl?: string;
  private cloudinaryReady = false;

  constructor(private readonly config: ConfigService) {
    this.provider =
      this.config.get<StorageProviderType>('storage.provider') ?? 'cloudinary';

    if (this.provider === 'cloudinary') {
      const cloudName = this.config.get<string>('storage.cloudinary.cloudName');
      const apiKey = this.config.get<string>('storage.cloudinary.apiKey');
      const apiSecret = this.config.get<string>('storage.cloudinary.apiSecret');
      this.cloudinaryReady = Boolean(cloudName && apiKey && apiSecret);
      if (cloudName && apiKey && apiSecret) {
        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
        });
        this.cloudinaryReady = true;
      }
    } else {
      const region = this.config.get<string>('storage.s3.region');
      const accessKeyId = this.config.get<string>('storage.s3.accessKeyId');
      const secretAccessKey = this.config.get<string>('storage.s3.secretAccessKey');
      const bucket = this.config.get<string>('storage.s3.bucket');
      this.s3PublicBaseUrl = this.config.get<string>('storage.s3.publicBaseUrl');
      if (region && accessKeyId && secretAccessKey && bucket) {
        this.s3Bucket = bucket;
        this.s3Client = new S3Client({
          region,
          credentials: { accessKeyId, secretAccessKey },
        });
      }
    }
  }

  onModuleInit() {
    if (this.provider === 'cloudinary') {
      if (this.cloudinaryReady) {
        this.logger.log('Storage provider: Cloudinary (staging/dev)');
      } else {
        this.logger.warn(
          'Cloudinary selected but CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET is missing — uploads will fail until configured.',
        );
      }
      return;
    }

    if (this.s3Client && this.s3Bucket) {
      this.logger.log(`Storage provider: S3 (bucket: ${this.s3Bucket})`);
    } else {
      this.logger.warn(
        'S3 selected but AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, or AWS_BUCKET_NAME is missing — uploads will fail until configured.',
      );
    }
  }

  getProvider(): StorageProviderType {
    return this.provider;
  }

  isReady(): boolean {
    return this.provider === 'cloudinary'
      ? this.cloudinaryReady
      : Boolean(this.s3Client && this.s3Bucket);
  }

  async uploadFile(file: UploadFile, prefix: string): Promise<UploadedFileInfo> {
    if (!this.isReady()) {
      throw new InternalServerErrorException(
        `Storage provider "${this.provider}" is not configured. Check environment variables.`,
      );
    }

    if (this.provider === 'cloudinary') {
      return this.uploadToCloudinary(file, prefix);
    }
    return this.uploadToS3(file, prefix);
  }

  async deleteFile(storageKey: string): Promise<void> {
    if (!storageKey) return;
    if (!this.isReady()) {
      this.logger.warn('deleteFile called but storage not configured — skipping');
      return;
    }

    try {
      if (this.provider === 'cloudinary') {
        await this.deleteFromCloudinary(storageKey);
      } else {
        await this.deleteFromS3(storageKey);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown delete error';
      this.logger.error(`Failed to delete ${storageKey}: ${message}`);
    }
  }

  private async deleteFromCloudinary(publicId: string): Promise<void> {
    const uploader = cloudinary.uploader as any;
    await uploader.destroy(publicId, { invalidate: true });
    await uploader.destroy(publicId, { resource_type: 'raw', invalidate: true });
  }

  private async deleteFromS3(key: string): Promise<void> {
    if (!this.s3Client || !this.s3Bucket) return;
    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: this.s3Bucket, Key: key }),
    );
  }

  private sanitizePrefix(prefix: string): string {
    return prefix.replace(/[^a-zA-Z0-9/_-]/g, '-').replace(/\/+/g, '/');
  }

  private async uploadToCloudinary(
    file: UploadFile,
    prefix: string,
  ): Promise<UploadedFileInfo> {
    const folder = this.sanitizePrefix(prefix);

    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
          },
          (error, uploadResult) => {
            if (error || !uploadResult) {
              const reason =
                error instanceof Error
                  ? error
                  : new Error('Cloudinary upload failed');
              return reject(reason);
            }
            resolve(uploadResult as { secure_url: string; public_id: string });
          },
        );
        Readable.from(file.buffer).pipe(upload);
      },
    );

    return {
      url: result.secure_url,
      provider: 'cloudinary',
      storageKey: result.public_id,
    };
  }

  private async uploadToS3(
    file: UploadFile,
    prefix: string,
  ): Promise<UploadedFileInfo> {
    if (!this.s3Client || !this.s3Bucket) {
      throw new InternalServerErrorException('S3 is not configured');
    }

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-');
    const storageKey = `${this.sanitizePrefix(prefix)}/${Date.now()}-${safeName}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: storageKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const region = this.config.get<string>('storage.s3.region');
    const url =
      this.s3PublicBaseUrl?.replace(/\/$/, '') ??
      `https://${this.s3Bucket}.s3.${region}.amazonaws.com`;

    return {
      url: `${url}/${storageKey}`,
      provider: 's3',
      storageKey,
    };
  }
}
