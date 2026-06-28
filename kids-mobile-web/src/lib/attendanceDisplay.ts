import type { AttendanceStatus } from "@/api/attendance";
import type { Translator } from "@/i18n";

export const attendanceStatusOptions: AttendanceStatus[] = ["PRESENT", "LATE", "ABSENT", "EXCUSED"];

export function attendanceStatusLabel(status: AttendanceStatus, t: Translator) {
  const key = {
    PRESENT: "attendance.statusPresent",
    LATE: "attendance.statusLate",
    ABSENT: "attendance.statusAbsent",
    EXCUSED: "attendance.statusExcused",
  }[status] as Parameters<Translator>[0];
  return t(key);
}

