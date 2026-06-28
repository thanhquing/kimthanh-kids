import { create } from "zustand";
import type { Role } from "./routes";

type MobileState = {
  role: Role | null;
  selectedStudentId: string;
  setRole: (role: Role | null) => void;
  setSelectedStudentId: (id: string) => void;
};

export const useMobileState = create<MobileState>((set) => ({
  role: null,
  selectedStudentId: "",
  setRole: (role) => set({ role }),
  setSelectedStudentId: (selectedStudentId) => set({ selectedStudentId }),
}));
