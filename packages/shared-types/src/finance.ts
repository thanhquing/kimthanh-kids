import type { ID, Timestamped } from './common';
import type { PaymentStatus } from './enums';

export interface TuitionInvoiceDTO extends Timestamped {
  id: ID;
  studentId: ID;
  schoolId: ID;
  period: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: PaymentStatus;
  paidAt: string | null;
  paymentMethod: string | null;
  note: string | null;
}

export interface PaymentDTO extends Timestamped {
  id: ID;
  invoiceId: ID;
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  paidAt: string;
}
