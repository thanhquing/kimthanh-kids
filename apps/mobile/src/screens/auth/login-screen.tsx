import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Text, TextInput, View } from 'react-native';

import { useAuth } from '@kimthanh/shared-auth';
import { Button } from '@kimthanh/shared-ui/native';

import { apiSdk, tokenStorage } from '../../lib/api-client';

export function LoginScreen() {
  const { t } = useTranslation();
  const auth = useAuth({ sdk: apiSdk, storage: tokenStorage });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      await auth.login({ email, password });
    } catch {
      Alert.alert(t('auth.login'), t('auth.errors.invalidCredentials'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 justify-center bg-white px-6">
      <Text className="mb-6 text-2xl font-semibold">{t('auth.login')}</Text>
      <Text className="text-sm text-neutral-600">{t('auth.email')}</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        className="mt-1 rounded-md border border-neutral-300 px-3 py-2"
      />
      <Text className="mt-4 text-sm text-neutral-600">{t('auth.password')}</Text>
      <TextInput
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        className="mt-1 rounded-md border border-neutral-300 px-3 py-2"
      />
      <View className="mt-6">
        <Button label={t('auth.submit')} onPress={onSubmit} isLoading={submitting} />
      </View>
    </View>
  );
}
