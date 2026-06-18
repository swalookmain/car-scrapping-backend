export type StorageProviderType = 'cloudinary' | 's3';

export default () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const explicit = process.env.STORAGE_PROVIDER as StorageProviderType | undefined;

  let provider: StorageProviderType = 'cloudinary';
  if (explicit === 's3' || explicit === 'cloudinary') {
    provider = explicit;
  } else if (nodeEnv === 'production') {
    provider = 's3';
  }

  return {
    storage: {
      provider,
      cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
      },
      s3: {
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        bucket: process.env.AWS_S3_BUCKET,
        publicBaseUrl: process.env.AWS_S3_PUBLIC_BASE_URL,
      },
    },
  };
};
