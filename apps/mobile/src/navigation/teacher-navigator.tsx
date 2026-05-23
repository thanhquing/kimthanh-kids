import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';

import { TeacherDashboardScreen } from '../screens/teacher/teacher-dashboard-screen';
import { TeacherAttendanceScreen } from '../screens/teacher/teacher-attendance-screen';
import { TeacherReportScreen } from '../screens/teacher/teacher-report-screen';

const Tab = createBottomTabNavigator();

export function TeacherNavigator() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="TeacherHome"
        component={TeacherDashboardScreen}
        options={{ title: t('tabs.home') }}
      />
      <Tab.Screen
        name="TeacherAttendance"
        component={TeacherAttendanceScreen}
        options={{ title: t('tabs.attendance') }}
      />
      <Tab.Screen
        name="TeacherReport"
        component={TeacherReportScreen}
        options={{ title: t('tabs.reports') }}
      />
    </Tab.Navigator>
  );
}
