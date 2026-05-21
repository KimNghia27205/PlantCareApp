import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, SafeAreaView
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { logoutUser } from '../services/authService';
import { pickImage, uploadImageToStorage } from '../services/imageService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebaseConfig';
import { updateProfile, reload } from 'firebase/auth';

const ProfileScreen = ({ navigation }) => {
  const { user, setUser } = useContext(AuthContext);
  const { theme: t } = useTheme();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, [user?.uid]);

  const fetchUserData = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        setUserData({ displayName: user.displayName, email: user.email, points: 0 });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất', style: 'destructive', onPress: async () => {
          await logoutUser();
        }
      }
    ]);
  };

  const handleChangeAvatar = async () => {
    const result = await pickImage();
    if (result.success && result.uri) {
      setLoading(true);
      try {
        const path = `avatars/${user.uid}_${Date.now()}.jpg`;
        const uploadResult = await uploadImageToStorage(result.uri, path);
        if (uploadResult.success) {
          await updateProfile(auth.currentUser, { photoURL: uploadResult.url });
          await reload(auth.currentUser);
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { photoURL: uploadResult.url });
          setUser(auth.currentUser);
          await fetchUserData();
          Alert.alert("Thành công", "Cập nhật ảnh đại diện thành công!");
        } else {
          Alert.alert("Lỗi", uploadResult.error || "Không thể tải ảnh lên.");
        }
      } catch (error) {
        Alert.alert("Lỗi", "Không thể cập nhật ảnh đại diện: " + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const avatarUri = auth.currentUser?.photoURL
    || userData?.photoURL
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'User')}&background=4CAF50&color=fff&size=150`;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerTitle}>Hồ sơ của tôi</Text>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: t.cardBg }]}>
          <TouchableOpacity onPress={handleChangeAvatar} disabled={loading}>
            {loading ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator size="large" color="#4CAF50" />
              </View>
            ) : (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            )}
            <Text style={styles.editAvatarText}>Sửa ảnh</Text>
          </TouchableOpacity>

          <View style={styles.infoContainer}>
            <Text style={[styles.name, { color: t.text }]}>
              {auth.currentUser?.displayName || userData?.displayName || 'Chưa cập nhật tên'}
            </Text>
            <Text style={[styles.email, { color: t.subText }]}>{user?.email}</Text>
          </View>
        </View>

        {/* Thành tích */}
        <View style={[styles.gamificationCard, { backgroundColor: t.cardBg }]}>
          <Text style={[styles.gamiTitle, { color: '#2E7D32' }]}>Thành tích cá nhân</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badgeItem}>
              <Text style={styles.badgeIcon}>🌱</Text>
              <Text style={[styles.badgeText, { color: t.subText }]}>Mầm Non</Text>
            </View>
            <View style={styles.badgeItem}>
              <Text style={styles.badgeIcon}>⭐</Text>
              <Text style={[styles.badgeText, { color: t.subText }]}>{userData?.points || 0} điểm</Text>
            </View>
            <View style={styles.badgeItem}>
              <Text style={styles.badgeIcon}>🏅</Text>
              <Text style={[styles.badgeText, { color: t.subText }]}>Huy hiệu: 0</Text>
            </View>
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={[styles.adminButton, { backgroundColor: t.dark ? '#263238' : '#37474f' }]}
          onPress={() => navigation.navigate('AdminDashboard')}
        >
          <Text style={styles.adminButtonText}>⚙️ Vào Admin Panel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: t.cardBg, borderColor: '#4CAF50' }]}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsButtonText}>🔧 Cài đặt tài khoản</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 20, paddingBottom: 100 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#2E7D32', marginBottom: 20, textAlign: 'center', marginTop: 10 },
  profileCard: { flexDirection: 'row', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0e0e0' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  editAvatarText: { textAlign: 'center', color: '#4CAF50', marginTop: 5, fontSize: 12 },
  infoContainer: { marginLeft: 20, flex: 1 },
  name: { fontSize: 20, fontWeight: 'bold' },
  email: { fontSize: 14, marginTop: 5 },
  gamificationCard: { padding: 20, borderRadius: 15, marginTop: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  gamiTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-around' },
  badgeItem: { alignItems: 'center' },
  badgeIcon: { fontSize: 30 },
  badgeText: { marginTop: 5, fontWeight: '500', fontSize: 12 },
  adminButton: { padding: 15, borderRadius: 10, marginTop: 30, alignItems: 'center' },
  adminButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  settingsButton: { padding: 15, borderRadius: 10, marginTop: 15, borderWidth: 1, alignItems: 'center' },
  settingsButtonText: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#FF5252', padding: 15, borderRadius: 10, marginTop: 15, alignItems: 'center' },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default ProfileScreen;
