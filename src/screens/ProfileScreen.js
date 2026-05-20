import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { logoutUser } from '../services/authService';
import { pickImage, uploadImageToStorage } from '../services/imageService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { updateProfile } from 'firebase/auth';

const ProfileScreen = ({ navigation }) => {
  const { user, setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
  };

  const handleChangeAvatar = async () => {
    const result = await pickImage();
    if (result.success && result.uri) {
      setLoading(true);
      try {
        const path = `avatars/${user.uid}_${Date.now()}.jpg`;
        const uploadResult = await uploadImageToStorage(result.uri, path);
        if (uploadResult.success) {
          // Update Auth Profile
          await updateProfile(user, { photoURL: uploadResult.url });
          // Update Firestore
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { photoURL: uploadResult.url });
          
          await fetchUserData(); // Refresh
          Alert.alert("Thành công", "Cập nhật ảnh đại diện thành công!");
        } else {
          Alert.alert("Lỗi", uploadResult.error);
        }
      } catch (error) {
        Alert.alert("Lỗi", "Không thể cập nhật ảnh đại diện.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Hồ sơ của tôi</Text>
      
      <View style={styles.profileCard}>
        <TouchableOpacity onPress={handleChangeAvatar} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="large" color="#4CAF50" style={styles.avatar} />
          ) : (
            <Image 
              source={{ uri: user?.photoURL || userData?.photoURL || 'https://via.placeholder.com/150' }} 
              style={styles.avatar} 
            />
          )}
          <Text style={styles.editAvatarText}>Sửa ảnh</Text>
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Text style={styles.name}>{user?.displayName || userData?.displayName || 'Chưa cập nhật tên'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
      </View>

      <View style={styles.gamificationCard}>
        <Text style={styles.gamiTitle}>Thành tích cá nhân</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badgeItem}>
            <Text style={styles.badgeIcon}>🌱</Text>
            <Text style={styles.badgeText}>Mầm Non</Text>
          </View>
          <View style={styles.badgeItem}>
            <Text style={styles.badgeIcon}>⭐</Text>
            <Text style={styles.badgeText}>{userData?.points || 0} điểm</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.adminButton} onPress={() => navigation.navigate('AdminDashboard')}>
        <Text style={styles.adminButtonText}>Vào Admin Panel</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
        <Text style={styles.settingsButtonText}>Cài đặt tài khoản</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f0f7f0' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#2E7D32', marginBottom: 20, textAlign: 'center', marginTop: 30 },
  profileCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 3 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0e0e0' },
  editAvatarText: { textAlign: 'center', color: '#4CAF50', marginTop: 5, fontSize: 12 },
  infoContainer: { marginLeft: 20, flex: 1 },
  name: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  email: { fontSize: 14, color: '#666', marginTop: 5 },
  gamificationCard: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginTop: 20, elevation: 3 },
  gamiTitle: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32', marginBottom: 15 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-around' },
  badgeItem: { alignItems: 'center' },
  badgeIcon: { fontSize: 30 },
  badgeText: { marginTop: 5, color: '#555', fontWeight: '500' },
  adminButton: { backgroundColor: '#37474f', padding: 15, borderRadius: 10, marginTop: 30, alignItems: 'center' },
  adminButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  settingsButton: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginTop: 15, borderWidth: 1, borderColor: '#4CAF50', alignItems: 'center' },
  settingsButtonText: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#FF5252', padding: 15, borderRadius: 10, marginTop: 15, alignItems: 'center' },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default ProfileScreen;
