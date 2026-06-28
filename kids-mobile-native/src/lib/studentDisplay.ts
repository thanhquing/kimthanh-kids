import type { Gender, StudentGuardian, StudentStatus } from "@/api/students";
import type { Translator } from "@/i18n";
import type { Language } from "@/lib/language";

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const source = parts.length >= 2 ? [parts[0], parts[parts.length - 1]] : parts;
  return source.map((part) => part[0]?.toUpperCase()).join("") || "?";
}

export function ageFromDate(date: string) {
  const born = new Date(date);
  if (Number.isNaN(born.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const monthDelta = today.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < born.getDate())) age -= 1;
  return Math.max(age, 0);
}

export function formatDate(date: string, lang: Language) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return date;
  return new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-US").format(value);
}

export function genderLabel(gender: Gender, t: Translator) {
  const key = {
    MALE: "students.genderMale",
    FEMALE: "students.genderFemale",
    OTHER: "students.genderOther",
  }[gender] as Parameters<Translator>[0];
  return t(key);
}

export function studentStatusLabel(status: StudentStatus, t: Translator) {
  const key = {
    ACTIVE: "students.statusActive",
    INACTIVE: "students.statusInactive",
    GRADUATED: "students.statusGraduated",
    WITHDRAWN: "students.statusWithdrawn",
  }[status] as Parameters<Translator>[0];
  return t(key);
}

export function primaryGuardian(guardians?: StudentGuardian[]) {
  if (!guardians?.length) return undefined;
  return guardians.find((guardian) => guardian.isPrimary) ?? guardians[0];
}

