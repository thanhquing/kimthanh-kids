import type { LeaveStatus, LeaveType } from "@/api/leave";
import type { Translator } from "@/i18n";

export const leaveTypes: LeaveType[] = ["SICK", "FAMILY", "OTHER"];

export function leaveTypeLabel(type: LeaveType, t: Translator) {
  const key = {
    SICK: "leave.typeSick",
    FAMILY: "leave.typeFamily",
    OTHER: "leave.typeOther",
  }[type] as Parameters<Translator>[0];
  return t(key);
}

export function leaveStatusLabel(status: LeaveStatus, t: Translator) {
  const key = {
    PENDING: "leave.statusPending",
    APPROVED: "leave.statusApproved",
    REJECTED: "leave.statusRejected",
  }[status] as Parameters<Translator>[0];
  return t(key);
}

