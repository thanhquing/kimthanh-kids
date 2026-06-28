import { useQuery } from "@tanstack/react-query";
import { api } from "./http";

export type Gender = "MALE" | "FEMALE" | "OTHER";
export type StudentStatus = "ACTIVE" | "INACTIVE" | "GRADUATED" | "WITHDRAWN";

export type ClassroomRef = {
  id: string;
  name: string;
};

export type StudentGuardian = {
  relationship: string;
  isPrimary: boolean;
  parent: {
    id: string;
    fullName: string;
    phone?: string | null;
    email?: string | null;
  };
};

export type Student = {
  id: string;
  schoolId: string;
  classroomId?: string | null;
  fullName: string;
  nickname?: string | null;
  dateOfBirth: string;
  gender: Gender;
  avatarUrl?: string | null;
  status: StudentStatus;
  classroom?: ClassroomRef | null;
  parents?: StudentGuardian[];
};

export type Classroom = {
  id: string;
  schoolId: string;
  name: string;
  ageGroup?: string | null;
  capacity: number;
  isActive: boolean;
  homeroomTeacher?: { id: string; fullName: string } | null;
  _count?: { students: number };
};

export const studentKeys = {
  all: ["students"] as const,
  mine: () => [...studentKeys.all, "mine"] as const,
  list: (filters: { classroomId?: string; schoolId?: string }) =>
    [...studentKeys.all, "list", filters] as const,
  detail: (id?: string) => [...studentKeys.all, "detail", id] as const,
  classrooms: () => ["classrooms"] as const,
};

export function listMyChildren(): Promise<Student[]> {
  return api.get<Student[]>("/students/mine");
}

export function listStudents(filters: { classroomId?: string; schoolId?: string } = {}) {
  return api.get<Student[]>("/students", { query: filters });
}

export function getStudent(id: string): Promise<Student> {
  return api.get<Student>(`/students/${id}`);
}

export function listClassrooms(filters: { schoolId?: string } = {}) {
  return api.get<Classroom[]>("/classrooms", { query: filters });
}

export function useMyChildren(enabled = true) {
  return useQuery({
    queryKey: studentKeys.mine(),
    queryFn: listMyChildren,
    enabled,
  });
}

export function useStudents(filters: { classroomId?: string; schoolId?: string } = {}) {
  return useQuery({
    queryKey: studentKeys.list(filters),
    queryFn: () => listStudents(filters),
    enabled: Object.values(filters).some(Boolean),
  });
}

export function useStaffStudent(id?: string) {
  return useQuery({
    queryKey: studentKeys.detail(id),
    queryFn: () => getStudent(id!),
    enabled: !!id,
  });
}

export function useClassrooms() {
  return useQuery({
    queryKey: studentKeys.classrooms(),
    queryFn: () => listClassrooms(),
  });
}
