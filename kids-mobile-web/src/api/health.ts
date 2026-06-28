import { useQuery } from "@tanstack/react-query";
import { api } from "./http";

export type Allergy = {
  id: string;
  studentId: string;
  allergen: string;
  note?: string | null;
};

export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH";

export type Incident = {
  id: string;
  studentId: string;
  date: string;
  type: string;
  severity: IncidentSeverity;
  description: string;
  actionTaken?: string | null;
  student?: { id: string; fullName: string };
};

export const healthKeys = {
  allergies: (studentId?: string) => ["allergies", studentId] as const,
  incidents: (studentId?: string) => ["incidents", studentId] as const,
};

export function listAllergies(studentId: string) {
  return api.get<Allergy[]>(`/allergies/student/${studentId}`);
}

export function listIncidents(studentId: string) {
  return api.get<Incident[]>(`/incidents/student/${studentId}`);
}

export function useAllergies(studentId?: string) {
  return useQuery({
    queryKey: healthKeys.allergies(studentId),
    queryFn: () => listAllergies(studentId!),
    enabled: !!studentId,
  });
}

export function useIncidents(studentId?: string) {
  return useQuery({
    queryKey: healthKeys.incidents(studentId),
    queryFn: () => listIncidents(studentId!),
    enabled: !!studentId,
  });
}

