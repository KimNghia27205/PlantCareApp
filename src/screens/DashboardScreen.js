import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Platform } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getPlantsByUser } from '../services/plantService';
import { Ionicons } from '@expo/vector-icons';

const DashboardScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const { theme: t } = useTheme();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPlants();
    });
    fetchPlants();
    return unsubscribe;
  }, [navigation, user]);

  const fetchPlants = async () => {
    if (user) {
      const res = await getPlantsByUser(user.uid);
      if (res.success) {
        setPlants(res.data);
      }
    }
    setLoading(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.bg }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, { backgroundColor: t.cardBg, borderColor: '#3E8E41' }]}>
            <Ionicons name="person" size={20} color="#3E8E41" />
          </View>
          <Text style={styles.headerTitle}>PlantCareApp</Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn}>
          <Ionicons name="notifications" size={24} color="#3E8E41" />
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: t.bannerBg }]}>
          <Text style={styles.bannerTitle}>Chào mừng,{'\n'}{user?.displayName || user?.email?.split('@')[0] || 'bạn'}!</Text>
          <View style={[styles.rankBadge, { backgroundColor: t.dark ? '#2E6B30' : '#E8F5E9' }]}>
            <Text style={[styles.rankText, { color: t.dark ? '#A5D6A7' : '#3E8E41' }]}>Hạng: Mầm Non</Text>
          </View>
          <Text style={styles.bannerSub}>Cùng chăm sóc khu vườn{'\n'}của bạn hôm nay</Text>
        </View>

        {/* Shortcut Lịch chăm sóc */}
        <TouchableOpacity
          style={[styles.scheduleCard, { backgroundColor: t.cardBg }]}
          onPress={() => navigation.navigate('Schedule')}
          activeOpacity={0.85}
        >
          <View style={styles.scheduleLeft}>
            <View style={styles.scheduleIconBg}>
              <Text style={{ fontSize: 22 }}>📅</Text>
            </View>
            <View>
              <Text style={[styles.scheduleTitle, { color: t.text }]}>Lịch chăm sóc</Text>
              <Text style={[styles.scheduleSub, { color: t.subText }]}>Xem lịch tưới nước hôm nay</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={t.subText} />
        </TouchableOpacity>

        {/* Plant Collection */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Your Plant Collection</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MyGarden')}>
            <Ionicons name="chevron-forward" size={24} color={t.subText} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3E8E41" style={{ marginVertical: 20 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {plants.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: t.cardBg, borderColor: t.dark ? '#333' : '#E8F5E9' }]}>
                <Text style={[styles.emptyText, { color: t.subText }]}>Chưa có cây nào trong khu vườn.</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('ScanAI')}>
                  <Text style={styles.addText}>Quét AI để thêm cây</Text>
                </TouchableOpacity>
              </View>
            ) : (
              plants.map(plant => (
                <View key={plant.id} style={[styles.plantCard, { backgroundColor: t.cardBg }]}>
                  <Image source={{ uri: plant.imageUrl }} style={styles.plantImage} />
                  <Text style={[styles.plantName, { color: t.text }]} numberOfLines={1}>{plant.plantName}</Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: plant.healthStatus?.toLowerCase().includes('khỏe') ? '#4CAF50' : '#FF9800' }]} />
                    <Text style={[styles.statusText, { color: t.subText }]} numberOfLines={1}>{plant.healthStatus || 'Không rõ'}</Text>
                  </View>
                  <TouchableOpacity style={styles.detailBtn}>
                    <Text style={styles.detailBtnText}>Xem chi tiết</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* Nhiệm Vụ Hôm Nay */}
        <Text style={[styles.sectionTitle, { marginTop: 25, marginBottom: 15, color: t.text }]}>Nhiệm Vụ Hôm Nay</Text>
        <View style={[styles.taskContainer, { backgroundColor: t.cardBg }]}>
          {plants.length > 0 ? (
            plants.slice(0, 3).map((plant, index) => (
              <View key={index} style={styles.taskRow}>
                <Ionicons name={index === 0 ? "checkbox" : "square-outline"} size={22} color="#3E8E41" />
                <Text style={[styles.taskText, { color: t.text }]}>
                  {index === 0 ? '💧 Tưới nước: ' : index === 1 ? '🪴 Bón phân: ' : '☀️ Kiểm tra ánh sáng: '}
                  <Text style={{ fontWeight: 'bold' }}>{plant.plantName}</Text>
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: t.subText, fontStyle: 'italic', marginLeft: 5 }}>Hãy thêm cây để nhận nhiệm vụ.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 15,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#3E8E41' },
  notificationBtn: { position: 'relative' },
  badge: { position: 'absolute', top: 0, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: 'red' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  banner: {
    borderRadius: 16, padding: 20, marginBottom: 25,
    shadowColor: '#3E8E41', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  bannerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  rankBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 10 },
  rankText: { fontSize: 12, fontWeight: 'bold' },
  bannerSub: { color: '#E8F5E9', fontSize: 14, lineHeight: 20 },

  scheduleCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 14, padding: 14, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  scheduleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scheduleIconBg: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center',
  },
  scheduleTitle: { fontSize: 15, fontWeight: '700' },
  scheduleSub: { fontSize: 12, marginTop: 2 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },

  horizontalScroll: { overflow: 'visible' },
  emptyCard: { width: 280, height: 200, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  emptyText: { marginBottom: 10 },
  addBtn: { backgroundColor: '#3E8E41', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  addText: { color: '#fff', fontWeight: 'bold' },

  plantCard: {
    width: 160, borderRadius: 16, padding: 12, marginRight: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  plantImage: { width: '100%', height: 120, borderRadius: 12, marginBottom: 12, backgroundColor: '#f0f0f0' },
  plantName: { fontSize: 15, fontWeight: 'bold', marginBottom: 5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, flex: 1 },
  detailBtn: { backgroundColor: '#3E8E41', paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
  detailBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  taskContainer: { paddingLeft: 5, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  taskRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  taskText: { fontSize: 14, marginLeft: 10 }
});

export default DashboardScreen;
