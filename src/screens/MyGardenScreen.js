import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image, Modal, TextInput 
} from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { deletePlant, addPlant } from '../services/plantService'; 
import { AuthContext } from '../context/AuthContext';

const MyGardenScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedPlantId, setSelectedPlantId] = useState(null);
  
  // Form states
  const [plantName, setPlantName] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    fetchPlants();
  }, [user?.uid]);

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

  const openAddModal = () => {
    setEditMode(false);
    setPlantName('');
    setLocation('');
    setSelectedPlantId(null);
    setModalVisible(true);
  };

  const openEditModal = (plant) => {
    setEditMode(true);
    setPlantName(plant.name || plant.plantName || '');
    setLocation(plant.location || '');
    setSelectedPlantId(plant.id);
    setModalVisible(true);
  };

  const handleSavePlant = async () => {
    if (!plantName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên cây');
      return;
    }
    
    setLoading(true);
    try {
      if (editMode) {
        // Update existing plant
        const plantRef = doc(db, 'plants', selectedPlantId);
        await updateDoc(plantRef, {
          name: plantName,
          location: location || 'Chưa phân loại'
        });
        
        // Cập nhật state local
        setPlants(prev => prev.map(p => 
          p.id === selectedPlantId ? { ...p, name: plantName, location: location || 'Chưa phân loại' } : p
        ));
      } else {
        // Add new manual plant
        const newPlantData = {
          userId: user.uid,
          name: plantName,
          plantName: plantName,
          healthStatus: 'Khỏe mạnh', // Mặc định
          location: location || 'Chưa phân loại',
          lastWatered: new Date().toISOString(),
        };
        const result = await addPlant(newPlantData);
        if (result.success) {
          fetchPlants(); // Reload from server
        } else {
          Alert.alert('Lỗi', result.error);
        }
      }
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu thông tin cây.');
    } finally {
      setLoading(false);
    }
  };

  const renderPlant = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openEditModal(item)}>
      <Image source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1416879598555-46700c0a9693?q=80&w=200&auto=format&fit=crop' }} style={styles.plantImage} />
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
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Khu vườn của tôi</Text>
      
      {loading && !modalVisible ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
      ) : plants.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Khu vườn của bạn đang trống.</Text>
          <Text style={styles.emptySubText}>Bấm nút + bên dưới để thêm cây mới nhé!</Text>
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
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal Thêm/Sửa Cây */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editMode ? 'Chỉnh sửa cây' : 'Thêm cây thủ công'}</Text>
            
            <Text style={styles.label}>Tên cây:</Text>
            <TextInput 
              style={styles.input} 
              placeholder="VD: Cây trầu bà..." 
              value={plantName}
              onChangeText={setPlantName}
            />

            <Text style={styles.label}>Vị trí đặt chậu:</Text>
            <TextInput 
              style={styles.input} 
              placeholder="VD: Ban công, phòng khách..." 
              value={location}
              onChangeText={setLocation}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSavePlant} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Lưu</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  fabText: { color: '#fff', fontSize: 30, fontWeight: 'bold', marginTop: -2 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 15, padding: 25, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cancelBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#eee', borderRadius: 8, marginRight: 10 },
  cancelBtnText: { color: '#333', fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#4CAF50', borderRadius: 8, marginLeft: 10 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' }
});

export default MyGardenScreen;
