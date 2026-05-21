import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  ActivityIndicator, Image, Modal, TextInput, Platform, ScrollView
} from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { deletePlant, addPlant } from '../services/plantService';
import { pickImage, uploadImageToStorage } from '../services/imageService';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const MyGardenScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const { theme: t } = useTheme();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedPlantId, setSelectedPlantId] = useState(null);
  const [plantName, setPlantName] = useState('');
  const [location, setLocation] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => { fetchPlants(); }, [user?.uid]);

  const fetchPlants = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'plants'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      setPlants(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDelete = (id) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa cây này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        const result = await deletePlant(id);
        if (result.success) setPlants(prev => prev.filter(p => p.id !== id));
        else Alert.alert('Lỗi', result.error || 'Không thể xóa cây.');
      }}
    ]);
  };

  const openAddModal = () => {
    setEditMode(false); setPlantName(''); setLocation('');
    setSelectedPlantId(null); setImageUri(null);
    setModalVisible(true);
  };

  const openEditModal = (plant) => {
    setEditMode(true);
    setPlantName(plant.name || plant.plantName || '');
    setLocation(plant.location || '');
    setSelectedPlantId(plant.id);
    setImageUri(plant.imageUrl || null);
    setModalVisible(true);
  };

  const handlePickImage = async () => {
    const result = await pickImage();
    if (result.success) setImageUri(result.uri);
  };

  const handleSavePlant = async () => {
    if (!plantName.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập tên cây'); return; }
    setLoading(true);
    try {
      let finalImageUrl = typeof imageUri === 'string' && imageUri.startsWith('http') ? imageUri : null;

      // Upload ảnh mới nếu là local URI (không phải URL http)
      if (imageUri && !imageUri.startsWith('http')) {
        setUploadingImage(true);
        const uploadRes = await uploadImageToStorage(
          imageUri,
          `plants/${user.uid}/${Date.now()}.jpg`
        );
        setUploadingImage(false);
        if (uploadRes.success) finalImageUrl = uploadRes.url;
      }

      if (editMode) {
        const ref = doc(db, 'plants', selectedPlantId);
        const updateData = { name: plantName, plantName, location: location || 'Chưa phân loại' };
        if (finalImageUrl) updateData.imageUrl = finalImageUrl;
        await updateDoc(ref, updateData);
        setPlants(prev => prev.map(p =>
          p.id === selectedPlantId ? { ...p, ...updateData } : p
        ));
      } else {
        const result = await addPlant({
          userId: user.uid, name: plantName, plantName,
          healthStatus: 'Khỏe mạnh',
          location: location || 'Chưa phân loại',
          imageUrl: finalImageUrl || '',
          lastWatered: new Date().toISOString(),
        });
        if (result.success) fetchPlants();
        else Alert.alert('Lỗi', result.error);
      }
      setModalVisible(false);
      setImageUri(null);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu thông tin cây.');
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  const healthyCount = plants.filter(p => p.healthStatus?.includes('Khỏe')).length;
  const sickCount = plants.length - healthyCount;

  const renderPlant = ({ item }) => {
    const isHealthy = item.healthStatus?.toLowerCase().includes('khỏe');
    return (
      <TouchableOpacity style={[styles.card, { backgroundColor: t.cardBg }]} onPress={() => openEditModal(item)} activeOpacity={0.85}>
        <Image
          source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1416879598555-46700c0a9693?q=80&w=400&auto=format&fit=crop' }}
          style={styles.plantImage}
        />
        <View style={[styles.statusBadge, { backgroundColor: isHealthy ? '#E8F5E9' : '#FFF3E0' }]}>
          <View style={[styles.statusDot, { backgroundColor: isHealthy ? '#4CAF50' : '#FF9800' }]} />
          <Text style={[styles.statusBadgeText, { color: isHealthy ? '#2E7D32' : '#E65100' }]}>
            {isHealthy ? 'Khỏe mạnh' : (item.healthStatus || 'Cần chăm sóc')}
          </Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.plantName, { color: t.text }]} numberOfLines={1}>{item.name || item.plantName}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={13} color={t.subText} />
            <Text style={[styles.infoText, { color: t.subText }]} numberOfLines={1}>{item.location || 'Chưa phân loại'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="water-outline" size={13} color="#42A5F5" />
            <Text style={[styles.infoText, { color: t.subText }]}>Tưới mỗi {item.waterIntervalDays || 2} ngày</Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
              <Ionicons name="pencil" size={14} color="#3E8E41" />
              <Text style={styles.editBtnText}>Sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
              <Ionicons name="trash-outline" size={14} color="#FF5252" />
              <Text style={styles.deleteBtnText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { backgroundColor: t.bg }]}>
        <Text style={styles.title}>Khu vườn của tôi</Text>
        <TouchableOpacity style={styles.addHeaderBtn} onPress={openAddModal}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {plants.length > 0 && (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: t.cardBg }]}>
            <Text style={styles.statNumber}>{plants.length}</Text>
            <Text style={[styles.statLabel, { color: t.subText }]}>🌿 Tổng cây</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: t.cardBg }]}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{healthyCount}</Text>
            <Text style={[styles.statLabel, { color: t.subText }]}>💚 Khỏe mạnh</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: t.cardBg }]}>
            <Text style={[styles.statNumber, { color: '#FF9800' }]}>{sickCount}</Text>
            <Text style={[styles.statLabel, { color: t.subText }]}>⚠️ Cần chăm sóc</Text>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 60 }} />
      ) : plants.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: t.cardBg }]}>
            <Text style={{ fontSize: 60 }}>🪴</Text>
          </View>
          <Text style={[styles.emptyTitle, { color: t.text }]}>Khu vườn đang trống</Text>
          <Text style={[styles.emptySubText, { color: t.subText }]}>Thêm cây đầu tiên của bạn bằng cách{'\n'}dùng AI quét hoặc thêm thủ công</Text>
          <View style={styles.emptyActions}>
            <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('ScanAI')}>
              <Ionicons name="scan" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.scanBtnText}>Quét AI</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.manualBtn, { backgroundColor: t.cardBg, borderColor: '#3E8E41' }]} onPress={openAddModal}>
              <Ionicons name="add" size={18} color="#3E8E41" style={{ marginRight: 6 }} />
              <Text style={styles.manualBtnText}>Thêm thủ công</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={plants}
          keyExtractor={item => item.id}
          renderItem={renderPlant}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ paddingBottom: 140, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {plants.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={openAddModal}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: t.cardBg }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: '#2E7D32' }]}>
              {editMode ? '✏️ Chỉnh sửa cây' : '🌱 Thêm cây mới'}
            </Text>

            {/* Phần chọn ảnh */}
            <Text style={[styles.label, { color: t.subText }]}>Ảnh cây</Text>
            <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8}>
              {imageUri && !imageUri.startsWith('http') || (imageUri && imageUri.startsWith('http')) ? (
                <View style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setImageUri(null)}
                  >
                    <Ionicons name="close-circle" size={22} color="#FF5252" />
                  </TouchableOpacity>
                  <View style={styles.changeImageOverlay}>
                    <Ionicons name="camera" size={18} color="#fff" />
                    <Text style={styles.changeImageText}>Đổi ảnh</Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.imagePicker, { backgroundColor: t.bg, borderColor: t.inputBorder }]}>
                  <Ionicons name="image-outline" size={30} color={t.subText} />
                  <Text style={[styles.imagePickerText, { color: t.subText }]}>Nhấn để chọn ảnh</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={[styles.label, { color: t.subText }]}>Tên cây</Text>
            <TextInput
              style={[styles.input, { backgroundColor: t.bg, borderColor: t.inputBorder, color: t.text }]}
              placeholder="VD: Cây trầu bà..."
              placeholderTextColor={t.subText}
              value={plantName}
              onChangeText={setPlantName}
            />

            <Text style={[styles.label, { color: t.subText }]}>Vị trí đặt chậu</Text>
            <TextInput
              style={[styles.input, { backgroundColor: t.bg, borderColor: t.inputBorder, color: t.text }]}
              placeholder="VD: Ban công, phòng khách..."
              placeholderTextColor={t.subText}
              value={location}
              onChangeText={setLocation}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: t.dark ? '#2a2a2a' : '#f0f0f0' }]}
                onPress={() => { setModalVisible(false); setImageUri(null); }}
              >
                <Text style={[styles.cancelBtnText, { color: t.subText }]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSavePlant} disabled={loading || uploadingImage}>
                {(loading || uploadingImage)
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>💾 Lưu lại</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const CARD_W = '47%';

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 55 : 35, paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2E7D32' },
  addHeaderBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#3E8E41',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#3E8E41', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 4,
  },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 8 },
  statCard: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  row: { justifyContent: 'space-between', marginBottom: 14 },
  card: { width: CARD_W, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  plantImage: { width: '100%', height: 130, backgroundColor: '#e8f5e9' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, marginHorizontal: 10, marginTop: 8, borderRadius: 20, alignSelf: 'flex-start' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold' },
  cardBody: { padding: 10 },
  plantName: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  infoText: { fontSize: 11, marginLeft: 3, flex: 1 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 6 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 8, backgroundColor: '#E8F5E9' },
  editBtnText: { color: '#3E8E41', fontSize: 11, fontWeight: 'bold', marginLeft: 3 },
  deleteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 8, backgroundColor: '#FFEBEE' },
  deleteBtnText: { color: '#FF5252', fontSize: 11, fontWeight: 'bold', marginLeft: 3 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  emptyIcon: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  emptySubText: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  emptyActions: { flexDirection: 'row', gap: 12 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3E8E41', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  scanBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  manualBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  manualBtnText: { color: '#3E8E41', fontWeight: 'bold', fontSize: 14 },
  fab: { position: 'absolute', bottom: 95, right: 20, backgroundColor: '#3E8E41', width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', shadowColor: '#3E8E41', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 7 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },

  // Image picker styles
  imagePicker: { height: 100, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 14, gap: 6 },
  imagePickerText: { fontSize: 13 },
  imagePreviewWrapper: { position: 'relative', marginBottom: 14, borderRadius: 12, overflow: 'hidden' },
  imagePreview: { width: '100%', height: 140, resizeMode: 'cover' },
  removeImageBtn: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 11 },
  changeImageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 6, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  changeImageText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  input: { borderWidth: 1, borderRadius: 10, padding: 13, marginBottom: 16, fontSize: 15 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 12 },
  cancelBtnText: { fontWeight: 'bold', fontSize: 15 },
  saveBtn: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: '#3E8E41', borderRadius: 12 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});

export default MyGardenScreen;
