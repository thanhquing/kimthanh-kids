import type { ID, Timestamped } from './common';

export interface SchoolDTO extends Timestamped {
  id: ID;
  name: string;
  code: string;
  address: string;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
}

export interface ClassroomDTO extends Timestamped {
  id: ID;
  schoolId: ID;
  name: string;
  ageGroup: string;
  capacity: number;
  homeroomTeacherId: ID | null;
}
