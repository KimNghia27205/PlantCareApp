import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { AuthContext } from '../context/AuthContext';

const ScheduleScreen = () => {
  const { user } = useContext(AuthContext);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dữ liệu giả lập nếu Firebase trống
  const dummySchedules = [
    { id: 'dummy1', plantName: 'Cây Bàng Singapore', action: 'Tưới nước', time: 'Hôm nay, 08:00 AM', status: 'pending' },
    { id: 'dummy2', plantName: 'Hoa Hồng', action: 'Bón phân', time: 'Ngày mai, 07:00 AM', status: 'pending' },
  ];

  useEffect(() => {
    fetchSchedules();
  }, [user]);

  const fetchSchedules = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'schedules'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const scheduleList = [];
      querySnapshot.forEach((doc) => {
        scheduleList.push({ id: doc.id, ...doc.data() });
      });
      
      // Nếu không có dữ liệu thực tế, dùng dữ liệu giả lập để demo
      setSchedules(scheduleList.length > 0 ? scheduleList : dummySchedules);
    } catch (error) {
      console.error("Lỗi tải lịch:", error);
      setSchedules(dummySchedules);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsDone = async (id) => {
    // Nếu là dữ liệu dummy, chỉ cập nhật state
    if (id.startsWith('dummy')) {
      setSchedules(schedules.filter(s => s.id !== id));
      Alert.alert('Thành công', 'Đã đánh dấu hoàn thành nhiệm vụ!');
      return;
    }

    // Nếu là dữ liệu thực tế trên Firebase
    try {
      await updateDoc(doc(db, 'schedules', id), { status: 'completed' });
      setSchedules(schedules.filter(s => s.id !== id));
      Alert.alert('Thành công', 'Đã đánh dấu hoàn thành nhiệm vụ!');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái.');
    }
  };

  const renderSchedule = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.actionName}>{item.action} - {item.plantName}</Text>
        <Text style={styles.time}>⏰ {item.time}</Text>
      </View>
      <TouchableOpacity style={styles.doneButton} onPress={() => handleMarkAsDone(item.id)}>
        <Text style={styles.doneButtonText}>Đã xong</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lịch chăm sóc</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#FF9800" style={{ marginTop: 50 }} />
      ) : schedules.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Hôm nay bạn không có lịch chăm cây nào!</Text>
        </View>
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={item => item.id}
          renderItem={renderSchedule}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fdf8e4' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#E65100', marginTop: 30, marginBottom: 20 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 3, alignItems: 'center' },
  cardInfo: { flex: 1 },
  actionName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  time: { color: '#666', marginTop: 8, fontSize: 14 },
  doneButton: { backgroundColor: '#4CAF50', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  doneButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#666', fontWeight: 'bold' }
});

export default ScheduleScreen;
