import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { takePhoto, pickImage } from '../services/imageService';
import { analyzePlantImage } from '../services/aiService'; // FIX #1: đúng tên hàm
import { uploadPlantImage, addPlant } from '../services/plantService';
import { AuthContext } from '../context/AuthContext';

const ScanScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // FIX #2: result sẽ là object
  const [saving, setSaving] = useState(false);

  const handleScan = async (source) => {
    let res;
    if (source === 'camera') {
      res = await takePhoto();
    } else {
      res = await pickImage();
    }

    if (res.success && res.uri) {
      setImageUri(res.uri);
      setImageBase64(res.base64);
      setResult(null);
    } else if (res.error) {
      Alert.alert('Lỗi', res.error);
    }
  };

  const analyzeImage = async () => {
    if (!imageBase64) return;
    setLoading(true);
    try {
      const aiResult = await analyzePlantImage(imageBase64); // FIX #1: đúng tên hàm
      if (aiResult.success) {
        setResult(aiResult.data); // data là object JSON
      } else {
        Alert.alert('Lỗi AI', aiResult.error);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể phân tích ảnh: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // FIX #3: Lưu thật vào Firestore
  const handleSaveToGarden = async () => {
    if (!result || !imageBase64 || !user) return;
    setSaving(true);
    try {
      const uploadRes = await uploadPlantImage(imageBase64, user.uid);
      if (!uploadRes.success) {
        Alert.alert('Lỗi', 'Không thể tải ảnh lên. Vui lòng thử lại.');
        return;
      }

      const plantData = {
        userId: user.uid,
        name: result.plantName,
        plantName: result.plantName,
        healthStatus: result.healthStatus,
        diseaseName: result.diseaseName || null,
        solution: result.solution || null,
        waterIntervalDays: parseInt(result.waterIntervalDays) || 2,
        imageUrl: uploadRes.url,
        storagePath: uploadRes.storagePath,
        location: 'Chưa phân loại',
        createdAt: new Date().toISOString(),
      };

      const saveRes = await addPlant(plantData);
      if (saveRes.success) {
        Alert.alert('Thành công!', 'Đã lưu cây vào Khu vườn của bạn.', [
          { text: 'OK', onPress: () => { setImageUri(null); setImageBase64(null); setResult(null); } }
        ]);
      } else {
        Alert.alert('Lỗi', saveRes.error);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu cây: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Bác sĩ cây trồng AI 🌿</Text>
      <Text style={styles.subtitle}>Chụp hoặc chọn ảnh để AI nhận diện cây và chuẩn đoán bệnh.</Text>

      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>Chưa có ảnh</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleScan('camera')}>
          <Text style={styles.actionButtonText}>📸 Chụp ảnh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleScan('gallery')}>
          <Text style={styles.actionButtonText}>🖼️ Thư viện</Text>
        </TouchableOpacity>
      </View>

      {imageUri && !result && (
        <TouchableOpacity
          style={[styles.analyzeButton, loading && styles.disabledButton]}
          onPress={analyzeImage}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.analyzeButtonText}>✨ Phân tích ngay</Text>}
        </TouchableOpacity>
      )}

      {/* FIX #2: Render đúng từng trường của object result */}
      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Kết quả phân tích:</Text>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>🌿 Tên cây:</Text>
            <Text style={styles.resultValue}>{result.plantName}</Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>💚 Tình trạng:</Text>
            <Text style={[styles.resultValue, {
              color: result.healthStatus?.toLowerCase().includes('khỏe') ? '#4CAF50' : '#FF9800'
            }]}>{result.healthStatus}</Text>
          </View>

          {result.diseaseName && result.diseaseName !== 'null' && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>🦠 Bệnh:</Text>
              <Text style={[styles.resultValue, { color: '#F44336' }]}>{result.diseaseName}</Text>
            </View>
          )}

          {result.solution && (
            <View style={styles.solutionBox}>
              <Text style={styles.solutionLabel}>💡 Giải pháp:</Text>
              <Text style={styles.solutionText}>{result.solution}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.disabledButton]}
            onPress={handleSaveToGarden}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveButtonText}>Thêm vào Khu vườn 🌱</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f0f7f0', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#2E7D32', marginTop: 30, marginBottom: 10 },
  subtitle: { textAlign: 'center', color: '#666', marginBottom: 20, paddingHorizontal: 10 },
  imageContainer: { width: '100%', height: 300, backgroundColor: '#e0e0e0', borderRadius: 15, overflow: 'hidden', marginBottom: 20 },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#999', fontSize: 16 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  actionButton: { flex: 1, backgroundColor: '#E8F5E9', padding: 15, borderRadius: 10, marginHorizontal: 5, alignItems: 'center', borderWidth: 1, borderColor: '#4CAF50' },
  actionButtonText: { color: '#2E7D32', fontWeight: 'bold' },
  analyzeButton: { width: '100%', backgroundColor: '#FF9800', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
  disabledButton: { opacity: 0.6 },
  analyzeButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  resultContainer: { width: '100%', backgroundColor: '#fff', padding: 20, borderRadius: 15, elevation: 3, marginBottom: 30 },
  resultTitle: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingBottom: 10 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  resultLabel: { fontSize: 14, color: '#666', flex: 1 },
  resultValue: { fontSize: 14, fontWeight: '600', color: '#333', flex: 2, textAlign: 'right' },
  solutionBox: { backgroundColor: '#FFF8E1', padding: 14, borderRadius: 10, marginTop: 10, marginBottom: 15 },
  solutionLabel: { fontSize: 14, fontWeight: 'bold', color: '#FF8F00', marginBottom: 6 },
  solutionText: { fontSize: 14, color: '#555', lineHeight: 22 },
  saveButton: { backgroundColor: '#4CAF50', padding: 14, borderRadius: 10, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default ScanScreen;
