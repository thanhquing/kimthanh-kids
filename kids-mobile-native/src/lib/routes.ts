import {
  Bell,
  FileText,
  Home,
  School,
  User,
  Users,
  type LucideIcon,
} from "lucide-react-native";

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

// `label` là khóa i18n (namespace nav.*) — resolve bằng t() ở MobileLayout.
export const parentTabs: TabItem[] = [
  { to: "/parent", label: "nav.home", icon: Home, match: ["/parent"] },
  { to: "/parent/children", label: "nav.children", icon: Users, match: ["/parent/children", "/parent/student"] },
  { to: "/parent/announcements", label: "nav.announcements", icon: Bell, match: ["/parent/announcements"] },
  { to: "/parent/profile", label: "nav.profile", icon: User, match: ["/parent/profile"] },
];

export const teacherTabs: TabItem[] = [
  { to: "/teacher", label: "nav.home", icon: Home, match: ["/teacher"] },
  { to: "/teacher/class", label: "nav.class", icon: School, match: ["/teacher/class", "/teacher/student"] },
  { to: "/teacher/reports/new", label: "nav.reports", icon: FileText, match: ["/teacher/reports"] },
  { to: "/teacher/announcements", label: "nav.announcements", icon: Bell, match: ["/teacher/announcements"] },
  { to: "/teacher/profile", label: "nav.profile", icon: User, match: ["/teacher/profile"] },
];
