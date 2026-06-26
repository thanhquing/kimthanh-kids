// i18n nhẹ cho CRM: dictionary vi/en + tra cứu theo dot-path, đồng bộ với languageStore.
// Dùng `useT()` trong component (re-render khi đổi ngôn ngữ), `t()` cho code ngoài React.
import { useSyncExternalStore } from "react";
import { languageStore, type Language } from "@/lib/language";
import en from "./en.json";
import vi from "./vi.json";

type Dict = typeof vi;

/** Sinh union các dot-path tới leaf kiểu string trong dictionary (type-safe key). */
type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`;
}[keyof T & string];

export type TKey = Leaves<Dict>;
export type TVars = Record<string, string | number>;

// en.json bắt buộc cùng shape với vi.json; giữ ở dạng unknown để tra cứu bằng string walk
// (giá trị literal khác nhau không ảnh hưởng vì key đã được kiểm bởi TKey ở trên).
const DICTS: Record<Language, unknown> = { vi, en };

function resolve(dict: unknown, key: string): string {
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[part];
    return undefined;
  }, dict);
  return typeof value === "string" ? value : key;
}

function interpolate(template: string, vars?: TVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

export function translate(lang: Language, key: TKey, vars?: TVars): string {
  return interpolate(resolve(DICTS[lang], key), vars);
}

/** Bản không reactive — dùng trong handler/khởi tạo ngoài render. */
export function t(key: TKey, vars?: TVars): string {
  return translate(languageStore.get(), key, vars);
}

export type Translator = (key: TKey, vars?: TVars) => string;

/** Hook reactive: component re-render khi người dùng đổi VI/EN. */
export function useT(): { t: Translator; lang: Language } {
  const lang = useSyncExternalStore(
    languageStore.subscribe,
    languageStore.get,
    () => "vi" as Language,
  );
  return { lang, t: (key, vars) => translate(lang, key, vars) };
}
