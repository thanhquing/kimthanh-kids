import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

export interface CardProps extends ViewProps {
  children: ReactNode;
}

export const Card = ({ children, className, ...rest }: CardProps & { className?: string }) => (
  <View
    className={`rounded-xl bg-white p-4 shadow-sm border border-neutral-200 ${className ?? ''}`}
    {...rest}
  >
    {children}
  </View>
);
