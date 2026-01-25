  /* eslint-disable @typescript-eslint/no-unsafe-assignment */
  /* eslint-disable @typescript-eslint/no-unsafe-call */
  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  import { Injectable } from '@nestjs/common';
  import { ConfigService } from '@nestjs/config';
  import { v2 as cloudinary } from 'cloudinary';
  import { Readable } from 'stream';
  import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
  export interface UploadFile {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  }

  export interface UploadedFileInfo {
    url: string;
    provider: 'cloudinary' | 's3';
    storageKey: string;
  }

  @Injectable()
  export class StorageService {
    private readonly provider: 'cloudinary' | 's3';
    private readonly s3Client?: S3Client;
    private readonly s3Bucket?: string;
    private readonly cloudinaryConfigured: boolean;

    constructor(private readonly config: ConfigService) {
      const env = this.config.get<string>('NODE_ENV') ?? 'development';
      this.provider = env === 'production' ? 's3' : 'cloudinary';

      if (this.provider === 'cloudinary') {
        const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
        const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
        const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');
        this.cloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);
        if (cloudName && apiKey && apiSecret) {
          cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
          });
        }
      } else {
        const region = this.config.get<string>('AWS_REGION');
        const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID');
        const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');
        const bucket = this.config.get<string>('AWS_S3_BUCKET');
        this.cloudinaryConfigured = false;
        if (region && accessKeyId && secretAccessKey && bucket) {
          this.s3Bucket = bucket;
          this.s3Client = new S3Client({
            region,
            credentials: { accessKeyId, secretAccessKey },
          });
        }
      }
    }

    async uploadFile(
      file: UploadFile,
      prefix: string,
    ): Promise<UploadedFileInfo> {
      if (this.provider === 'cloudinary') {
        if (!this.cloudinaryConfigured) {
          throw new Error('Cloudinary credentials are not configured');
        }
        return this.uploadToCloudinary(file, prefix);
      }
      return this.uploadToS3(file, prefix);
    }

    private async uploadToCloudinary(
      file: UploadFile,
      prefix: string,
    ): Promise<UploadedFileInfo> {
      const result = await new Promise<{
        secure_url: string;
        public_id: string;
      }>((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
          { folder: prefix, resource_type: 'auto' },
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
      });

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
        throw new Error('S3 is not configured');
      }
      const safeName = file.originalname.replace(/\s+/g, '-');
      const storageKey = `${prefix}/${Date.now()}-${safeName}`;
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: storageKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
      const region = this.config.get<string>('AWS_REGION');
      const url = `https://${this.s3Bucket}.s3.${region}.amazonaws.com/${storageKey}`;
      return { url, provider: 's3', storageKey };
    }
  }
