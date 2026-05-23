import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';

import { ParentDashboardScreen } from '../screens/parent/parent-dashboard-screen';
import { ParentReportsScreen } from '../screens/parent/parent-reports-screen';
import { ParentTuitionScreen } from '../screens/parent/parent-tuition-screen';

const Tab = createBottomTabNavigator();

export function ParentNavigator() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="ParentHome"
        component={ParentDashboardScreen}
        options={{ title: t('tabs.home') }}
      />
      <Tab.Screen
        name="ParentReports"
        component={ParentReportsScreen}
        options={{ title: t('tabs.reports') }}
      />
      <Tab.Screen
        name="ParentTuition"
        component={ParentTuitionScreen}
        options={{ title: t('parent.tuition') }}
      />
    </Tab.Navigator>
  );
}
