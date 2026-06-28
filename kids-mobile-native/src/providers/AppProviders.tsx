import NetInfo from "@react-native-community/netinfo";
import { onlineManager, QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { useFonts, BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold } from "@expo-google-fonts/be-vietnam-pro";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useEffect, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { tokenStore } from "@/api/http";
import { initLanguage } from "@/lib/language";
import { ToastProvider } from "@/components/ui/Toast";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60_000,
      retry: 1,
    },
  },
});

function useNativeQueryManagers() {
  useEffect(() => {
    const appSub = AppState.addEventListener("change", (status) => {
      if (Platform.OS !== "web") focusManager.setFocused(status === "active");
    });
    const netSub = NetInfo.addEventListener((state) => {
      onlineManager.setOnline(Boolean(state.isConnected));
    });
    return () => {
      appSub.remove();
      netSub();
    };
  }, []);
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [fontsLoaded] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });
  useNativeQueryManagers();

  useEffect(() => {
    let mounted = true;
    void tokenStore.hydrate().finally(() => {
      initLanguage();
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready || !fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <ToastProvider>{children}</ToastProvider>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
