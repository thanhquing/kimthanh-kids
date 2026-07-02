import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./http";

export type LeaveType = "SICK" | "FAMILY" | "OTHER";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export type LeaveRequest = {
  id: string;
  studentId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: LeaveStatus;
  decisionNote?: string | null;
  student?: { id: string; fullName: string };
};

export type CreateLeaveInput = {
  studentId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
};

export const leaveKeys = {
  all: ["leave"] as const,
  mine: () => [...leaveKeys.all, "mine"] as const,
  staff: (status?: LeaveStatus) => [...leaveKeys.all, "staff", status] as const,
};

export function listMyLeaveRequests() {
  return api.get<LeaveRequest[]>("/leave/mine");
}

export function listLeaveRequests(status?: LeaveStatus) {
  return api.get<LeaveRequest[]>("/leave", { query: { status } });
}

export function createLeaveRequest(input: CreateLeaveInput) {
  return api.post<LeaveRequest>("/leave", input);
}

export function decideLeaveRequest(input: { id: string; status: Exclude<LeaveStatus, "PENDING">; note?: string }) {
  return api.post<LeaveRequest>(`/leave/${input.id}/decide`, {
    status: input.status,
    note: input.note,
  });
}

export function useMyLeaveRequests() {
  return useQuery({
    queryKey: leaveKeys.mine(),
    queryFn: listMyLeaveRequests,
  });
}

export function useCreateLeaveRequest() {
  return useMutation({
    mutationFn: createLeaveRequest,
  });
}

export function useStaffLeaveRequests(status?: LeaveStatus) {
  return useQuery({
    queryKey: leaveKeys.staff(status),
    queryFn: () => listLeaveRequests(status),
  });
}

export function useDecideLeaveRequest() {
  return useMutation({
    mutationFn: decideLeaveRequest,
  });
}
