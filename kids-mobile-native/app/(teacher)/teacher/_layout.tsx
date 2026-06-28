import { RoleGate } from "@/components/auth/RoleGate";

export default function TeacherLayout() {
  return <RoleGate role="teacher" />;
}
