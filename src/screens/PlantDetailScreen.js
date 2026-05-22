import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updatePlant, getPlantLogs, addPlantLog } from '../services/plantService';
import { supabase } from '../services/supabaseClient';
import { AuthContext } from '../context/AuthContext';

const { width: windowWidth } = Dimensions.get('window');
const width = Platform.OS === 'web' ? Math.min(windowWidth, 420) : windowWidth;

const getCareSpecs = (plantName = '') => {
  const name = (plantName || '').toLowerCase();
  if (name.includes('sen đá') || name.includes('succulent') || name.includes('đá')) {
    return {
      sunlight: 'Nắng nhiều',
      temp: '15 - 30°C',
    };
  }
  if (name.includes('trầu bà') || name.includes('pothos') || name.includes('trầu')) {
    return {
      sunlight: 'Bán phần',
      temp: '18 - 28°C',
    };
  }
  if (name.includes('lưỡi hổ') || name.includes('snake')) {
    return {
      sunlight: 'Ít nắng',
      temp: '15 - 32°C',
    };
  }
  if (name.includes('kim tiền') || name.includes('zz')) {
    return {
      sunlight: 'Bán phần',
      temp: '18 - 26°C',
    };
  }
  if (name.includes('xương rồng') || name.includes('cactus')) {
    return {
      sunlight: 'Trực tiếp',
      temp: '18 - 35°C',
    };
  }
  if (name.includes('nha đam') || name.includes('aloe')) {
    return {
      sunlight: 'Nắng nhiều',
      temp: '15 - 35°C',
    };
  }
  if (name.includes('hồng') || name.includes('rose') || name.includes('hoa')) {
    return {
      sunlight: 'Nắng trực tiếp',
      temp: '18 - 32°C',
    };
  }
  // Default values
  return {
    sunlight: 'Bán phần',
    temp: '18 - 26°C',
  };
};

const PlantDetailScreen = ({ route, navigation }) => {
  const { plant: initialPlant, plantId } = route?.params || {};
  const { user } = useContext(AuthContext);
  
  const [plant, setPlant] = useState(initialPlant || null);
  const [loading, setLoading] = useState(!initialPlant);
  const [isWatered, setIsWatered] = useState(false);
  const [latestLog, setLatestLog] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Time calculations
  const lastWateredDate = plant?.lastWatered ? new Date(plant.lastWatered) : null;
  const diffTime = lastWateredDate ? Math.abs(new Date() - lastWateredDate) : 0;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const interval = plant?.waterIntervalDays || 2;
  const isOverdue = diffDays >= interval;

  const careSpecs = getCareSpecs(plant?.plantName || plant?.name);

  useEffect(() => {
    if (plant) {
      if (diffDays === 0) {
        setIsWatered(true);
      } else {
        setIsWatered(false);
      }
    }
  }, [plant?.lastWatered, diffDays]);

  const fetchLatestLog = async (targetPlantId) => {
    setLoadingLogs(true);
    try {
      const result = await getPlantLogs(targetPlantId);
      if (result.success && result.data && result.data.length > 0) {
        setLatestLog(result.data[0]);
      } else {
        setLatestLog(null);
      }
    } catch (err) {
      console.warn("Lỗi tải nhật ký chi tiết cây:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      let activePlant = plant;
      const targetPlantId = plantId || initialPlant?.id;

      if (!activePlant && targetPlantId) {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('plants')
            .select('*')
            .eq('id', targetPlantId)
            .single();

          if (error) throw error;
          if (data) {
            const mapped = {
              id: data.id,
              userId: data.user_id,
              name: data.name,
              plantName: data.plant_name || data.name,
              healthStatus: data.health_status,
              diseaseName: data.disease_name,
              solution: data.solution,
              waterIntervalDays: data.water_interval_days,
              imageUrl: data.image_url,
              storagePath: data.storage_path,
              location: data.location,
              lastWatered: data.last_watered,
              createdAt: data.created_at
            };
            setPlant(mapped);
            activePlant = mapped;
          }
        } catch (err) {
          console.error("Lỗi lấy thông tin cây từ DB:", err);
          Alert.alert("Lỗi", "Không thể lấy thông tin chi tiết cây trồng từ máy chủ.");
        } finally {
          setLoading(false);
        }
      }

      if (activePlant) {
        await fetchLatestLog(activePlant.id);
      }
    };

    loadData();
  }, [plantId, initialPlant?.id]);

  useEffect(() => {
    const targetPlantId = plantId || initialPlant?.id || plant?.id;
    if (!targetPlantId) return;

    const unsubscribe = navigation.addListener('focus', () => {
      fetchLatestLog(targetPlantId);
    });

    return unsubscribe;
  }, [navigation, plantId, initialPlant?.id, plant?.id]);

  const handleWaterPress = async () => {
    if (!plant) return;
    setIsWatered(true);
    const updatedLastWatered = new Date().toISOString();
    setPlant(prev => ({
      ...prev,
      lastWatered: updatedLastWatered,
    }));

    const res = await updatePlant(plant.id, { lastWatered: updatedLastWatered });
    if (res.success) {
      Alert.alert('Thành công', `🎉 Đã ghi nhận lịch tưới nước cho ${plant.plantName || plant.name}!`);
    } else {
      Alert.alert('Lỗi', 'Không thể cập nhật lịch tưới nước lên máy chủ.');
    }
  };

  const handleQuickWaterPress = () => {
    if (isWatered) {
      Alert.alert('Thông báo', 'Cây đã được tưới đầy đủ nước hôm nay rồi! Bạn không cần tưới thêm đâu nhé. 💧');
    } else {
      handleWaterPress();
    }
  };

  const handleFertilizePress = () => {
    if (!plant) return;
    Alert.alert(
      'Xác nhận bón phân',
      `Bạn có muốn ghi nhận đã bón phân định kỳ cho cây ${plant.plantName || plant.name} hôm nay không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý',
          onPress: async () => {
            try {
              const res = await addPlantLog({
                plantId: plant.id,
                userId: user?.uid || plant.userId,
                note: `🪴 Đã bón phân định kỳ: Bổ sung chất dinh dưỡng hữu cơ và các khoáng chất thiết yếu giúp bộ rễ phát triển chắc khỏe và lá xanh tươi.`,
                date: new Date().toISOString()
              });
              if (res.success) {
                Alert.alert('Thành công', `🎉 Đã ghi nhận bón phân thành công cho ${plant.plantName || plant.name}!`);
                await fetchLatestLog(plant.id);
              } else {
                Alert.alert('Lỗi', 'Không thể ghi nhận bón phân lên máy chủ.');
              }
            } catch (error) {
              console.error("Lỗi khi bón phân:", error);
              Alert.alert('Lỗi', 'Đã xảy ra lỗi khi ghi nhận bón phân.');
            }
          }
        }
      ]
    );
  };

  const handleNavigationToJournal = () => {
    if (!plant) return;
    navigation.navigate('MainTabs', {
      screen: 'MyGarden',
      params: {
        screen: 'PlantJournal',
        params: { plant }
      }
    });
  };

  const handleCameraQuickAction = () => {
    if (!plant) return;
    navigation.navigate('MainTabs', {
      screen: 'MyGarden',
      params: {
        screen: 'PlantJournal',
        params: { plant, autoTakePhoto: true }
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Đang tải thông tin cây...</Text>
      </SafeAreaView>
    );
  }

  if (!plant) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorText}>Không tìm thấy thông tin cây trồng.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isHealthy = plant.healthStatus?.toLowerCase().includes('khỏe') ?? true;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. HERO SECTION (Top 30% of screen) */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: plant.imageUrl || 'https://images.unsplash.com/photo-1416879598555-46700c0a9693?q=80&w=400&auto=format&fit=crop' }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          
          {/* Top Bar Navigation Overlaid */}
          <View style={styles.topNavigation}>
            <TouchableOpacity 
              style={styles.circleIconButton}
              onPress={() => navigation?.goBack()}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.circleIconButton}>
              <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Dark Overlay Layers for Text Contrast & Premium Aesthetic */}
          <View style={styles.gradientOverlayTop} />
          <View style={styles.gradientOverlayBottom} />

          {/* Overlaid Hero Content */}
          <View style={styles.heroTextContainer}>
            <View style={[styles.badgeContainer, !isHealthy && { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
              <View style={[styles.badgeDot, !isHealthy && { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.badgeText, !isHealthy && { color: '#EF4444' }]}>
                {plant.healthStatus || 'Không rõ'}
              </Text>
            </View>
            <Text style={styles.plantTitle}>{plant.plantName || plant.name}</Text>
            <Text style={styles.plantSubTitle}>
              📍 {plant.location || 'Khu vườn của tôi'}
            </Text>
          </View>
        </View>

        {/* SCREEN BODY CONTENT */}
        <View style={styles.bodyContainer}>
          
          {/* 2. SMART ALERT CARD (Action focus) */}
          <View style={styles.alertCard}>
            <View style={styles.alertHeaderRow}>
              <View style={[styles.alertIconCircle, !isWatered && isOverdue && { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                <Ionicons 
                  name={isWatered ? "checkmark-circle" : "water"} 
                  size={20} 
                  color={isWatered ? "#10B981" : (isOverdue ? "#EF4444" : "#10B981")} 
                />
              </View>
              <View style={styles.alertTextContainer}>
                <Text style={styles.alertTitle}>
                  {isWatered ? 'Đã đủ nước!' : `${plant.plantName || plant.name} đang khát!`}
                </Text>
                <Text style={styles.alertSubtitle}>
                  {isWatered 
                    ? 'Cây đã được tưới nước đầy đủ hôm nay. Hãy tiếp tục theo dõi!' 
                    : (diffDays > 0 
                        ? `Đã ${diffDays} ngày chưa tưới nước cho cây (Lịch tưới mỗi ${interval} ngày).` 
                        : `Cây đã được tưới cách đây ít giờ. Sẵn sàng cho chu kỳ tiếp theo.`
                      )
                  }
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.primaryCtaButton, isWatered && styles.disabledCtaButton]}
              onPress={handleWaterPress}
              disabled={isWatered}
              activeOpacity={0.8}
            >
              <Ionicons name={isWatered ? "checkmark-circle" : "water"} size={20} color={isWatered ? "#9CA3AF" : "#121212"} style={styles.ctaIcon} />
              <Text style={[styles.primaryCtaText, isWatered && { color: '#9CA3AF' }]}>
                {isWatered ? 'Đã tưới nước hôm nay' : 'Tưới nước ngay'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 3. QUICK ACTIONS (Horizontal Row) */}
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionTitle}>Tác vụ nhanh</Text>
          </View>
          
          <View style={styles.quickActionsRow}>
            {/* Water Action */}
            <TouchableOpacity 
              style={styles.actionButtonWrapper}
              onPress={handleQuickWaterPress}
              activeOpacity={0.7}
            >
              <View style={[
                styles.actionIconContainer, 
                { borderColor: '#10B981' }, 
                isWatered && { backgroundColor: 'rgba(16, 185, 129, 0.15)' }
              ]}>
                <Ionicons name={isWatered ? "water" : "water-outline"} size={24} color="#10B981" />
              </View>
              <Text style={styles.actionLabel}>{isWatered ? "Đã tưới" : "Tưới nước"}</Text>
            </TouchableOpacity>

            {/* Fertilizer Action */}
            <TouchableOpacity 
              style={styles.actionButtonWrapper}
              activeOpacity={0.7}
              onPress={handleFertilizePress}
            >
              <View style={[styles.actionIconContainer, { borderColor: '#8B5CF6' }]}>
                <Ionicons name="leaf-outline" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.actionLabel}>Bón phân</Text>
            </TouchableOpacity>

            {/* Journal Action */}
            <TouchableOpacity 
              style={styles.actionButtonWrapper}
              activeOpacity={0.7}
              onPress={handleCameraQuickAction}
            >
              <View style={[styles.actionIconContainer, { borderColor: '#3B82F6' }]}>
                <Ionicons name="camera-outline" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.actionLabel}>Thêm nhật ký</Text>
            </TouchableOpacity>
          </View>

          {/* 4. QUICK SPECS (Info Row) */}
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionTitle}>Thông số chăm sóc</Text>
          </View>
          
          <View style={styles.specsRow}>
            {/* Spec 1: Sunlight */}
            <View style={styles.specCard}>
              <View style={[styles.specIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Ionicons name="sunny" size={18} color="#F59E0B" />
              </View>
              <Text style={styles.specValue}>{careSpecs.sunlight}</Text>
              <Text style={styles.specLabel}>Ánh sáng</Text>
            </View>

            {/* Spec 2: Soil/Watering frequency */}
            <View style={styles.specCard}>
              <View style={[styles.specIconBg, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="water" size={18} color="#10B981" />
              </View>
              <Text style={styles.specValue}>Mỗi {interval} ngày</Text>
              <Text style={styles.specLabel}>Lịch tưới</Text>
            </View>

            {/* Spec 3: Temperature */}
            <View style={styles.specCard}>
              <View style={[styles.specIconBg, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Ionicons name="speedometer" size={18} color="#EF4444" />
              </View>
              <Text style={styles.specValue}>{careSpecs.temp}</Text>
              <Text style={styles.specLabel}>Nhiệt độ</Text>
            </View>
          </View>

          {/* 5. LATEST JOURNAL (Recent Activity) */}
          <View style={styles.sectionHeaderContainerWithBtn}>
            <Text style={styles.sectionTitle}>Nhật ký gần nhất</Text>
            <TouchableOpacity onPress={handleNavigationToJournal}>
              <Text style={styles.textButton}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          {loadingLogs ? (
            <ActivityIndicator size="small" color="#10B981" style={{ marginVertical: 20 }} />
          ) : latestLog ? (
            <TouchableOpacity 
              style={styles.journalCard}
              activeOpacity={0.8}
              onPress={handleNavigationToJournal}
            >
              <Image
                source={{ uri: latestLog.imageUrl || 'https://images.unsplash.com/photo-1416879598555-46700c0a9693?q=80&w=400&auto=format&fit=crop' }}
                style={styles.journalThumbnail}
              />
              <View style={styles.journalInfoContainer}>
                <View style={styles.journalHeaderRow}>
                  <Text style={styles.journalDate}>
                    {new Date(latestLog.date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                  <View style={styles.journalBadge}>
                    <Text style={styles.journalBadgeText}>Nhật ký</Text>
                  </View>
                </View>
                <Text style={styles.journalTitle}>Cập nhật trạng thái</Text>
                <Text style={styles.journalDescription} numberOfLines={2}>
                  {latestLog.note || 'Không có ghi chú.'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyJournalCard}>
              <Ionicons name="journal-outline" size={32} color="#4B5563" style={styles.emptyJournalIcon} />
              <Text style={styles.emptyJournalText}>Chưa có bản ghi nhật ký nào cho cây này.</Text>
              <TouchableOpacity 
                style={styles.emptyJournalBtn}
                onPress={handleNavigationToJournal}
              >
                <Text style={styles.emptyJournalBtnText}>Thêm nhật ký ngay</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Global & Theme Styles (Premium Dark Mode)
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#121212',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  bodyContainer: {
    paddingHorizontal: 20,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#121212',
  },

  // 1. Hero Section Styles
  heroContainer: {
    width: '100%',
    height: width * 0.85, // ~35% Screen height
    position: 'relative',
    backgroundColor: '#1E1E1E',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  topNavigation: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 12 : (Platform.OS === 'web' ? 15 : 35),
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  circleIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(18, 18, 18, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  gradientOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: 'rgba(18, 18, 18, 0.4)',
  },
  gradientOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: 'rgba(18, 18, 18, 0.85)', // Fallback for expo-linear-gradient
  },
  heroTextContainer: {
    position: 'absolute',
    bottom: 35,
    left: 20,
    right: 20,
    zIndex: 5,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10B981',
  },
  plantTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  plantSubTitle: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 2,
  },

  // 2. Smart Alert Card Styles
  alertCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2D2D2D',
    marginBottom: 24,
    marginTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  alertIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  alertSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  primaryCtaButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  disabledCtaButton: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  ctaIcon: {
    marginRight: 8,
  },
  primaryCtaText: {
    color: '#121212',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // Headers
  sectionHeaderContainer: {
    marginBottom: 14,
  },
  sectionHeaderContainerWithBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  textButton: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },

  // 3. Quick Actions Row Styles
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 26,
    paddingHorizontal: 5,
  },
  actionButtonWrapper: {
    alignItems: 'center',
    width: (width - 60) / 3,
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E1E1E',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  actionLabel: {
    fontSize: 12,
    color: '#E5E7EB',
    fontWeight: '600',
    textAlign: 'center',
  },

  // 4. Quick Specs Styles
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 26,
  },
  specCard: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  specIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  specValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  specLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // 5. Latest Journal Styles
  journalCard: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  journalThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
  },
  journalInfoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  journalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  journalDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  journalBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  journalBadgeText: {
    fontSize: 9,
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  journalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  journalDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
    marginTop: 4,
  },
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 16,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  backBtn: {
    marginTop: 24,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 15,
  },
  // Empty Journal State
  emptyJournalCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyJournalIcon: {
    marginBottom: 10,
  },
  emptyJournalText: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 14,
  },
  emptyJournalBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  emptyJournalBtnText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default PlantDetailScreen;
