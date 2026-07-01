import { useT } from "@/i18n";
import { Modal } from "./Modal";

/** Hộp thoại xác nhận dùng chung (xóa/tắt/bật…). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useT();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn-soft text-sm" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </button>
          <button
            className={`btn-primary text-sm ${danger ? "!bg-red-600 !shadow-none hover:!bg-red-700" : ""}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? t("common.saving") : (confirmLabel ?? t("common.confirm"))}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}
