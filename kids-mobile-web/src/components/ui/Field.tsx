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

export function TextAreaField({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <textarea className="field min-h-24 resize-none" defaultValue={value} />
    </Field>
  );
}

