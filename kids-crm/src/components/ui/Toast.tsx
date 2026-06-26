import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Toast = { id: number; msg: string; type: "success" | "error" };
type Ctx = { toast: (msg: string, type?: Toast["type"]) => void };

const ToastContext = createContext<Ctx>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

let seq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((msg: string, type: Toast["type"] = "success") => {
    const id = seq++;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg",
              t.type === "error" ? "bg-red-600" : "bg-slate-800",
            )}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
