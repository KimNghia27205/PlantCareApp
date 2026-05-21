import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

// Component con để đọc được theme sau khi ThemeProvider đã bao bọc
const ThemedApp = () => {
  const { theme } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.dark ? '#1a1a1a' : '#E8F5E9' }]}>
      <View style={[styles.appContainer, {
        backgroundColor: theme.bg,
        ...(Platform.OS === 'web' && {
          boxShadow: '0px 0px 20px rgba(0,0,0,0.15)',
          borderRadius: 20,
          overflow: 'hidden',
          marginTop: 20,
          marginBottom: 20,
        }),
      }]}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </View>
    </View>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appContainer: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : '100%',
    maxHeight: Platform.OS === 'web' ? 900 : '100%',
  }
});
