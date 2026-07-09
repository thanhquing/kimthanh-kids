import { useMutation, useQuery } from "@tanstack/react-query";
import { api, type PageParams } from "./http";

export type PickupAuthorizationStatus = "ACTIVE" | "REVOKED";
export type PickupEventType = "CHECK_IN" | "CHECK_OUT";

export type PickupAuthorization = {
  id: string;
  studentId: string;
  guardianName: string;
  guardianPhone: string;
  relationship?: string | null;
  note?: string | null;
  status: PickupAuthorizationStatus;
  student?: { id: string; fullName: string; classroom?: { id: string; name: string } | null };
};

export type PickupLog = {
  id: string;
  studentId: string;
  authorizationId?: string | null;
  eventType: PickupEventType;
  guardianName: string;
  guardianPhone?: string | null;
  note?: string | null;
  occurredAt: string;
  student?: { id: string; fullName: string; classroom?: { id: string; name: string } | null };
};

export const pickupKeys = {
  all: ["pickup"] as const,
  authorizations: (studentId?: string) => [...pickupKeys.all, "authorizations", studentId] as const,
  logs: (studentId?: string) => [...pickupKeys.all, "logs", studentId] as const,
};

export function listPickupAuthorizations(studentId?: string) {
  return api.get<PickupAuthorization[]>("/pickup/authorizations", {
    query: { studentId, status: "ACTIVE" },
  });
}

export function listPickupAuthorizationsPage(studentId: string | undefined, params: PageParams) {
  return api.getPage<PickupAuthorization>("/pickup/authorizations", {
    query: { ...params, studentId, status: "ACTIVE" },
  });
}

export function listPickupLogs(studentId?: string) {
  return api.get<PickupLog[]>("/pickup/logs", { query: { studentId } });
}

export function listPickupLogsPage(studentId: string | undefined, params: PageParams) {
  return api.getPage<PickupLog>("/pickup/logs", { query: { ...params, studentId } });
}

export function createPickupLog(input: {
  authorizationId: string;
  eventType: PickupEventType;
  note?: string;
}) {
  return api.post<PickupLog>("/pickup/logs", input);
}

export function usePickupAuthorizations(studentId?: string) {
  return useQuery({
    queryKey: pickupKeys.authorizations(studentId),
    queryFn: () => listPickupAuthorizations(studentId),
    enabled: Boolean(studentId),
  });
}

export function usePickupLogs(studentId?: string) {
  return useQuery({
    queryKey: pickupKeys.logs(studentId),
    queryFn: () => listPickupLogs(studentId),
    enabled: Boolean(studentId),
  });
}

export function useCreatePickupLog() {
  return useMutation({ mutationFn: createPickupLog });
}
