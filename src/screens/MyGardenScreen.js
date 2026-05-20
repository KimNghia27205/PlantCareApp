import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { deletePlant } from '../services/plantService'; // FIX: dùng service để xóa cả ảnh lẫn doc
import { AuthContext } from '../context/AuthContext';

const MyGardenScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlants();
  }, [user?.uid]); // FIX: dùng user?.uid thay vì toàn bộ user object

  const fetchPlants = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'plants'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const plantList = [];
      querySnapshot.forEach((doc) => {
        plantList.push({ id: doc.id, ...doc.data() });
      });
      setPlants(plantList);
    } catch (error) {
      console.error("Lỗi tải danh sách cây:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa cây này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          // FIX: dùng deletePlant từ service để xóa cả ảnh trên Storage
          const result = await deletePlant(id);
          if (result.success) {
            setPlants(prev => prev.filter(p => p.id !== id));
          } else {
            Alert.alert('Lỗi', result.error || 'Không thể xóa cây.');
          }
        }
      }
    ]);
  };

  const renderPlant = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.imageUrl || 'https://via.placeholder.com/100' }} style={styles.plantImage} />
      <View style={styles.cardContent}>
        <Text style={styles.plantName}>{item.name || item.plantName}</Text>
        <Text style={styles.plantLocation}>📍 Vị trí: {item.location || 'Chưa phân loại'}</Text>
        <Text style={styles.plantStatus}>
          {item.healthStatus?.includes('Khỏe') ? '💚' : '⚠️'} {item.healthStatus || 'Tốt'}
        </Text>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
        <Text style={styles.deleteText}>Xóa</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Khu vườn của tôi</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
      ) : plants.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Khu vườn của bạn đang trống.</Text>
          <Text style={styles.emptySubText}>Hãy sang tab Quét AI để thêm cây mới nhé!</Text>
        </View>
      ) : (
        <FlatList
          data={plants}
          keyExtractor={item => item.id}
          renderItem={renderPlant}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => Alert.alert('Tính năng', 'Sắp tới sẽ mở form thêm cây thủ công!')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f0f7f0' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#2E7D32', marginTop: 30, marginBottom: 20 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 3, alignItems: 'center' },
  plantImage: { width: 70, height: 70, borderRadius: 10, marginRight: 15 },
  cardContent: { flex: 1 },
  plantName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  plantLocation: { color: '#666', marginTop: 5, fontSize: 13 },
  plantStatus: { color: '#4CAF50', marginTop: 5, fontSize: 13, fontWeight: '500' },
  deleteButton: { padding: 10 },
  deleteText: { color: '#FF5252', fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#666', fontWeight: 'bold' },
  emptySubText: { fontSize: 14, color: '#999', marginTop: 10 },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#4CAF50', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#fff', fontSize: 30, fontWeight: 'bold', marginTop: -2 }
});

export default MyGardenScreen;
