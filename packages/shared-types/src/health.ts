import type { ID, Timestamped } from './common';
import type { MedicineRequestStatus } from './enums';

export interface MedicineRequestDTO extends Timestamped {
  id: ID;
  studentId: ID;
  requestedById: ID;
  medicineName: string;
  dosage: string;
  schedule: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: MedicineRequestStatus;
  handledById: ID | null;
  handledAt: string | null;
  note: string | null;
}

export interface CreateMedicineRequestPayload {
  studentId: ID;
  medicineName: string;
  dosage: string;
  schedule: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface HealthRecordDTO extends Timestamped {
  id: ID;
  studentId: ID;
  date: string;
  heightCm: number | null;
  weightKg: number | null;
  temperatureC: number | null;
  notes: string | null;
  recordedById: ID;
}

export interface IncidentDTO extends Timestamped {
  id: ID;
  studentId: ID;
  date: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  actionTaken: string | null;
  reportedById: ID;
}
