import { Building2, Check, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { searchTenants, type TenantOption } from "@/api/public";
import { useT } from "@/i18n";

/**
 * Ô tìm + chọn trường ở màn login (độc lập subdomain). Gõ ≥ 2 ký tự → debounce gọi
 * /public/tenants (tìm được theo tên/mã trường/MST); item hiện logo (placeholder nếu thiếu),
 * tên trường, mã trường. KHÔNG hiển thị MST trên item.
 */
export function TenantSelect({
  value,
  onChange,
}: {
  value: TenantOption | null;
  onChange: (tenant: TenantOption | null) => void;
}) {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Mở dropdown → nạp danh sách (q rỗng) để chọn ngay; gõ → debounce lọc lại. Bỏ kết quả cũ (chống race).
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    let active = true;
    const timer = window.setTimeout(() => {
      searchTenants(query.trim())
        .then((items) => active && setResults(items))
        .catch(() => active && setResults([]))
        .finally(() => active && setLoading(false));
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, open]);

  // Click ra ngoài → đóng dropdown.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(tenant: TenantOption) {
    onChange(tenant);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative" ref={boxRef}>
      <label className="label">{t("login.schoolLabel")}</label>

      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setOpen(true);
          }}
          className="flex w-full items-center gap-3 rounded-xl border border-[#f1e3dc] bg-white px-3 py-2.5 text-left"
        >
          <TenantLogo tenant={value} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{value.displayName}</span>
            <span className="block truncate text-xs text-slate-500">
              {value.code || value.slug}
            </span>
          </span>
          <span className="text-xs text-[color:var(--primary)]">{t("login.schoolChange")}</span>
        </button>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            className="field !pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={t("login.schoolPlaceholder")}
            autoComplete="off"
          />
        </div>
      )}

      {open && !value ? (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-[#f1e3dc] bg-white shadow-lg">
          {loading ? (
            <div className="px-3 py-3 text-sm text-slate-500">{t("login.schoolSearching")}</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-500">{t("login.schoolEmpty")}</div>
          ) : (
            results.map((tenant) => (
              <button
                key={tenant.id}
                type="button"
                onClick={() => pick(tenant)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#fff8f3]"
              >
                <TenantLogo tenant={tenant} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{tenant.displayName}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {tenant.code ? `${t("login.schoolCodeShort")}: ${tenant.code}` : tenant.slug}
                  </span>
                </span>
                <Check className="h-4 w-4 shrink-0 text-transparent" />
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function TenantLogo({ tenant }: { tenant: TenantOption }) {
  const [failed, setFailed] = useState(false);
  if (tenant.logoUrl && !failed) {
    return (
      <img
        src={tenant.logoUrl}
        alt={tenant.displayName}
        onError={() => setFailed(true)}
        className="h-9 w-9 shrink-0 rounded-lg object-cover"
      />
    );
  }
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#fff1ea] text-[color:var(--primary)]">
      <Building2 className="h-4 w-4" />
    </span>
  );
}
