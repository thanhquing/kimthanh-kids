import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Role } from "./routes";

type MobileState = {
  role: Role | null;
  setRole: (role: Role | null) => void;
  /** Bé đang chọn (đồng bộ từ route param ở StudentDetailPage) — feed báo cáo dùng. */
  selectedStudentId: string;
  setSelectedStudentId: (id: string) => void;
};

const MobileStateContext = createContext<MobileState | null>(null);

export function MobileStateProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const value = useMemo<MobileState>(
    () => ({ role, setRole, selectedStudentId, setSelectedStudentId }),
    [role, selectedStudentId],
  );

  return <MobileStateContext.Provider value={value}>{children}</MobileStateContext.Provider>;
}

export function useMobileState() {
  const value = useContext(MobileStateContext);
  if (!value) throw new Error("useMobileState must be used inside MobileStateProvider");
  return value;
}
