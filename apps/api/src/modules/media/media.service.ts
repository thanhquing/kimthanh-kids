import { Injectable } from '@nestjs/common';

/**
 * Placeholder for media uploads. Real implementation will sign S3-compatible URLs
 * — keep this thin until storage credentials are configured.
 */
@Injectable()
export class MediaService {
  presignUpload(_mimeType: string): { uploadUrl: string; mediaId: string } {
    throw new Error('NOT_IMPLEMENTED: media upload pending storage configuration');
  }
}
