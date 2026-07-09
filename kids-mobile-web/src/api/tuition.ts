import { useMutation, useQuery } from "@tanstack/react-query";
import { api, type PageParams } from "./http";

export type TuitionInvoiceStatus = "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELED";

export type TuitionInvoice = {
  id: string;
  studentId: string;
  invoiceNumber: string;
  period: string;
  issueDate: string;
  dueDate: string;
  subtotal: string | number;
  discount: string | number;
  total: string | number;
  amountPaid: string | number;
  status: TuitionInvoiceStatus;
  note?: string | null;
  student?: { id: string; fullName: string };
};

export type VietQrInfo = {
  payload: string;
  bankBin: string;
  accountNumber: string;
  accountName?: string | null;
  amount: number;
  addInfo: string;
};

export type GatewayPayment = {
  paymentId: string;
  gatewayRef: string;
  redirectUrl: string;
};

export const tuitionKeys = {
  all: ["tuition"] as const,
  mine: () => [...tuitionKeys.all, "mine"] as const,
  detail: (id?: string) => [...tuitionKeys.all, "detail", id] as const,
  vietqr: (id?: string) => [...tuitionKeys.all, "vietqr", id] as const,
};

export function listMyInvoices() {
  return api.get<TuitionInvoice[]>("/tuition/invoices/mine");
}

export function listMyInvoicesPage(params: PageParams) {
  return api.getPage<TuitionInvoice>("/tuition/invoices/mine", { query: params });
}

export function getInvoice(id: string) {
  return api.get<TuitionInvoice>(`/tuition/invoices/${id}`);
}

export function getVietQr(id: string) {
  return api.get<VietQrInfo>(`/tuition/invoices/${id}/vietqr`);
}

export function createGatewayPayment(id: string) {
  return api.post<GatewayPayment>(`/tuition/invoices/${id}/pay/gateway`, { method: "VNPAY" });
}

export function useMyInvoices() {
  return useQuery({
    queryKey: tuitionKeys.mine(),
    queryFn: listMyInvoices,
  });
}

export function useInvoice(id?: string) {
  return useQuery({
    queryKey: tuitionKeys.detail(id),
    queryFn: () => getInvoice(id!),
    enabled: !!id,
  });
}

export function useVietQr(id?: string) {
  return useQuery({
    queryKey: tuitionKeys.vietqr(id),
    queryFn: () => getVietQr(id!),
    enabled: !!id,
    retry: false,
  });
}

export function useCreateGatewayPayment() {
  return useMutation({
    mutationFn: createGatewayPayment,
  });
}

export function invoiceRemaining(invoice: Pick<TuitionInvoice, "total" | "amountPaid">) {
  return Number(invoice.total) - Number(invoice.amountPaid);
}
