import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';

const AdminDashboardScreen = ({ navigation }) => {
  const handleAction = (action) => {
    Alert.alert('Đang phát triển', `Tính năng ${action} đang được hoàn thiện.`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Bảng Điều Khiển Admin ⚙️</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👥 Quản lý người dùng</Text>
        <TouchableOpacity style={styles.button} onPress={() => handleAction('Block/Unblock tài khoản')}>
          <Text style={styles.buttonText}>Danh sách User (Block/Unblock)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => handleAction('Phân quyền Expert')}>
          <Text style={styles.buttonText}>Cấp huy hiệu Expert</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Kiểm duyệt nội dung</Text>
        <TouchableOpacity style={styles.button} onPress={() => handleAction('Duyệt bài Forum')}>
          <Text style={styles.buttonText}>Duyệt bài đăng chờ duyệt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => handleAction('Xóa Spam')}>
          <Text style={styles.buttonText}>Quản lý báo cáo Spam</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌱 Quản lý Database Cây</Text>
        <TouchableOpacity style={styles.button} onPress={() => handleAction('Thêm cây gốc')}>
          <Text style={styles.buttonText}>Thêm dữ liệu cây mới</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => handleAction('Cập nhật bệnh lý')}>
          <Text style={styles.buttonText}>Cập nhật CSDL Bệnh lý (AI training)</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.button, { backgroundColor: '#757575', marginTop: 20 }]} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Quay lại</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#eceff1' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#37474f', marginTop: 30, marginBottom: 20, textAlign: 'center' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#455a64', marginBottom: 15 },
  button: { backgroundColor: '#607d8b', padding: 15, borderRadius: 8, marginBottom: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});

export default AdminDashboardScreen;
