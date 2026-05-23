import type { ID, Timestamped } from './common';
import type { AnnouncementAudience } from './enums';

export interface AnnouncementDTO extends Timestamped {
  id: ID;
  schoolId: ID;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  classroomId: ID | null;
  publishedAt: string | null;
  authorId: ID;
}

export interface CreateAnnouncementRequest {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  classroomId?: ID;
  publishedAt?: string;
}
