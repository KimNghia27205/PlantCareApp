import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { AuthContext } from '../context/AuthContext';

const ScheduleScreen = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedules();
  }, [user?.uid]);

  const fetchSchedules = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Lấy toàn bộ cây trong vườn của người dùng
      const q = query(collection(db, 'plants'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const now = new Date();
      let taskList = [];

      querySnapshot.forEach((document) => {
        const plant = { id: document.id, ...document.data() };
        
        // Giả lập logic: Mặc định mỗi cây cần tưới 2 ngày 1 lần.
        // Thực tế có thể lưu waterInterval (số ngày) vào database khi tạo cây.
        const waterIntervalDays = plant.waterInterval || 2; 
        
        let lastWatered = plant.lastWatered ? new Date(plant.lastWatered) : new Date(0);
        let nextWatering = new Date(lastWatered);
        nextWatering.setDate(nextWatering.getDate() + waterIntervalDays);

        // Tính khoảng thời gian chênh lệch
        const diffTime = nextWatering - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let status = 'pending';
        let timeLabel = '';

        if (diffDays < 0) {
          status = 'overdue';
          timeLabel = `Quá hạn ${Math.abs(diffDays)} ngày`;
        } else if (diffDays === 0) {
          status = 'today';
          timeLabel = 'Hôm nay';
        } else {
          status = 'upcoming';
          timeLabel = `Còn ${diffDays} ngày nữa`;
        }

        taskList.push({
          id: plant.id, // dùng luôn id của cây
          plantName: plant.name || plant.plantName,
          imageUrl: plant.imageUrl,
          location: plant.location || 'Chưa phân loại',
          action: 'Tưới nước',
          timeLabel: timeLabel,
          status: status,
          nextWatering: nextWatering
        });
      });
      
      // Sắp xếp: Quá hạn lên đầu, sau đó đến hôm nay, sau đó là tương lai
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
      // Cập nhật lastWatered thành thời điểm hiện tại
      await updateDoc(doc(db, 'plants', id), { 
        lastWatered: new Date().toISOString() 
      });
      
      Alert.alert('Hoàn thành', `Đã ghi nhận ${actionName.toLowerCase()} thành công!`);
      // Tải lại danh sách để tự động tính toán lại ngày giờ
      fetchSchedules();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái.');
    }
  };

  const renderSchedule = ({ item }) => {
    let statusColor = '#4CAF50'; // upcoming
    if (item.status === 'overdue') statusColor = '#F44336';
    if (item.status === 'today') statusColor = '#FF9800';

    return (
      <View style={styles.card}>
        <Image source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1416879598555-46700c0a9693?q=80&w=200&auto=format&fit=crop' }} style={styles.plantImage} />
        
        <View style={styles.cardInfo}>
          <Text style={styles.actionName}>{item.action}</Text>
          <Text style={styles.plantName}>{item.plantName}</Text>
          <View style={[styles.timeBadge, { backgroundColor: statusColor }]}>
             <Text style={styles.timeBadgeText}>{item.timeLabel}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.doneButton} onPress={() => handleMarkAsDone(item.id, item.action)}>
          <Text style={styles.doneButtonText}>Xong</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lịch chăm sóc</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#FF9800" style={{ marginTop: 50 }} />
      ) : tasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Tuyệt vời!</Text>
          <Text style={styles.emptySub}>Khu vườn của bạn chưa có lịch chăm sóc nào, hoặc bạn chưa thêm cây.</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={item => item.id}
          renderItem={renderSchedule}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fdf8e4' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#E65100', marginTop: 30, marginBottom: 20 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 3, alignItems: 'center' },
  plantImage: { width: 60, height: 60, borderRadius: 10, marginRight: 15 },
  cardInfo: { flex: 1 },
  actionName: { fontSize: 16, fontWeight: 'bold', color: '#E65100' },
  plantName: { fontSize: 14, color: '#333', marginTop: 2, marginBottom: 5 },
  timeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  timeBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  doneButton: { backgroundColor: '#4CAF50', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, marginLeft: 10 },
  doneButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 20, color: '#666', fontWeight: 'bold' },
  emptySub: { fontSize: 14, color: '#999', marginTop: 10, textAlign: 'center', paddingHorizontal: 20 }
});

export default ScheduleScreen;
