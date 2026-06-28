import { appStorage } from "@/api/http";

export type Language = "vi" | "en";

const KEY = "kk_mn_lang";
const listeners = new Set<() => void>();

function normalize(v: string | null): Language {
  return v === "en" ? "en" : "vi";
}

export const languageStore = {
  get(): Language {
    return normalize(appStorage.getString(KEY) ?? null);
  },
  set(lang: Language) {
    appStorage.set(KEY, lang);
    listeners.forEach((fn) => fn());
  },
  toggle() {
    this.set(this.get() === "vi" ? "en" : "vi");
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function initLanguage(): void {
  languageStore.get();
}
