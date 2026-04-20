import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import type { UploadFile } from 'src/common/services/storage.service';

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const;

const ALLOWED_DOCUMENT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

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
