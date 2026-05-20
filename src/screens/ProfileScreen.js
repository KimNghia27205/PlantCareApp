import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, SafeAreaView
} from 'react-native';
// FIX #4: Xóa import Button không dùng
import { AuthContext } from '../context/AuthContext';
import { logoutUser } from '../services/authService';
import { pickImage, uploadImageToStorage } from '../services/imageService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebaseConfig';
import { updateProfile, reload } from 'firebase/auth';

const ProfileScreen = ({ navigation }) => {
  const { user, setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, [user?.uid]); // FIX #6: Phụ thuộc vào uid thay vì cả object user

  const fetchUserData = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        // Tạo bản ghi mặc định nếu chưa có (ví dụ: đăng nhập Google lần đầu)
        setUserData({ displayName: user.displayName, email: user.email, points: 0 });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  // FIX #6: Đăng xuất an toàn - không cần setUser(null) thủ công
  // onAuthStateChanged trong AuthContext sẽ tự cập nhật user về null
  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất', style: 'destructive', onPress: async () => {
          await logoutUser();
          // Không cần setUser(null) vì onAuthStateChanged sẽ tự trigger
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
          // FIX #5: Reload auth user SAU khi updateProfile để AuthContext lấy được data mới
          await updateProfile(auth.currentUser, { photoURL: uploadResult.url });
          await reload(auth.currentUser); // Force reload để lấy photoURL mới nhất

          // Cập nhật Firestore
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { photoURL: uploadResult.url });

          // FIX #5: Cập nhật AuthContext với user object mới nhất
          setUser(auth.currentUser);

          // Refresh local data
          await fetchUserData();
          Alert.alert("Thành công", "Cập nhật ảnh đại diện thành công!");
        } else {
          Alert.alert("Lỗi", uploadResult.error || "Không thể tải ảnh lên.");
        }
      } catch (error) {
        console.error("Avatar update error:", error);
        Alert.alert("Lỗi", "Không thể cập nhật ảnh đại diện: " + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // Lấy avatar theo thứ tự ưu tiên: auth > firestore > placeholder
  const avatarUri = auth.currentUser?.photoURL
    || userData?.photoURL
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'User')}&background=4CAF50&color=fff&size=150`;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* FIX #6: Thêm ScrollView để tránh content bị che trên Android */}
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerTitle}>Hồ sơ của tôi</Text>

        <View style={styles.profileCard}>
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
            {/* FIX #5: Ưu tiên auth.currentUser để lấy data mới nhất */}
            <Text style={styles.name}>
              {auth.currentUser?.displayName || userData?.displayName || 'Chưa cập nhật tên'}
            </Text>
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
            <View style={styles.badgeItem}>
              <Text style={styles.badgeIcon}>🏅</Text>
              <Text style={styles.badgeText}>Huy hiệu: 0</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.adminButton} onPress={() => navigation.navigate('AdminDashboard')}>
          <Text style={styles.adminButtonText}>⚙️ Vào Admin Panel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
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
  safeArea: { flex: 1, backgroundColor: '#f0f7f0' },
  container: { padding: 20, paddingBottom: 40 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#2E7D32', marginBottom: 20, textAlign: 'center', marginTop: 10 },
  profileCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 3 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0e0e0' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  editAvatarText: { textAlign: 'center', color: '#4CAF50', marginTop: 5, fontSize: 12 },
  infoContainer: { marginLeft: 20, flex: 1 },
  name: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  email: { fontSize: 14, color: '#666', marginTop: 5 },
  gamificationCard: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginTop: 20, elevation: 3 },
  gamiTitle: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32', marginBottom: 15 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-around' },
  badgeItem: { alignItems: 'center' },
  badgeIcon: { fontSize: 30 },
  badgeText: { marginTop: 5, color: '#555', fontWeight: '500', fontSize: 12 },
  adminButton: { backgroundColor: '#37474f', padding: 15, borderRadius: 10, marginTop: 30, alignItems: 'center' },
  adminButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  settingsButton: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginTop: 15, borderWidth: 1, borderColor: '#4CAF50', alignItems: 'center' },
  settingsButtonText: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#FF5252', padding: 15, borderRadius: 10, marginTop: 15, alignItems: 'center' },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default ProfileScreen;
