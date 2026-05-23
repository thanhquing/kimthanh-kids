import { Text, View } from 'react-native';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

const tone: Record<BadgeTone, { bg: string; text: string }> = {
  neutral: { bg: 'bg-neutral-100', text: 'text-neutral-700' },
  brand: { bg: 'bg-brand-100', text: 'text-brand-700' },
  success: { bg: 'bg-green-100', text: 'text-green-700' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-700' },
  danger: { bg: 'bg-red-100', text: 'text-red-700' },
};

export const Badge = ({
  children,
  tone: t = 'neutral',
}: {
  children: string;
  tone?: BadgeTone;
}) => (
  <View className={`self-start rounded-full px-2 py-0.5 ${tone[t].bg}`}>
    <Text className={`text-xs font-medium ${tone[t].text}`}>{children}</Text>
  </View>
);
