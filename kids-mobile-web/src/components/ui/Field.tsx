import type { ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function TextField({ label, value, type = "text" }: { label: string; value: string; type?: string }) {
  return (
    <Field label={label}>
      <input className="field" defaultValue={value} type={type} />
    </Field>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <textarea
        className="field min-h-24 resize-none"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        readOnly={!onChange}
      />
    </Field>
  );
}
