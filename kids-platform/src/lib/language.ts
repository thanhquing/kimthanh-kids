export type Language = "vi" | "en";

const KEY = "kk_platform_lang";
const listeners = new Set<() => void>();

function normalize(v: string | null): Language {
  return v === "en" ? "en" : "vi";
}

export const languageStore = {
  get(): Language {
    return normalize(localStorage.getItem(KEY));
  },
  set(lang: Language) {
    localStorage.setItem(KEY, lang);
    document.documentElement.lang = lang;
    listeners.forEach((fn) => fn());
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function initLanguage(): void {
  document.documentElement.lang = languageStore.get();
}
