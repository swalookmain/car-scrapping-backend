import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import type { UploadFile } from 'src/common/services/storage.service';

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const;

const ALLOWED_DOCUMENT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

/** Maximum file size for image/PDF uploads: 5 MB */
export const MAX_DOCUMENT_FILE_SIZE = 5 * 1024 * 1024;

export const DOCUMENT_FILE_FILTER: MulterOptions['fileFilter'] = (
  _req,
  file,
  callback,
) => {
  if (ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number])) {
    callback(null, true);
    return;
  }

  callback(
    new BadRequestException(
      'Only JPEG, PNG, and PDF documents are supported',
    ),
    false,
  );
};

/**
 * Reusable multer options for all document/image upload endpoints.
 * Includes: memoryStorage, MIME type filter, 5 MB size limit.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
export const DOCUMENT_UPLOAD_OPTIONS: MulterOptions = {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  storage: memoryStorage() as MulterOptions['storage'],
  fileFilter: DOCUMENT_FILE_FILTER,
  limits: { fileSize: MAX_DOCUMENT_FILE_SIZE },
};

export function assertSupportedDocumentFile(file: UploadFile) {
  if (
    ALLOWED_DOCUMENT_MIME_TYPES.includes(
      file.mimetype as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number],
    )
  ) {
    return;
  }

  const extension = file.originalname
    .slice(file.originalname.lastIndexOf('.'))
    .toLowerCase();

  if (ALLOWED_DOCUMENT_EXTENSIONS.includes(extension)) {
    return;
  }

  throw new BadRequestException(
    `Unsupported document "${file.originalname}". Only JPEG, PNG, and PDF files are allowed`,
  );
}
