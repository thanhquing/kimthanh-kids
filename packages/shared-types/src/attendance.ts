import type { ID, Timestamped } from './common';
import type { AttendanceStatus } from './enums';

export interface AttendanceDTO extends Timestamped {
  id: ID;
  studentId: ID;
  classroomId: ID;
  date: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  note: string | null;
  recordedById: ID;
}

export interface MarkAttendanceRequest {
  studentId: ID;
  classroomId: ID;
  date: string;
  status: AttendanceStatus;
  checkInAt?: string;
  checkOutAt?: string;
  note?: string;
}
