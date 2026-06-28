import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { isAuthed, roleForMobile, useMe } from "@/api/auth";
import { useMobileState } from "@/lib/mobileState";
import type { Role } from "@/lib/routes";
import { colors } from "@/theme/colors";

export function RoleGate({ role }: { role: Role }) {
  const { data: me, isError, isLoading } = useMe();
  const setRole = useMobileState((state) => state.setRole);

  useEffect(() => {
    setRole(role);
    return () => setRole(null);
  }, [role, setRole]);

  if (!isAuthed()) return <Redirect href="/login" />;
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (isError || !me) return <Redirect href="/login" />;

  const actual = roleForMobile(me.roles);
  if (!actual) return <Redirect href="/login" />;
  if (actual !== role) return <Redirect href={actual === "teacher" ? "/teacher" : "/parent"} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
