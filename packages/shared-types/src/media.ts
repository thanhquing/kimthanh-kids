import type { ID, Timestamped } from './common';
import type { MediaType } from './enums';

export interface MediaDTO extends Timestamped {
  id: ID;
  type: MediaType;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  uploadedById: ID;
  studentIds: ID[];
  classroomId: ID | null;
}
