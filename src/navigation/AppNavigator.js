import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

import { AuthContext } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import MyGardenScreen from '../screens/MyGardenScreen';
import PlantJournalScreen from '../screens/PlantJournalScreen';
import ScanScreen from '../screens/ScanScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import ForumScreen from '../screens/ForumScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
  </Stack.Navigator>
);

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { theme: t } = useTheme();
  const visibleTabs = state.routes.filter(r => r.name !== 'Schedule');

  return (
    <View style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 75,
      backgroundColor: t.tabBarBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 15,
    }}>
      {visibleTabs.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === state.routes.findIndex(r => r.key === route.key);
        const isScan = route.name === 'ScanAI';

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (isScan) {
          return (
            <View key={route.key} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.85}
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 31,
                  backgroundColor: '#3E8E41',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 30, // nổi lên khỏi tab bar
                  shadowColor: '#3E8E41',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 6,
                  elevation: 8,
                }}
              >
                <Ionicons name="add" size={34} color="#fff" />
              </TouchableOpacity>
            </View>
          );
        }

        let iconName = 'home';
        let label = '';
        if (route.name === 'Home') { iconName = 'home'; label = 'Trang chủ'; }
        else if (route.name === 'MyGarden') { iconName = 'leaf'; label = 'Khu vườn'; }
        else if (route.name === 'Forum') { iconName = 'people'; label = 'Cộng đồng'; }
        else if (route.name === 'Profile') { iconName = 'person'; label = 'Cá nhân'; }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.7}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 10 }}
          >
            <Ionicons
              name={iconName}
              size={22}
              color={isFocused ? '#3E8E41' : (t.dark ? '#555' : '#A5D6A7')}
            />
            <Text style={{
              fontSize: 10,
              marginTop: 4,
              fontWeight: 'bold',
              color: isFocused ? '#3E8E41' : (t.dark ? '#555' : '#A5D6A7'),
            }}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Stack dành cho MyGarden và PlantJournal (nằm trong Tab Khu vườn)
const MyGardenStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MyGardenMain" component={MyGardenScreen} />
    <Stack.Screen name="PlantJournal" component={PlantJournalScreen} />
  </Stack.Navigator>
);

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="MyGarden" component={MyGardenStack} />
      <Tab.Screen name="ScanAI" component={ScanScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Forum" component={ForumScreen} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppNavigator;
