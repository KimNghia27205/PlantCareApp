import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const SettingsScreen = ({ navigation }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const t = theme; // shorthand

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: t.settingsBg }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: '#2E7D32' }]}>Cài đặt</Text>

        {/* Thông báo */}
        <View style={[styles.section, { backgroundColor: t.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: t.subText }]}>THÔNG BÁO</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: t.text }]}>Bật thông báo nhắc nhở</Text>
              <Text style={[styles.settingDesc, { color: t.subText }]}>Nhận thông báo khi đến lịch chăm cây</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#ccc', true: '#81C784' }}
              thumbColor={notificationsEnabled ? '#4CAF50' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Giao diện */}
        <View style={[styles.section, { backgroundColor: t.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: t.subText }]}>GIAO DIỆN</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: t.text }]}>Giao diện Tối (Dark Mode)</Text>
              <Text style={[styles.settingDesc, { color: t.subText }]}>Chuyển sang theme tối để dễ nhìn ban đêm</Text>
            </View>
            {/* Gọi toggleTheme thật sự */}
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#ccc', true: '#81C784' }}
              thumbColor={isDark ? '#4CAF50' : '#f4f3f4'}
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
  safeArea: { flex: 1 },
  container: { padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 25, marginTop: 10 },
  section: { borderRadius: 12, padding: 16, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  settingInfo: { flex: 1, marginRight: 15 },
  settingLabel: { fontSize: 16, fontWeight: '500' },
  settingDesc: { fontSize: 13, marginTop: 3 },
  backButton: { marginTop: 10, padding: 15, alignItems: 'center' },
  backButtonText: { color: '#4CAF50', fontSize: 16, fontWeight: '500' }
});

export default SettingsScreen;
