import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  label: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 active:bg-brand-600',
  secondary: 'bg-neutral-100 active:bg-neutral-200',
  ghost: 'bg-transparent',
  danger: 'bg-red-600 active:opacity-80',
};

const textStyles: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-neutral-900',
  ghost: 'text-neutral-900',
  danger: 'text-white',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3',
  md: 'h-11 px-4',
  lg: 'h-12 px-6',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  isLoading,
  label,
  disabled,
  ...rest
}: ButtonProps) => (
  <Pressable
    accessibilityRole="button"
    disabled={disabled || isLoading}
    className={`flex-row items-center justify-center rounded-lg ${variantStyles[variant]} ${sizeStyles[size]} ${disabled ? 'opacity-50' : ''}`}
    {...rest}
  >
    {isLoading ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <Text className={`font-semibold ${textStyles[variant]}`}>{label}</Text>
    )}
  </Pressable>
);
