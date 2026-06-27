import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { type AttendanceStatus, students } from "@/mockData";
import type { Role } from "./routes";

type MobileState = {
  role: Role | null;
  setRole: (role: Role | null) => void;
  selectedStudentId: string;
  setSelectedStudentId: (id: string) => void;
  selectedStudent: (typeof students)[number];
  attendance: Record<string, AttendanceStatus>;
  setAttendanceStatus: (studentId: string, status: AttendanceStatus) => void;
};

const MobileStateContext = createContext<MobileState | null>(null);

export function MobileStateProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>("parent");
  const [selectedStudentId, setSelectedStudentId] = useState("minh");
  const [attendance, setAttendance] = useState(
    Object.fromEntries(students.map((student) => [student.id, student.status])) as Record<
      string,
      AttendanceStatus
    >,
  );

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? students[0],
    [selectedStudentId],
  );

  const value = useMemo<MobileState>(
    () => ({
      role,
      setRole,
      selectedStudentId,
      setSelectedStudentId,
      selectedStudent,
      attendance,
      setAttendanceStatus: (studentId, status) =>
        setAttendance((current) => ({ ...current, [studentId]: status })),
    }),
    [attendance, role, selectedStudent, selectedStudentId],
  );

  return <MobileStateContext.Provider value={value}>{children}</MobileStateContext.Provider>;
}

export function useMobileState() {
  const value = useContext(MobileStateContext);
  if (!value) throw new Error("useMobileState must be used inside MobileStateProvider");
  return value;
}

