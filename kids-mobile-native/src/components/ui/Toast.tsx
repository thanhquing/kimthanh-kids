import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Text, View } from "react-native";

type ToastState = { message: string; tone: "success" | "error" | "info" } | null;
type ToastContextValue = {
  show: (message: string, tone?: NonNullable<ToastState>["tone"]) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const show = useCallback((message: string, tone: NonNullable<ToastState>["tone"] = "info") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 2600);
  }, []);
  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View className="absolute bottom-24 left-5 right-5 z-50 rounded-md bg-ink px-4 py-3">
          <Text className="text-center font-semibold text-white">{toast.message}</Text>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}
