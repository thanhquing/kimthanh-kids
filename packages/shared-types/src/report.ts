import type { ID, Timestamped } from './common';

export interface DailyReportDTO extends Timestamped {
  id: ID;
  studentId: ID;
  classroomId: ID;
  date: string;
  mood: string | null;
  meals: string | null;
  nap: string | null;
  activities: string | null;
  note: string | null;
  mediaIds: ID[];
  authorId: ID;
}

export interface CreateDailyReportRequest {
  studentId: ID;
  classroomId: ID;
  date: string;
  mood?: string;
  meals?: string;
  nap?: string;
  activities?: string;
  note?: string;
  mediaIds?: ID[];
}
