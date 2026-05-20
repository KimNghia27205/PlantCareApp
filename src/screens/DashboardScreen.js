import React, { useContext, useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, 
  ActivityIndicator, ScrollView, Alert, Platform 
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { logoutUser } from '../services/authService';
import { takePhoto, pickImage } from '../services/imageService';
import { analyzePlantImage } from '../services/aiService';
import { uploadPlantImage, addPlant } from '../services/plantService';
import { Ionicons } from '@expo/vector-icons';

const DashboardScreen = () => {
  const { user } = useContext(AuthContext);
  
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // States hỗ trợ Camera thật trực tiếp trên Web
  const [showWebCamera, setShowWebCamera] = useState(false);
  const [webStream, setWebStream] = useState(null);
  const videoRef = useRef(null);

  // Dọn dẹp camera stream khi unmount
  useEffect(() => {
    return () => {
      if (webStream) {
        webStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [webStream]);

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm('Bạn có chắc chắn muốn đăng xuất?');
      if (confirmLogout) {
        await logoutUser();
      }
    } else {
      Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: async () => await logoutUser() }
      ]);
    }
  };

  // Chọn ảnh từ thư viện
  const handlePickImage = async () => {
    const result = await pickImage();
    if (result.success) {
      resetState();
      setImageUri(result.uri);
      setImageBase64(result.base64);
    } else if (result.error && result.error !== 'Hủy chọn ảnh') {
      if (Platform.OS === 'web') {
        window.alert('Lỗi: ' + result.error);
      } else {
        Alert.alert('Lỗi', result.error);
      }
    }
  };

  // Chụp ảnh bằng camera gốc/Web Camera
  const handleTakePhoto = async () => {
    resetState();
    if (Platform.OS === 'web') {
      // Mở Camera thật bằng HTML5 MediaDevices trên Web
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        setWebStream(stream);
        setShowWebCamera(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }, 100);
      } catch (err) {
        console.warn("Không thể truy cập camera trực tiếp:", err);
        // Fallback sang bộ chọn tệp camera mặc định của trình duyệt
        handleTakePhotoFallback();
      }
    } else {
      handleTakePhotoFallback();
    }
  };

  const handleTakePhotoFallback = async () => {
    const result = await takePhoto();
    if (result.success) {
      resetState();
      setImageUri(result.uri);
      setImageBase64(result.base64);
    } else if (result.error && result.error !== 'Hủy chụp ảnh') {
      Alert.alert('Lỗi', result.error);
    }
  };

  // Chụp ảnh từ khung hình Camera Web
  const handleCaptureWebPhoto = () => {
    if (videoRef.current && webStream) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const base64Str = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      
      setImageUri(dataUrl);
      setImageBase64(base64Str);
      
      stopWebCamera();
    }
  };

  // Tắt Camera Web
  const stopWebCamera = () => {
    if (webStream) {
      webStream.getTracks().forEach(track => track.stop());
      setWebStream(null);
    }
    setShowWebCamera(false);
  };

  const resetState = () => {
    setAnalysisResult(null);
    setImageUri(null);
    setImageBase64(null);
    stopWebCamera();
  };

  // Gửi ảnh cho Gemini AI phân tích
  const handleAnalyze = async () => {
    if (!imageBase64) return;
    
    setIsAnalyzing(true);
    const result = await analyzePlantImage(imageBase64);
    setIsAnalyzing(false);

    if (result.success) {
      setAnalysisResult(result.data);
    } else {
      if (Platform.OS === 'web') {
        window.alert('Lỗi phân tích: ' + result.error);
      } else {
        Alert.alert('Lỗi phân tích', result.error);
      }
    }
  };

  // Lưu vào Nhật ký cây trồng (Firestore)
  const handleSaveToDiary = async () => {
    if (!analysisResult || !imageBase64) return;
    
    setIsSaving(true);
    
    // 1. Upload ảnh lên Storage
    const uploadRes = await uploadPlantImage(imageBase64, user.uid);
    
    if (!uploadRes.success) {
      if (Platform.OS === 'web') {
        window.alert('Lỗi: Không thể tải ảnh lên máy chủ.');
      } else {
        Alert.alert('Lỗi', 'Không thể tải ảnh lên máy chủ.');
      }
      setIsSaving(false);
      return;
    }

    // 2. Lưu thông tin vào Firestore
    const plantData = {
      userId: user.uid,
      name: analysisResult.plantName,
      plantName: analysisResult.plantName,
      healthStatus: analysisResult.healthStatus,
      diseaseName: analysisResult.diseaseName || null,
      solution: analysisResult.solution || null,
      waterIntervalDays: parseInt(analysisResult.waterIntervalDays) || 2,
      imageUrl: uploadRes.url,
      storagePath: uploadRes.storagePath, // FIX: lưu path thật để xóa ảnh sau này
      location: 'Chưa phân loại',
      lastWatered: new Date().toISOString(),
    };

    const saveRes = await addPlant(plantData);
    setIsSaving(false);

    if (saveRes.success) {
      if (Platform.OS === 'web') {
        window.alert('Thành công! Cây đã được lưu vào nhật ký của bạn.');
      } else {
        Alert.alert('Thành công!', 'Cây đã được lưu vào nhật ký của bạn.');
      }
      resetState(); // Dọn dẹp màn hình sau khi lưu
    } else {
      if (Platform.OS === 'web') {
        window.alert('Lỗi: Không thể lưu vào nhật ký.');
      } else {
        Alert.alert('Lỗi', 'Không thể lưu vào nhật ký.');
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Xin chào,</Text>
          <Text style={styles.userName}>{user?.displayName || 'Nông dân AI'} 👋</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Banner */}
        <View style={styles.banner}>
          <Ionicons name="leaf" size={40} color="#fff" />
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Bác sĩ cây trồng AI</Text>
            <Text style={styles.bannerSub}>Chụp ảnh để chẩn đoán sâu bệnh ngay!</Text>
          </View>
        </View>

        {/* Khung Camera Web trực tiếp */}
        {Platform.OS === 'web' && showWebCamera && (
          <View style={styles.webCameraCard}>
            <Text style={styles.webCameraTitle}>📷 Khung ngắm Camera</Text>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              style={styles.webVideo} 
            />
            <View style={styles.webCameraActions}>
              <TouchableOpacity style={styles.webCancelBtn} onPress={stopWebCamera}>
                <Text style={styles.webCancelBtnText}>Hủy bỏ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.webCaptureBtn} onPress={handleCaptureWebPhoto}>
                <Ionicons name="camera" size={20} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.webCaptureBtnText}>Chụp ảnh</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Khu vực Chọn ảnh chính */}
        {!imageUri && !showWebCamera && (
          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.actionCard} onPress={handleTakePhoto}>
              <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="camera" size={32} color="#2E7D32" />
              </View>
              <Text style={styles.actionText}>Chụp ảnh mới</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={handlePickImage}>
              <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="images" size={32} color="#1565C0" />
              </View>
              <Text style={styles.actionText}>Chọn từ thư viện</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Preview Ảnh & Phân tích */}
        {imageUri && !showWebCamera && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            <TouchableOpacity style={styles.closeBtn} onPress={resetState}>
              <Ionicons name="close-circle" size={32} color="#fff" />
            </TouchableOpacity>

            {!analysisResult && (
              <TouchableOpacity 
                style={[styles.analyzeBtn, isAnalyzing && styles.btnDisabled]} 
                onPress={handleAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.analyzeBtnText}>AI Đang phân tích...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.analyzeBtnText}>Bắt đầu chẩn đoán</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Kết quả phân tích từ AI */}
        {analysisResult && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.resultTitle}>Kết quả chẩn đoán</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Tên cây:</Text>
              <Text style={styles.resultValue}>{analysisResult.plantName}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Tình trạng:</Text>
              <Text style={[
                styles.resultValue, 
                { color: analysisResult.healthStatus.toLowerCase().includes('khỏe') ? '#4CAF50' : '#FF9800' }
              ]}>
                {analysisResult.healthStatus}
              </Text>
            </View>

            {analysisResult.diseaseName && analysisResult.diseaseName !== 'null' && (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Bệnh phát hiện:</Text>
                <Text style={[styles.resultValue, { color: '#F44336', fontWeight: 'bold' }]}>
                  {analysisResult.diseaseName}
                </Text>
              </View>
            )}

            <View style={styles.solutionBox}>
              <Text style={styles.solutionLabel}>💡 Giải pháp xử lý:</Text>
              <Text style={styles.solutionText}>{analysisResult.solution}</Text>
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, isSaving && styles.btnDisabled]} 
              onPress={handleSaveToDiary}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.analyzeBtnText}>Lưu vào nhật ký</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9F5' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  greeting: { fontSize: 14, color: '#666' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  logoutBtn: { padding: 8, backgroundColor: '#FFEBEA', borderRadius: 50 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  banner: {
    flexDirection: 'row', backgroundColor: '#4CAF50', borderRadius: 16,
    padding: 20, alignItems: 'center', marginBottom: 24,
    shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  bannerTextContainer: { marginLeft: 16, flex: 1 },
  bannerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  bannerSub: { color: '#E8F5E9', fontSize: 14 },

  actionContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  actionCard: {
    backgroundColor: '#fff', flex: 0.48, borderRadius: 16, padding: 24,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  iconBox: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  actionText: { fontSize: 16, fontWeight: '600', color: '#333', textAlign: 'center' },

  previewContainer: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  previewImage: { width: '100%', height: 300, borderRadius: 12, resizeMode: 'cover' },
  closeBtn: { position: 'absolute', top: 24, right: 24, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 4 },
  analyzeBtn: {
    flexDirection: 'row', backgroundColor: '#2196F3', borderRadius: 12, padding: 16,
    justifyContent: 'center', alignItems: 'center', marginTop: 16,
  },
  analyzeBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnDisabled: { opacity: 0.7 },

  resultCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginTop: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
    borderWidth: 1, borderColor: '#E8F5E9'
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  resultTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 8 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  resultLabel: { fontSize: 15, color: '#666', flex: 1 },
  resultValue: { fontSize: 15, fontWeight: '600', color: '#333', flex: 2, textAlign: 'right' },
  solutionBox: { backgroundColor: '#FFF8E1', padding: 16, borderRadius: 12, marginTop: 12 },
  solutionLabel: { fontSize: 15, fontWeight: 'bold', color: '#FF8F00', marginBottom: 8 },
  solutionText: { fontSize: 15, color: '#555', lineHeight: 22 },
  
  saveBtn: {
    flexDirection: 'row', backgroundColor: '#4CAF50', borderRadius: 12, padding: 16,
    justifyContent: 'center', alignItems: 'center', marginTop: 20,
  },

  // Styles cho Camera Web
  webCameraCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  webCameraTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  webVideo: { width: '100%', height: 350, borderRadius: 12, backgroundColor: '#000', objectFit: 'cover' },
  webCameraActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  webCancelBtn: { flex: 0.45, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', alignItems: 'center' },
  webCancelBtnText: { fontSize: 15, color: '#666', fontWeight: '600' },
  webCaptureBtn: { flex: 0.48, backgroundColor: '#2E7D32', paddingVertical: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  webCaptureBtnText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});

export default DashboardScreen;
