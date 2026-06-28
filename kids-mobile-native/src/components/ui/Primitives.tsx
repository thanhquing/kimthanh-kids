import { Image } from "expo-image";
import { Link, usePathname, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { memo, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { parentTabs, roleBase, teacherTabs, type Role } from "@/lib/routes";
import { colors } from "@/theme/colors";
import { useT, type TKey } from "@/i18n";

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  if (!scroll) return <SafeAreaView className="flex-1 bg-white">{children}</SafeAreaView>;
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-28 pt-4" keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function TopBar({ title, back = true }: { title: string; back?: boolean }) {
  const router = useRouter();
  return (
    <View className="mb-4 flex-row items-center gap-3">
      {back ? (
        <Pressable
          accessibilityRole="button"
          className="h-10 w-10 items-center justify-center rounded-full border border-line bg-white"
          onPress={() => router.back()}
        >
          <ChevronLeft color={colors.ink} size={22} />
        </Pressable>
      ) : null}
      <Text className="flex-1 text-xl font-bold text-ink">{title}</Text>
    </View>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-lg border border-line bg-white p-4 shadow-sm ${className}`}>{children}</View>;
}

export function PrimaryButton({
  children,
  disabled,
  loading,
  onPress,
}: {
  children: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      className={`min-h-12 items-center justify-center rounded-md px-4 ${disabled || loading ? "bg-muted" : "bg-primary"}`}
      onPress={onPress}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text className="font-bold text-white">{children}</Text>}
    </Pressable>
  );
}

export function SoftButton({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" className="min-h-11 items-center justify-center rounded-md border border-line bg-white px-4" onPress={onPress}>
      <Text className="font-semibold text-ink">{children}</Text>
    </Pressable>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-bold uppercase text-muted">{label}</Text>
      {children}
    </View>
  );
}

export function TextField({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <Field label={label}>
      <TextInput
        className="min-h-12 rounded-sm border border-line-soft bg-white px-3 text-[15px] text-ink"
        placeholderTextColor={colors.muted}
        {...props}
      />
    </Field>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "green" | "amber" | "red" | "brand" | "slate" }) {
  const toneClass = {
    green: "bg-[#e7f7ec] text-[#1f8a4c]",
    amber: "bg-[#fff4da] text-[#a6610b]",
    red: "bg-[#ffe5e5] text-[#b91c1c]",
    brand: "bg-[#ffe7e1] text-[#c0382a]",
    slate: "bg-[#f2edea] text-[#5c463e]",
  }[tone];
  return (
    <View className="self-start rounded-full px-2 py-1">
      <Text className={`text-xs font-bold ${toneClass}`}>{children}</Text>
    </View>
  );
}

export function Avatar({ name, uri }: { name: string; uri?: string | null }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  if (uri) {
    return <Image source={{ uri }} className="h-11 w-11 rounded-full bg-line-faint" cachePolicy="memory-disk" recyclingKey={uri} />;
  }
  return (
    <View className="h-11 w-11 items-center justify-center rounded-full bg-primary">
      <Text className="font-bold text-white">{initials || "KT"}</Text>
    </View>
  );
}

export const EmptyState = memo(function EmptyState({ text }: { text: string }) {
  return (
    <Card className="items-center">
      <Text className="text-center text-sm text-muted">{text}</Text>
    </Card>
  );
});

export function LoadingState() {
  return (
    <View className="py-10">
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-danger">
      <Text className="text-sm font-semibold text-danger">{message}</Text>
    </Card>
  );
}

export function BottomTabs({ role }: { role: Role }) {
  const pathname = usePathname();
  const { t } = useT();
  const tabs = role === "teacher" ? teacherTabs : parentTabs;
  return (
    <View className="absolute bottom-0 left-0 right-0 flex-row border-t border-line bg-white px-2 pb-5 pt-2">
      {tabs.map((tab) => {
        const active = tab.match.some((match) => pathname === match || pathname.startsWith(`${match}/`));
        const Icon = tab.icon;
        return (
          <Link key={tab.to} href={tab.to} asChild>
            <Pressable className="min-h-12 flex-1 items-center justify-center gap-1">
              <Icon color={active ? colors.primary : "#b49b94"} size={21} />
              <Text className={`text-[11px] font-semibold ${active ? "text-primary" : "text-[#b49b94]"}`}>
                {t(tab.label as TKey)}
              </Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

export function RoleScreen({ role, children, scroll = true }: { role: Role; children: ReactNode; scroll?: boolean }) {
  return (
    <View className="flex-1 bg-white">
      <Screen scroll={scroll}>{children}</Screen>
      <BottomTabs role={role} />
    </View>
  );
}

export function HomeLink({ role, children }: { role: Role; children: ReactNode }) {
  return (
    <Link href={roleBase(role)} asChild>
      <Pressable>{children}</Pressable>
    </Link>
  );
}
