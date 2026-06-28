import { RoleGate } from "@/components/auth/RoleGate";

export default function ParentLayout() {
  return <RoleGate role="parent" />;
}
