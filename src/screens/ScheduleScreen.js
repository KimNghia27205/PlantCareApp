import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const ScheduleScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const { theme: t } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSchedules(); }, [user?.uid]);

  const fetchSchedules = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'plants'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const now = new Date();
      let taskList = [];

      querySnapshot.forEach((document) => {
        const plant = { id: document.id, ...document.data() };
        const waterIntervalDays = plant.waterIntervalDays || plant.waterInterval || 2;
        let lastWatered = plant.lastWatered ? new Date(plant.lastWatered) : new Date(0);
        let nextWatering = new Date(lastWatered);
        nextWatering.setDate(nextWatering.getDate() + waterIntervalDays);

        const diffTime = nextWatering - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status = 'upcoming';
        let timeLabel = '';
        if (diffDays < 0) { status = 'overdue'; timeLabel = `Quá hạn ${Math.abs(diffDays)} ngày`; }
        else if (diffDays === 0) { status = 'today'; timeLabel = 'Hôm nay'; }
        else { timeLabel = `Còn ${diffDays} ngày`; }

        taskList.push({
          id: plant.id, plantName: plant.name || plant.plantName,
          imageUrl: plant.imageUrl, location: plant.location || '',
          action: 'Tưới nước', timeLabel, status, nextWatering,
          waterIntervalDays,
        });
      });

      taskList.sort((a, b) => a.nextWatering - b.nextWatering);
      setTasks(taskList);
    } catch (error) {
      console.error("Lỗi tải lịch:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsDone = async (id, actionName) => {
    try {
      await updateDoc(doc(db, 'plants', id), { lastWatered: new Date().toISOString() });
      Alert.alert('✅ Hoàn thành!', `Đã ghi nhận ${actionName.toLowerCase()} thành công!`);
      fetchSchedules();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái.');
    }
  };

  const getStatusColor = (status) => {
    if (status === 'overdue') return '#F44336';
    if (status === 'today') return '#FF9800';
    return '#4CAF50';
  };

  const getStatusBg = (status) => {
    if (status === 'overdue') return '#FFEBEE';
    if (status === 'today') return '#FFF3E0';
    return '#E8F5E9';
  };

  // Tóm tắt nhanh
  const overdueCount = tasks.filter(t => t.status === 'overdue').length;
  const todayCount = tasks.filter(t => t.status === 'today').length;

  const renderSchedule = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const statusBg = getStatusBg(item.status);

    return (
      <View style={[styles.card, { backgroundColor: t.cardBg }]}>
        <Image
          source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1416879598555-46700c0a9693?q=80&w=200&auto=format&fit=crop' }}
          style={styles.plantImage}
        />
        <View style={styles.cardInfo}>
          <View style={styles.cardTopRow}>
            <Text style={[styles.actionName, { color: statusColor }]}>
              💧 {item.action}
            </Text>
            <View style={[styles.timeBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.timeBadgeText, { color: statusColor }]}>{item.timeLabel}</Text>
            </View>
          </View>
          <Text style={[styles.plantName, { color: t.text }]}>{item.plantName}</Text>
          {item.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={t.subText} />
              <Text style={[styles.locationText, { color: t.subText }]}>{item.location}</Text>
            </View>
          ) : null}
          <Text style={[styles.intervalText, { color: t.subText }]}>
            Chu kỳ tưới: mỗi {item.waterIntervalDays} ngày
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.doneButton, { opacity: item.status === 'upcoming' ? 0.7 : 1 }]}
          onPress={() => handleMarkAsDone(item.id, item.action)}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.bg }]}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: '#E65100' }]}>Lịch chăm sóc</Text>
        <TouchableOpacity onPress={fetchSchedules} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#E65100" />
        </TouchableOpacity>
      </View>

      {/* Summary cards */}
      {!loading && tasks.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#FFEBEE' }]}>
            <Text style={[styles.summaryNumber, { color: '#F44336' }]}>{overdueCount}</Text>
            <Text style={[styles.summaryLabel, { color: '#F44336' }]}>⚠️ Quá hạn</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#FFF3E0' }]}>
            <Text style={[styles.summaryNumber, { color: '#FF9800' }]}>{todayCount}</Text>
            <Text style={[styles.summaryLabel, { color: '#FF9800' }]}>📅 Hôm nay</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
            <Text style={[styles.summaryNumber, { color: '#4CAF50' }]}>{tasks.length - overdueCount - todayCount}</Text>
            <Text style={[styles.summaryLabel, { color: '#4CAF50' }]}>✅ Sắp tới</Text>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#FF9800" style={{ marginTop: 60 }} />
      ) : tasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 56 }}>🌿</Text>
          <Text style={[styles.emptyText, { color: t.text }]}>Tuyệt vời!</Text>
          <Text style={[styles.emptySub, { color: t.subText }]}>Chưa có lịch chăm sóc nào.{'\n'}Hãy thêm cây trong Khu vườn trước nhé!</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={item => item.id}
          renderItem={renderSchedule}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 55 : 35, paddingBottom: 14,
  },
  backBtn: { padding: 4 },
  refreshBtn: { padding: 4 },
  title: { fontSize: 22, fontWeight: 'bold' },

  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 8 },
  summaryCard: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  summaryNumber: { fontSize: 22, fontWeight: 'bold' },
  summaryLabel: { fontSize: 11, marginTop: 2 },

  card: {
    flexDirection: 'row', borderRadius: 14, padding: 14, marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  plantImage: { width: 58, height: 58, borderRadius: 12, marginRight: 12, backgroundColor: '#f0f0f0' },
  cardInfo: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  actionName: { fontSize: 14, fontWeight: 'bold' },
  timeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  timeBadgeText: { fontSize: 11, fontWeight: 'bold' },
  plantName: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2 },
  locationText: { fontSize: 12 },
  intervalText: { fontSize: 11, marginTop: 1 },
  doneButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#4CAF50',
    justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingBottom: 60 },
  emptyText: { fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});

export default ScheduleScreen;
