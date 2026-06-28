import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./http";

export type MedicineStatus = "PENDING" | "APPROVED" | "ADMINISTERED" | "REJECTED";

export type MedicineRequest = {
  id: string;
  schoolId: string;
  studentId: string;
  medicineName: string;
  dosage: string;
  schedule: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: MedicineStatus;
  handledAt?: string | null;
  createdAt: string;
  student?: { id: string; fullName: string };
  history?: Array<{
    id: string;
    status: MedicineStatus;
    note?: string | null;
    createdAt: string;
  }>;
};

export type CreateMedicineInput = {
  studentId: string;
  medicineName: string;
  dosage: string;
  schedule: string;
  startDate: string;
  endDate: string;
  reason?: string;
};

export type HandleMedicineInput = {
  id: string;
  status: MedicineStatus;
  note?: string;
};

export const medicineKeys = {
  all: ["medicine"] as const,
  list: (role: "parent" | "teacher", status?: MedicineStatus) =>
    [...medicineKeys.all, "list", role, status] as const,
  detail: (id?: string) => [...medicineKeys.all, "detail", id] as const,
};

export function listMedicine(role: "parent" | "teacher", status?: MedicineStatus) {
  if (role === "parent") return api.get<MedicineRequest[]>("/medicine/mine");
  return api.get<MedicineRequest[]>("/medicine", { query: { status } });
}

export function getMedicine(id: string) {
  return api.get<MedicineRequest>(`/medicine/${id}`);
}

export function createMedicine(input: CreateMedicineInput) {
  return api.post<MedicineRequest>("/medicine", input);
}

export function handleMedicine(input: HandleMedicineInput) {
  return api.post<MedicineRequest>(`/medicine/${input.id}/handle`, {
    status: input.status,
    note: input.note,
  });
}

export function useMedicineList(role: "parent" | "teacher", status?: MedicineStatus) {
  return useQuery({
    queryKey: medicineKeys.list(role, status),
    queryFn: () => listMedicine(role, status),
  });
}

export function useMedicineDetail(id?: string) {
  return useQuery({
    queryKey: medicineKeys.detail(id),
    queryFn: () => getMedicine(id!),
    enabled: !!id,
  });
}

export function useCreateMedicine() {
  return useMutation({ mutationFn: createMedicine });
}

export function useHandleMedicine() {
  return useMutation({ mutationFn: handleMedicine });
}

