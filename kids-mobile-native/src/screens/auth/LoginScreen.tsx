import { useRouter } from "expo-router";
import { Building2, ChevronDown } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, roleStore } from "@/api/http";
import { login, logout, me, meKeys, roleForMobile } from "@/api/auth";
import { listTenants, searchTenants, type TenantOption } from "@/api/public";
import { Screen, TextField, PrimaryButton, Card } from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { colors } from "@/theme/colors";

const EMPTY_TENANTS: TenantOption[] = [];

function TenantRow({ item, onPress }: { item: TenantOption; onPress: (tenant: TenantOption) => void }) {
  return (
    <Pressable className="flex-row items-center gap-3 border-b border-line-faint py-3" onPress={() => onPress(item)}>
      <View className="h-10 w-10 items-center justify-center rounded-full bg-sand">
        <Building2 color={colors.primary} size={20} />
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-ink">{item.displayName}</Text>
        <Text className="text-xs text-muted">{item.code || item.slug}</Text>
      </View>
    </Pressable>
  );
}

export default function LoginScreen() {
  const { t } = useT();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tenant, setTenant] = useState<TenantOption | null>(null);
  const [query, setQuery] = useState("");
  const [tenants, setTenants] = useState<TenantOption[]>(EMPTY_TENANTS);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    // query < 2: hiển thị tất cả trường ngay (không debounce) — khớp hành vi mobile-web
    // query >= 2: tìm kiếm với debounce 250ms
    const isSearch = query.length >= 2;
    const delay = isSearch ? 250 : 0;
    const handle = setTimeout(() => {
      setLoadingTenants(true);
      const fetchFn = isSearch ? searchTenants(query) : listTenants();
      void fetchFn
        .then((items) => {
          if (active) setTenants(items);
        })
        .catch(() => {
          if (active) setTenants(EMPTY_TENANTS);
        })
        .finally(() => {
          if (active) setLoadingTenants(false);
        });
    }, delay);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query]);

  const canSubmit = useMemo(() => !!tenant && identifier.trim().length > 0 && password.length > 0, [identifier, password, tenant]);

  async function submit() {
    if (!tenant) {
      toast.show(t("auth.schoolRequired"), "error");
      return;
    }
    setSubmitting(true);
    try {
      await login({ identifier: identifier.trim(), password }, tenant.id);
      const profile = await me();
      const role = roleForMobile(profile.roles);
      if (!role) {
        await logout();
        queryClient.clear();
        toast.show(t("auth.errRole"), "error");
        return;
      }
      roleStore.set(role);
      queryClient.setQueryData(meKeys.me, profile);
      router.replace(role === "teacher" ? "/teacher" : "/parent");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("auth.errNetwork");
      toast.show(message || t("auth.errInvalid"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View className="mb-6 mt-6">
        <Text className="text-3xl font-bold text-ink">{t("brand.name")}</Text>
        <Text className="mt-2 text-base text-muted">{t("auth.subtitle")}</Text>
      </View>

      <Card className="gap-4">
        <TextField label={t("auth.schoolLabel")} value={query} placeholder={t("auth.schoolPlaceholder")} onChangeText={setQuery} />
        {tenant ? (
          <View className="rounded-sm bg-sand p-3">
            <Text className="font-semibold text-ink">{tenant.displayName}</Text>
            <Text className="text-xs text-muted">{tenant.code || tenant.slug}</Text>
          </View>
        ) : null}
        <View className="h-52 rounded-sm border border-line-soft px-3">
          {loadingTenants ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlashList
              data={tenants}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <TenantRow item={item} onPress={setTenant} />}
              ListEmptyComponent={<Text className="py-8 text-center text-sm text-muted">{t("auth.schoolEmpty")}</Text>}
            />
          )}
        </View>
        <TextField label={t("auth.phoneLabel")} value={identifier} keyboardType="phone-pad" autoCapitalize="none" onChangeText={setIdentifier} />
        <TextField label={t("auth.passwordLabel")} value={password} secureTextEntry onChangeText={setPassword} />
        <PrimaryButton disabled={!canSubmit} loading={submitting} onPress={submit}>
          {t("auth.submit")}
        </PrimaryButton>
        <Pressable className="flex-row items-center justify-center gap-1 py-1" onPress={() => router.push("/reset-password")}>
          <Text className="font-semibold text-primary">{t("auth.forgot")}</Text>
          <ChevronDown color={colors.primary} size={16} />
        </Pressable>
      </Card>
    </Screen>
  );
}
