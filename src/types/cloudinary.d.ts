declare module 'cloudinary' {
  export interface UploadResult {
    secure_url: string;
    public_id: string;
  }

  export interface UploadStreamOptions {
    folder?: string;
    resource_type?: 'auto' | 'image' | 'video' | 'raw';
  }

  export interface UploadResponseCallback {
    (error?: Error, result?: UploadResult): void;
  }

  export interface Uploader {
    upload_stream(
      options: UploadStreamOptions,
      callback: UploadResponseCallback,
    ): NodeJS.WritableStream;
  }

  export interface CloudinaryV2 {
    config(options: {
      cloud_name: string;
      api_key: string;
      api_secret: string;
    }): void;
    uploader: Uploader;
  }

  export const v2: CloudinaryV2;
}
