import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { takePhoto, pickImage } from '../services/imageService';
import { identifyPlant } from '../services/aiService';

const ScanScreen = ({ navigation }) => {
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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
      // Gọi service AI để phân tích
      const aiResult = await identifyPlant(imageBase64);
      if (aiResult.success) {
        setResult(aiResult.data); // data chứa text phân tích từ Gemini
      } else {
        Alert.alert('Lỗi AI', aiResult.error);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể phân tích ảnh.');
    } finally {
      setLoading(false);
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

      {imageUri && (
        <TouchableOpacity 
          style={[styles.analyzeButton, loading && styles.disabledButton]} 
          onPress={analyzeImage}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.analyzeButtonText}>✨ Phân tích ngay</Text>}
        </TouchableOpacity>
      )}

      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Kết quả phân tích:</Text>
          <Text style={styles.resultText}>{result}</Text>
          <TouchableOpacity style={styles.saveButton} onPress={() => Alert.alert('Thành công', 'Đã lưu vào Khu vườn!')}>
            <Text style={styles.saveButtonText}>Thêm vào Khu vườn</Text>
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
  disabledButton: { opacity: 0.7 },
  analyzeButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  resultContainer: { width: '100%', backgroundColor: '#fff', padding: 20, borderRadius: 15, elevation: 3, marginBottom: 30 },
  resultTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  resultText: { fontSize: 15, color: '#444', lineHeight: 22, marginBottom: 15 },
  saveButton: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: 'bold' }
});

export default ScanScreen;
