import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';

// FIX #7: Thêm state thật cho từng switch thay vì hardcode true/false
const SettingsScreen = ({ navigation }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleDarkModeToggle = (value) => {
    setDarkMode(value);
    Alert.alert('Thông báo', 'Tính năng Giao diện Tối sẽ được áp dụng ở phiên bản tiếp theo.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Cài đặt</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông báo</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Bật thông báo nhắc nhở</Text>
              <Text style={styles.settingDesc}>Nhận thông báo khi đến lịch chăm cây</Text>
            </View>
            {/* FIX #7: Switch có state thật */}
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#ccc', true: '#81C784' }}
              thumbColor={notificationsEnabled ? '#4CAF50' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giao diện</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Giao diện Tối (Dark Mode)</Text>
              <Text style={styles.settingDesc}>Chuyển sang theme tối để dễ nhìn ban đêm</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={handleDarkModeToggle}
              trackColor={{ false: '#ccc', true: '#81C784' }}
              thumbColor={darkMode ? '#4CAF50' : '#f4f3f4'}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f7f0' },
  container: { padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#2E7D32', marginBottom: 25, marginTop: 10 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#888', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  settingInfo: { flex: 1, marginRight: 15 },
  settingLabel: { fontSize: 16, color: '#333', fontWeight: '500' },
  settingDesc: { fontSize: 13, color: '#888', marginTop: 3 },
  backButton: { marginTop: 10, padding: 15, alignItems: 'center' },
  backButtonText: { color: '#4CAF50', fontSize: 16, fontWeight: '500' }
});

export default SettingsScreen;
