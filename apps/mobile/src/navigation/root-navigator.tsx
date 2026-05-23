import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { UserRole } from '@kimthanh/shared-types';
import { useAuthStore } from '@kimthanh/shared-auth';

import { LoginScreen } from '../screens/auth/login-screen';

import { ParentNavigator } from './parent-navigator';
import { TeacherNavigator } from './teacher-navigator';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  // Role-based routing: teachers/staff see TeacherNavigator; parents see ParentNavigator.
  if (user.role === UserRole.PARENT) {
    return <ParentNavigator />;
  }
  return <TeacherNavigator />;
}
