import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 p-10 text-center">
    <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
    {description ? <p className="text-sm text-neutral-500">{description}</p> : null}
    {action ? <div className="mt-2">{action}</div> : null}
  </div>
);
