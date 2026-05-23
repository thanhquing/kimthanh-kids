import clsx from 'clsx';

export const Spinner = ({ className }: { className?: string }) => (
  <div
    role="status"
    aria-label="loading"
    className={clsx(
      'h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-brand-500',
      className,
    )}
  />
);
