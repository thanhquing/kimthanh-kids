import { useTranslation } from 'react-i18next';
import { ScrollView, Text } from 'react-native';

export function TeacherReportScreen() {
  const { t } = useTranslation();
  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-xl font-semibold">{t('teacher.writeReport')}</Text>
      <Text className="mt-2 text-neutral-500">{t('common.empty')}</Text>
    </ScrollView>
  );
}
