import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, Modal, TextInput, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getPlantLogs, addPlantLog, deletePlantLog } from '../services/plantService';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const PlantJournalScreen = ({ route, navigation }) => {
  const { plant } = route.params;
  const { user } = useContext(AuthContext);
  const { theme, isDark } = useTheme();
  const t = theme;
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [modalVisible, setModalVisible] = useState(false);
  const [note, setNote] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const result = await getPlantLogs(plant.id);
    if (result.success) {
      setLogs(result.data);
    }
    setLoading(false);
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Quyền truy cập", "Bạn cần cấp quyền truy cập thư viện ảnh để đính kèm hình ảnh.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0]);
    }
  };

  const handleSaveLog = async () => {
    if (!note.trim() && !imageUri) {
      Alert.alert('Lỗi', 'Vui lòng nhập ghi chú hoặc chọn ảnh.');
      return;
    }

    setSubmitting(true);
    const logData = {
      plantId: plant.id,
      userId: user.uid,
      note: note.trim(),
    };

    const base64Data = imageUri ? imageUri.base64 : null;
    const result = await addPlantLog(logData, base64Data);

    if (result.success) {
      setNote('');
      setImageUri(null);
      setModalVisible(false);
      fetchLogs();
    } else {
      Alert.alert('Lỗi', result.error);
    }
    setSubmitting(false);
  };

  const handleDeleteLog = (logId) => {
    Alert.alert('Xóa ghi chú', 'Bạn có chắc chắn muốn xóa nhật ký này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        const result = await deletePlantLog(logId);
        if (result.success) {
          fetchLogs();
        } else {
          Alert.alert('Lỗi', result.error);
        }
      }}
    ]);
  };

  const renderItem = ({ item }) => {
    const dateObj = new Date(item.date);
    const dateString = dateObj.toLocaleDateString('vi-VN');
    const timeString = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[styles.logCard, { backgroundColor: t.cardBg, borderColor: t.dark ? '#2A2A2A' : '#e8f5e9', borderWidth: t.dark ? 1 : 0 }]}>
        <View style={styles.logHeader}>
          <Text style={[styles.logDate, { color: t.subText }]}>{dateString} - {timeString}</Text>
          <TouchableOpacity onPress={() => handleDeleteLog(item.id)}>
            <Text style={styles.deleteText}>Xóa</Text>
          </TouchableOpacity>
        </View>
        {item.note ? <Text style={[styles.logNote, { color: t.text }]}>{item.note}</Text> : null}
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.logImage} />
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: t.dark ? 1 : 0, borderBottomColor: t.tabBarBorder, elevation: t.dark ? 0 : 3 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={[styles.backButtonText, { color: '#10B981' }]}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]} numberOfLines={1}>{plant.name || plant.plantName}</Text>
        <View style={{ width: 80 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 50 }} />
      ) : logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: t.text }]}>Chưa có ghi chú nào.</Text>
          <Text style={[styles.emptySubText, { color: t.subText }]}>Bấm nút + để thêm nhật ký theo dõi!</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 160 }}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: '#10B981' }]} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add Log Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: t.cardBg, borderColor: t.dark ? '#333' : '#eee', borderWidth: t.dark ? 1 : 0 }]}>
            <Text style={[styles.modalTitle, { color: '#10B981' }]}>Thêm nhật ký</Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: t.dark ? '#121212' : '#fff', borderColor: t.inputBorder, color: t.text }]}
              placeholder="Nhập ghi chú về sự phát triển..."
              placeholderTextColor={t.subText}
              multiline
              numberOfLines={4}
              value={note}
              onChangeText={setNote}
            />

            <TouchableOpacity style={[styles.imagePickerBtn, { backgroundColor: t.dark ? '#254E27' : '#e8f5e9' }]} onPress={pickImage}>
              <Text style={[styles.imagePickerText, { color: t.dark ? '#A3E635' : '#2E7D32' }]}>
                {imageUri ? '🔄 Thay đổi ảnh' : '📸 Thêm ảnh chụp hiện tại'}
              </Text>
            </TouchableOpacity>

            {imageUri && (
              <Image source={{ uri: imageUri.uri }} style={styles.previewImage} />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.cancelBtn, { backgroundColor: t.dark ? '#2a2a2a' : '#eee' }]} 
                onPress={() => {
                  setModalVisible(false);
                  setNote('');
                  setImageUri(null);
                }}>
                <Text style={[styles.cancelBtnText, { color: t.subText }]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#10B981' }]} onPress={handleSaveLog} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Lưu</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f7f0' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    paddingTop: 50, 
    paddingBottom: 15, 
    paddingHorizontal: 20,
    elevation: 3 
  },
  backButton: { width: 80 },
  backButtonText: { color: '#4CAF50', fontWeight: 'bold' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#2E7D32', textAlign: 'center' },
  logCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  logDate: { fontSize: 13, color: '#666', fontWeight: 'bold' },
  deleteText: { color: '#FF5252', fontSize: 13, fontWeight: 'bold' },
  logNote: { fontSize: 15, color: '#333', marginBottom: 10 },
  logImage: { width: '100%', height: 200, borderRadius: 8, resizeMode: 'cover' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#666', fontWeight: 'bold' },
  emptySubText: { fontSize: 14, color: '#999', marginTop: 10 },
  fab: { position: 'absolute', bottom: 95, right: 20, backgroundColor: '#4CAF50', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#fff', fontSize: 30, fontWeight: 'bold', marginTop: -2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: '#fff', borderRadius: 15, padding: 25, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32', marginBottom: 20, textAlign: 'center' },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 15, 
    fontSize: 16, 
    textAlignVertical: 'top',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  imagePickerBtn: { backgroundColor: '#e8f5e9', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
  imagePickerText: { color: '#2E7D32', fontWeight: 'bold' },
  previewImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 15, resizeMode: 'cover' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cancelBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#eee', borderRadius: 8, marginRight: 10 },
  cancelBtnText: { color: '#333', fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#4CAF50', borderRadius: 8, marginLeft: 10 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' }
});

export default PlantJournalScreen;
