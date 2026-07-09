// Combobox chọn 1 thực thể qua SEARCH SERVER-SIDE — dùng cho dropdown có thể >100 mục
// (học sinh, nhân sự) mà không thể tải hết. Gõ để tìm; API trả trang đầu theo `search`.
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Page } from "@/api/crm";
import { useT } from "@/i18n";

export function EntitySelect<T extends { id: string }>({
  value,
  selectedLabel,
  fetchPage,
  labelOf,
  idOf = (item) => item.id,
  onChange,
  queryKey,
  placeholder,
  disabled,
  allowClear = true,
}: {
  value: string;
  /** Nhãn của mục đang chọn (khi đã có value từ trước, để hiển thị dù chưa mở dropdown). */
  selectedLabel?: string;
  /** Tải trang option theo từ khoá tìm (thường pageSize nhỏ, vd 20). */
  fetchPage: (search: string) => Promise<Page<T>>;
  labelOf: (item: T) => string;
  /** Giá trị dùng làm `value` (mặc định item.id). VD member: (m)=>m.user.id. */
  idOf?: (item: T) => string;
  onChange: (id: string, item: T | null) => void;
  queryKey: unknown[];
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [chosen, setChosen] = useState<string>(selectedLabel ?? "");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setChosen(selectedLabel ?? ""), [selectedLabel]);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(id);
  }, [term]);

  // Click ra ngoài → đóng.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const q = useQuery({
    queryKey: [...queryKey, "entity-select", debounced],
    queryFn: () => fetchPage(debounced),
    enabled: open,
  });
  const options = q.data?.items ?? [];

  function pick(item: T) {
    setChosen(labelOf(item));
    onChange(idOf(item), item);
    setOpen(false);
    setTerm("");
  }
  function clear() {
    setChosen("");
    onChange("", null);
    setTerm("");
  }

  return (
    <div className="relative" ref={boxRef}>
      <div className="flex items-center gap-1">
        <input
          className="field"
          value={open ? term : chosen}
          placeholder={value && !open ? chosen : (placeholder ?? t("common.search"))}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setTerm(e.target.value);
            if (!open) setOpen(true);
          }}
        />
        {allowClear && value && !disabled && (
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 px-1"
            onClick={clear}
            aria-label={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-[#f4e7e0] bg-white py-1 shadow-lg text-sm">
          {q.isLoading ? (
            <div className="px-3 py-2 text-muted">{t("common.loading")}</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-muted">{t("common.noMore")}</div>
          ) : (
            options.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`block w-full px-3 py-1.5 text-left hover:bg-[#fff3ec] ${
                  idOf(item) === value ? "font-semibold text-[color:var(--primary)]" : ""
                }`}
                onClick={() => pick(item)}
              >
                {labelOf(item)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
