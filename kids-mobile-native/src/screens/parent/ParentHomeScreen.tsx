import { Link } from "expo-router";
import { Bell, CreditCard, FileText, HeartPulse, Users } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useMyChildren } from "@/api/students";
import { useMyInvoices } from "@/api/tuition";
import { RoleScreen, Card, Avatar, LoadingState, EmptyState } from "@/components/ui/Primitives";
import { useT } from "@/i18n";
import { colors } from "@/theme/colors";

export default function ParentHomeScreen() {
  const { t } = useT();
  const children = useMyChildren();
  const invoices = useMyInvoices();
  const dueCount = (invoices.data ?? []).filter((item) => item.status !== "PAID").length;

  const quickLinks = [
    { href: "/parent/children", label: t("nav.children"), icon: Users },
    { href: "/parent/invoices", label: t("home.quickPayment"), icon: CreditCard },
    { href: "/parent/reports", label: t("nav.reports"), icon: FileText },
    { href: "/parent/medicine/new", label: t("home.quickMedicine"), icon: HeartPulse },
  ] as const;

  return (
    <RoleScreen role="parent">
      <View className="mb-5 rounded-lg bg-primary p-5">
        <Text className="text-sm font-semibold text-white/85">{t("brand.name")}</Text>
        <Text className="mt-1 text-2xl font-bold text-white">{t("nav.home")}</Text>
        <Text className="mt-2 text-sm text-white/85">
          {dueCount > 0 ? t("home.invoicesDue").replace("{count}", String(dueCount)) : t("home.noInvoicesDue")}
        </Text>
      </View>
      <View className="flex-row flex-wrap justify-between gap-3">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} asChild>
              <Pressable className="mb-3 w-[48%] rounded-lg border border-line bg-white p-4">
                <Icon color={colors.primary} size={24} />
                <Text className="mt-3 font-bold text-ink">{item.label}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
      <Text className="mb-2 mt-2 text-xs font-bold uppercase text-muted">{t("students.childrenTitle")}</Text>
      {children.isLoading ? <LoadingState /> : null}
      {(children.data ?? []).slice(0, 2).map((student) => (
        <Link key={student.id} href={`/parent/student/${student.id}`} asChild>
          <Pressable>
            <Card className="mb-3 flex-row items-center gap-3">
              <Avatar name={student.fullName} uri={student.avatarUrl} />
              <View className="flex-1">
                <Text className="font-bold text-ink">{student.fullName}</Text>
                <Text className="text-sm text-muted">{student.classroom?.name ?? t("students.noClass")}</Text>
              </View>
            </Card>
          </Pressable>
        </Link>
      ))}
      {!children.isLoading && (children.data ?? []).length === 0 ? <EmptyState text={t("students.childrenEmpty")} /> : null}
      <Link href="/parent/notifications" asChild>
        <Pressable className="mt-1 flex-row items-center gap-2 self-start rounded-full bg-sand px-4 py-2">
          <Bell color={colors.primary} size={18} />
          <Text className="font-semibold text-primary">{t("nav.announcements")}</Text>
        </Pressable>
      </Link>
    </RoleScreen>
  );
}
