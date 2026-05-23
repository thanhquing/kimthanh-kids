import type { ID, Timestamped } from './common';
import type { Gender } from './enums';

export interface StudentDTO extends Timestamped {
  id: ID;
  schoolId: ID;
  classroomId: ID | null;
  fullName: string;
  nickname: string | null;
  dateOfBirth: string;
  gender: Gender;
  avatarUrl: string | null;
  parentIds: ID[];
}
