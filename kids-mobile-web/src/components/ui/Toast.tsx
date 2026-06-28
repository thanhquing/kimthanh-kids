import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Toast = { id: number; msg: string; type: "success" | "error" };
type ToastContextValue = { toast: (msg: string, type?: Toast["type"]) => void };

const ToastContext = createContext<ToastContextValue>({ toast: () => undefined });
let seq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((msg: string, type: Toast["type"] = "success") => {
    const id = seq++;
    setToasts((current) => [...current, { id, msg, type }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 2600);
  }, []);

  // `toast` ổn định (useCallback) → memo value để consumer không re-render mỗi khi toasts đổi.
  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2 px-4">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              "rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg",
              item.type === "error" ? "bg-red-600" : "bg-slate-800",
            )}
          >
            {item.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

