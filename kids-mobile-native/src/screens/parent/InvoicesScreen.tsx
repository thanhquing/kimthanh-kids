import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { invoiceRemaining, useMyInvoices, type TuitionInvoice } from "@/api/tuition";
import { RoleScreen, TopBar, Card, Badge, LoadingState, ErrorState, EmptyState } from "@/components/ui/Primitives";
import { useT } from "@/i18n";
import { formatVnd } from "@/lib/utils";

function InvoiceRow({ item }: { item: TuitionInvoice }) {
  const remaining = invoiceRemaining(item);
  return (
    <Link href={{ pathname: "/parent/payment", params: { id: item.id } }} asChild>
      <Pressable className="mb-3">
        <Card className="gap-2">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 font-bold text-ink">{item.invoiceNumber}</Text>
            <Badge tone={item.status === "PAID" ? "green" : "amber"}>{item.status}</Badge>
          </View>
          <Text className="text-sm text-muted">{item.student?.fullName ?? item.period}</Text>
          <Text className="text-lg font-bold text-primary">{formatVnd(Math.max(remaining, 0))}</Text>
        </Card>
      </Pressable>
    </Link>
  );
}

export default function InvoicesScreen() {
  const { t } = useT();
  const query = useMyInvoices();
  const data = query.data ?? [];
  return (
    <RoleScreen role="parent" scroll={false}>
      <View className="flex-1 px-5 pb-28 pt-4">
        <TopBar title={t("tuition.title")} />
        {query.isLoading ? <LoadingState /> : null}
        {query.isError ? <ErrorState message={t("tuition.listError")} /> : null}
        {!query.isLoading && data.length === 0 ? <EmptyState text={t("tuition.listEmpty")} /> : null}
        <FlashList data={data} keyExtractor={(item) => item.id} renderItem={({ item }) => <InvoiceRow item={item} />} />
      </View>
    </RoleScreen>
  );
}
