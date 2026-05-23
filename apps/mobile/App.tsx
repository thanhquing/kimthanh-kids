import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuth } from '@kimthanh/shared-auth';

import './src/i18n';
import i18n from './src/i18n';
import { apiSdk, tokenStorage } from './src/lib/api-client';
import { RootNavigator } from './src/navigation/root-navigator';

const queryClient = new QueryClient();

export default function App() {
  const auth = useAuth({ sdk: apiSdk, storage: tokenStorage });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    auth.hydrate().finally(() => setReady(true));
  }, [auth]);

  if (!ready) return null;

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
