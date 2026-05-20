import React from 'react';
import { View, Text, StyleSheet, Button, Switch } from 'react-native';

const SettingsScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cài đặt (Settings)</Text>
      <View style={styles.settingItem}>
        <Text>Bật thông báo nhắc nhở</Text>
        <Switch value={true} onValueChange={() => {}} />
      </View>
      <View style={styles.settingItem}>
        <Text>Giao diện Tối (Dark Mode)</Text>
        <Switch value={false} onValueChange={() => {}} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10, alignItems: 'center' },
});

export default SettingsScreen;
