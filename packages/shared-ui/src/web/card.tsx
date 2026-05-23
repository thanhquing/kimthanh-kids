import clsx from 'clsx';
import type { HTMLAttributes } from 'react';

export const Card = ({ className, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={clsx(
      'rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900',
      className,
    )}
    {...rest}
  />
);
