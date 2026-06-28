import "react-native-reanimated";
import "../global.css";

import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { setOnUnauthorized } from "@/api/http";
import { AppProviders, queryClient } from "@/providers/AppProviders";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    setOnUnauthorized(() => {
      queryClient.clear();
      router.replace("/login");
    });
  }, [router]);

  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}
