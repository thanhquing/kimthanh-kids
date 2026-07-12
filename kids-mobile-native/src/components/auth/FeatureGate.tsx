import { Redirect } from "expo-router";
import type { ReactNode } from "react";
import { isAuthed, useMe } from "@/api/auth";
import { EmptyState, LoadingState, RoleScreen, TopBar } from "@/components/ui/Primitives";
import { useT } from "@/i18n";
import type { Role } from "@/lib/routes";

export function FeatureGate({
  featureKey,
  role,
  children,
}: {
  featureKey: string;
  role: Role;
  children: ReactNode;
}) {
  const { data: me, isError, isLoading } = useMe();
  const { t } = useT();

  if (!isAuthed()) return <Redirect href="/login" />;
  if (isLoading) {
    return (
      <RoleScreen role={role}>
        <LoadingState />
      </RoleScreen>
    );
  }
  if (isError || !me) return <Redirect href="/login" />;
  if (me.features?.[featureKey] !== true) {
    return (
      <RoleScreen role={role}>
        <TopBar title={t("featureGate.title")} />
        <EmptyState text={t("featureGate.body")} />
      </RoleScreen>
    );
  }

  return <>{children}</>;
}
