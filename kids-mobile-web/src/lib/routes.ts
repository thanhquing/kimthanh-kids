import {
  Bell,
  FileText,
  Home,
  School,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export type Role = "parent" | "teacher";

export type TabItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  match: string[];
};

export function roleBase(role: Role | null) {
  return role === "teacher" ? "/teacher" : "/parent";
}

export const parentTabs: TabItem[] = [
  { to: "/parent", label: "Trang chủ", icon: Home, match: ["/parent"] },
  { to: "/parent/children", label: "Con tôi", icon: Users, match: ["/parent/children", "/parent/student"] },
  { to: "/parent/announcements", label: "Thông báo", icon: Bell, match: ["/parent/announcements"] },
  { to: "/parent/profile", label: "Hồ sơ", icon: User, match: ["/parent/profile"] },
];

export const teacherTabs: TabItem[] = [
  { to: "/teacher", label: "Trang chủ", icon: Home, match: ["/teacher"] },
  { to: "/teacher/class", label: "Lớp", icon: School, match: ["/teacher/class", "/teacher/student"] },
  { to: "/teacher/reports/new", label: "Báo cáo", icon: FileText, match: ["/teacher/reports"] },
  { to: "/teacher/announcements", label: "Thông báo", icon: Bell, match: ["/teacher/announcements"] },
  { to: "/teacher/profile", label: "Hồ sơ", icon: User, match: ["/teacher/profile"] },
];
