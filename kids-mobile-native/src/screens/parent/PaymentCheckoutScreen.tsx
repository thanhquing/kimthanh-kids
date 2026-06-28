import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { useInvoice, useVietQr } from "@/api/tuition";
import { RoleScreen, TopBar, Card, LoadingState, ErrorState } from "@/components/ui/Primitives";
import { useT } from "@/i18n";
import { formatVnd } from "@/lib/utils";

export default function PaymentCheckoutScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useT();
  const invoice = useInvoice(id);
  const qr = useVietQr(id);

  return (
    <RoleScreen role="parent">
      <TopBar title={t("tuition.paymentTitle")} />
      {invoice.isLoading ? <LoadingState /> : null}
      {invoice.isError ? <ErrorState message={t("tuition.detailError")} /> : null}
      {invoice.data ? (
        <Card className="gap-2">
          <Text className="font-bold text-ink">{invoice.data.invoiceNumber}</Text>
          <Text className="text-sm text-muted">{invoice.data.student?.fullName ?? invoice.data.period}</Text>
          <Text className="text-2xl font-bold text-primary">{formatVnd(Number(invoice.data.total))}</Text>
        </Card>
      ) : null}
      <Card className="mt-4 gap-2">
        <Text className="text-lg font-bold text-ink">{t("tuition.vietQr")}</Text>
        {qr.isLoading ? <LoadingState /> : null}
        {qr.isError ? <Text className="text-sm text-muted">{t("tuition.vietQrUnavailable")}</Text> : null}
        {qr.data ? (
          <>
            <Text className="text-sm text-muted">{t("tuition.bank")}: {qr.data.bankBin}</Text>
            <Text className="text-sm text-muted">{t("tuition.account")}: {qr.data.accountNumber}</Text>
            <Text className="text-sm text-muted">{t("tuition.transferContent")}: {qr.data.addInfo}</Text>
            <Text className="font-bold text-ink">{formatVnd(qr.data.amount)}</Text>
          </>
        ) : null}
      </Card>
    </RoleScreen>
  );
}
