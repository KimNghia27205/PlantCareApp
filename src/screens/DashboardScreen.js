import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Platform, Modal } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getPlantsByUser } from '../services/plantService';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabaseClient';

const DashboardScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const { theme: t } = useTheme();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedIds, setDismissedIds] = useState([]);

  const activeNotifications = notifications.filter(item => !dismissedIds.includes(item.id));

  const scrollViewRef = React.useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = React.useRef(0);
  const dragScrollLeft = React.useRef(0);

  const onMouseDown = (e) => {
    if (Platform.OS !== 'web' || !scrollViewRef.current) return;
    const node = scrollViewRef.current.getScrollableNode ? scrollViewRef.current.getScrollableNode() : scrollViewRef.current;
    if (!node) return;
    setIsDragging(true);
    dragStart.current = e.pageX - node.offsetLeft;
    dragScrollLeft.current = node.scrollLeft;
  };

  const onMouseMove = (e) => {
    if (Platform.OS !== 'web' || !isDragging || !scrollViewRef.current) return;
    const node = scrollViewRef.current.getScrollableNode ? scrollViewRef.current.getScrollableNode() : scrollViewRef.current;
    if (!node) return;
    e.preventDefault();
    const x = e.pageX - node.offsetLeft;
    const walk = (x - dragStart.current) * 1.5; // drag speed multiplier
    node.scrollLeft = dragScrollLeft.current - walk;
  };

  const onMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const generateNotifications = async (currentPlants) => {
    const list = [];
    
    // 1. Lọc thông báo cây trồng (Tưới nước, Sức khỏe, Bón phân, Ghi nhật ký)
    currentPlants.forEach(plant => {
      // Tính số ngày kể từ lần tưới cuối cùng
      const lastWateredDate = new Date(plant.lastWatered);
      const diffTime = Math.abs(new Date() - lastWateredDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const interval = plant.waterIntervalDays || 2;
      
      // A. Thông báo tưới nước (Quá hạn hoặc Đến lịch hôm nay)
      if (diffDays >= interval) {
        list.push({
          id: `water_overdue_${plant.id}`,
          type: 'watering',
          title: `💧 Quá hạn tưới nước: ${plant.plantName}`,
          content: `Cây đã quá hạn tưới ${diffDays} ngày (Lịch tưới mỗi ${interval} ngày). Hãy bổ sung nước ngay nhé!`,
          time: 'Hôm nay',
        });
      } else if (diffDays === interval - 1) {
        list.push({
          id: `water_today_${plant.id}`,
          type: 'watering',
          title: `💦 Đến lịch tưới nước: ${plant.plantName}`,
          content: `Hôm nay là ngày tưới nước định kỳ cho cây. Đừng quên tưới ẩm cho đất nhé!`,
          time: 'Hôm nay',
        });
      }
      
      // B. Thông báo tình trạng sức khỏe (Sức khỏe bất thường hoặc Khỏe mạnh)
      const isHealthy = plant.healthStatus && plant.healthStatus.toLowerCase().includes('khỏe');
      if (plant.healthStatus && !isHealthy) {
        list.push({
          id: `health_alert_${plant.id}`,
          type: 'health',
          title: `⚠️ Cảnh báo sức khỏe: ${plant.plantName}`,
          content: `Tình trạng cây đang "${plant.healthStatus}". Bệnh: ${plant.diseaseName || 'Chưa xác định'}. Giải pháp gợi ý: ${plant.solution || 'Cách ly và theo dõi thêm.'}`,
          time: 'Khẩn cấp',
        });
      } else if (isHealthy) {
        list.push({
          id: `health_good_${plant.id}`,
          type: 'status',
          title: `🌿 Tình trạng tốt: ${plant.plantName}`,
          content: `Cây đang phát triển rất khỏe mạnh! Hãy giữ cây ở nơi đón nắng nhẹ và thoáng mát.`,
          time: 'Ổn định',
        });
      }

      // C. Gợi ý bón phân định kỳ (Mỗi 14 ngày kể từ khi tạo cây)
      const createdDate = new Date(plant.createdAt || plant.lastWatered);
      const diffTimeCreation = Math.abs(new Date() - createdDate);
      const diffDaysCreation = Math.floor(diffTimeCreation / (1000 * 60 * 60 * 24));
      if (diffDaysCreation > 0 && diffDaysCreation % 14 === 0) {
        list.push({
          id: `fertilize_${plant.id}`,
          type: 'fertilize',
          title: `🪴 Dinh dưỡng định kỳ: ${plant.plantName}`,
          content: `Đã đến chu kỳ 2 tuần bón phân. Hãy bổ sung một lượng phân hữu cơ nhẹ cho cây phát triển nhé!`,
          time: 'Gợi ý',
        });
      }

      // D. Nhắc nhở cập nhật nhật ký chăm sóc
      if (diffDays >= 3) {
        list.push({
          id: `journal_reminder_${plant.id}`,
          type: 'journal',
          title: `📸 Cập nhật nhật ký: ${plant.plantName}`,
          content: `Đã 3 ngày bạn chưa thêm hình ảnh nhật ký mới. Hãy chụp ảnh và lưu lại sự thay đổi của cây nhé!`,
          time: 'Nhắc nhở',
        });
      }
    });

    // 2. Lọc thông báo cộng đồng từ bài viết của user trên Supabase
    if (user) {
      try {
        const { data: userPosts, error } = await supabase
          .from('posts')
          .select('id, title, likes, comments_count')
          .eq('user_id', user.uid);
          
        if (!error && userPosts) {
          userPosts.forEach(post => {
            if (post.likes > 0) {
              list.push({
                id: `like_${post.id}`,
                type: 'like',
                title: `❤️ Tác động tích cực!`,
                content: `Bài viết "${post.title}" của bạn đã nhận được ${post.likes} lượt thả tim từ cộng đồng.`,
                time: 'Mới đây',
              });
            }
            if (post.comments_count > 0) {
              list.push({
                id: `comment_${post.id}`,
                type: 'comment',
                title: `💬 Thảo luận mới!`,
                content: `Bài viết "${post.title}" của bạn có ${post.comments_count} bình luận mới.`,
                time: 'Mới đây',
              });
            }
          });
        }
      } catch (e) {
        console.warn("Lỗi tải thông báo cộng đồng:", e);
      }
    }

    setNotifications(list);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPlants();
    });
    fetchPlants();
    return unsubscribe;
  }, [navigation, user]);

  const fetchPlants = async () => {
    if (user) {
      const res = await getPlantsByUser(user.uid);
      if (res.success) {
        setPlants(res.data);
        await generateNotifications(res.data);
      }
    }
    setLoading(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.bg }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, { backgroundColor: t.cardBg, borderColor: '#3E8E41' }]}>
            <Ionicons name="person" size={20} color="#3E8E41" />
          </View>
          <Text style={styles.headerTitle}>PlantCareApp</Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn} onPress={() => setShowNotifications(true)}>
          <Ionicons name="notifications" size={24} color="#3E8E41" />
          {activeNotifications.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeNotifications.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: t.bannerBg }]}>
          <Text style={styles.bannerTitle}>Chào mừng,{'\n'}{user?.displayName || user?.email?.split('@')[0] || 'bạn'}!</Text>
          <View style={[styles.rankBadge, { backgroundColor: t.dark ? '#2E6B30' : '#E8F5E9' }]}>
            <Text style={[styles.rankText, { color: t.dark ? '#A5D6A7' : '#3E8E41' }]}>Hạng: Mầm Non</Text>
          </View>
          <Text style={styles.bannerSub}>Cùng chăm sóc khu vườn{'\n'}của bạn hôm nay</Text>
        </View>

        {/* Shortcut Lịch chăm sóc */}
        <TouchableOpacity
          style={[styles.scheduleCard, { backgroundColor: t.cardBg }]}
          onPress={() => navigation.navigate('Schedule')}
          activeOpacity={0.85}
        >
          <View style={styles.scheduleLeft}>
            <View style={styles.scheduleIconBg}>
              <Text style={{ fontSize: 22 }}>📅</Text>
            </View>
            <View>
              <Text style={[styles.scheduleTitle, { color: t.text }]}>Lịch chăm sóc</Text>
              <Text style={[styles.scheduleSub, { color: t.subText }]}>Xem lịch tưới nước hôm nay</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={t.subText} />
        </TouchableOpacity>

        {/* Plant Collection */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Your Plant Collection</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MyGarden')}>
            <Ionicons name="chevron-forward" size={24} color={t.subText} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3E8E41" style={{ marginVertical: 20 }} />
        ) : (
          <ScrollView 
            ref={scrollViewRef}
            horizontal 
            showsHorizontalScrollIndicator={Platform.OS === 'web'} 
            style={styles.horizontalScroll}
            {...(Platform.OS === 'web' ? {
              onMouseDown: onMouseDown,
              onMouseMove: onMouseMove,
              onMouseUp: onMouseUpOrLeave,
              onMouseLeave: onMouseUpOrLeave,
              contentContainerStyle: { cursor: isDragging ? 'grabbing' : 'grab', paddingBottom: 10 }
            } : {})}
          >
            {plants.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: t.cardBg, borderColor: t.dark ? '#333' : '#E8F5E9' }]}>
                <Text style={[styles.emptyText, { color: t.subText }]}>Chưa có cây nào trong khu vườn.</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('ScanAI')}>
                  <Text style={styles.addText}>Quét AI để thêm cây</Text>
                </TouchableOpacity>
              </View>
            ) : (
              plants.map(plant => (
                <View key={plant.id} style={[styles.plantCard, { backgroundColor: t.cardBg }]}>
                  <Image source={{ uri: plant.imageUrl }} style={styles.plantImage} />
                  <Text style={[styles.plantName, { color: t.text }]} numberOfLines={1}>{plant.plantName}</Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: plant.healthStatus?.toLowerCase().includes('khỏe') ? '#4CAF50' : '#FF9800' }]} />
                    <Text style={[styles.statusText, { color: t.subText }]} numberOfLines={1}>{plant.healthStatus || 'Không rõ'}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.detailBtn}
                    onPress={() => navigation.navigate('PlantDetail', { plant })}
                  >
                    <Text style={styles.detailBtnText}>Xem chi tiết</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* Nhiệm Vụ Hôm Nay */}
        <Text style={[styles.sectionTitle, { marginTop: 25, marginBottom: 15, color: t.text }]}>Nhiệm Vụ Hôm Nay</Text>
        <View style={[styles.taskContainer, { backgroundColor: t.cardBg }]}>
          {plants.length > 0 ? (
            plants.slice(0, 3).map((plant, index) => {
              const lastWateredDate = plant.lastWatered ? new Date(plant.lastWatered) : new Date();
              const diffTime = Math.abs(new Date() - lastWateredDate);
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              const interval = plant.waterIntervalDays || 2;
              
              let taskLabel = '';
              let isCompleted = false;
              let iconName = 'square-outline';
              let iconColor = '#3E8E41';

              if (diffDays === 0) {
                taskLabel = `Đã tưới nước hôm nay: ${plant.plantName || plant.name}`;
                isCompleted = true;
                iconName = 'checkbox';
                iconColor = '#4CAF50';
              } else if (diffDays >= interval) {
                taskLabel = `Cần tưới nước gấp: ${plant.plantName || plant.name}`;
                isCompleted = false;
                iconName = 'water-outline';
                iconColor = '#FF9800';
              } else {
                const isHealthy = plant.healthStatus?.toLowerCase().includes('khỏe');
                if (!isHealthy) {
                  taskLabel = `Theo dõi đặc biệt (đang bệnh): ${plant.plantName || plant.name}`;
                  isCompleted = false;
                  iconName = 'alert-circle-outline';
                  iconColor = '#F44336';
                } else {
                  taskLabel = `Kiểm tra ánh sáng & xoay chậu: ${plant.plantName || plant.name}`;
                  isCompleted = true;
                  iconName = 'checkbox';
                  iconColor = '#4CAF50';
                }
              }

              return (
                <View key={plant.id || index} style={styles.taskRow}>
                  <Ionicons name={iconName} size={22} color={iconColor} />
                  <Text style={[styles.taskText, { color: t.text, textDecorationLine: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.7 : 1 }]}>
                    {taskLabel}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={{ color: t.subText, fontStyle: 'italic', marginLeft: 5 }}>Hãy thêm cây để nhận nhiệm vụ.</Text>
          )}
        </View>
      </ScrollView>

      {/* Bảng thông báo - Thiết kế dạng Dropdown tuyệt đối sát cạnh chuông */}
      {showNotifications && (
        <>
          {/* Backdrop trong suốt bao phủ màn hình để đóng khi click ra ngoài */}
          <TouchableOpacity 
            style={styles.dropdownBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowNotifications(false)}
          />
          {/* Hộp Dropdown thông báo */}
          <View style={[styles.dropdownContent, { backgroundColor: t.cardBg }]}>
            {/* Mũi tên chỉ lên góc chuông */}
            <View style={[styles.dropdownArrow, { borderBottomColor: t.cardBg }]} />
            
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Ionicons name="notifications-outline" size={16} color="#3E8E41" style={{ marginRight: 6 }} />
                <Text style={[styles.modalTitle, { color: t.text }]}>Thông báo</Text>
              </View>
              {activeNotifications.length > 0 && (
                <TouchableOpacity 
                  onPress={() => setDismissedIds(notifications.map(n => n.id))}
                  style={{ marginRight: 10 }}
                >
                  <Text style={{ fontSize: 11, color: '#3E8E41', fontWeight: 'bold' }}>Đã đọc tất cả</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowNotifications(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={16} color={t.subText} />
              </TouchableOpacity>
            </View>

            {activeNotifications.length === 0 ? (
              <View style={styles.emptyNotifications}>
                <Text style={{ fontSize: 24, marginBottom: 4 }}>🎉</Text>
                <Text style={[styles.emptyNotificationTitle, { color: t.text }]}>Hết thông báo!</Text>
                <Text style={[styles.emptyNotificationSub, { color: t.subText }]}>Tất cả cây đã được tưới đầy đủ.</Text>
              </View>
            ) : (
              <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
                {activeNotifications.map((item) => (
                  <View key={item.id} style={[styles.notificationCard, { backgroundColor: t.bg, borderColor: t.inputBorder }]}>
                    <View style={styles.notificationHeader}>
                      <Text style={[styles.notificationTitle, { color: t.text }]} numberOfLines={1}>{item.title}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.notificationTime, { color: t.subText }]}>{item.time}</Text>
                        <TouchableOpacity 
                          onPress={() => setDismissedIds(prev => [...prev, item.id])} 
                          style={{ padding: 2 }}
                        >
                          <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={[styles.notificationContent, { color: t.subText }]}>{item.content}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 15,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#3E8E41' },
  notificationBtn: { position: 'relative', padding: 2 },
  badge: { 
    position: 'absolute', 
    top: -4, 
    right: -4, 
    minWidth: 16, 
    height: 16, 
    borderRadius: 8, 
    backgroundColor: '#FF5252', 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 4,
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
    backgroundColor: 'transparent'
  },
  dropdownContent: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 75,
    right: 16,
    width: 270,
    maxHeight: 320,
    borderRadius: 12,
    padding: 12,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)'
  },
  dropdownArrow: {
    position: 'absolute',
    top: -8,
    right: 18,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent'
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: 'bold' },
  closeModalBtn: { padding: 4 },
  emptyNotifications: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 10 },
  emptyNotificationTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  emptyNotificationSub: { fontSize: 12, textAlign: 'center', lineHeight: 16 },
  notificationsList: { marginBottom: 5 },
  notificationCard: { borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
  notificationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 6 },
  notificationTitle: { fontSize: 13, fontWeight: 'bold', flex: 1 },
  notificationTime: { fontSize: 10 },
  notificationContent: { fontSize: 12, lineHeight: 16 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  banner: {
    borderRadius: 16, padding: 20, marginBottom: 25,
    shadowColor: '#3E8E41', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  bannerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  rankBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 10 },
  rankText: { fontSize: 12, fontWeight: 'bold' },
  bannerSub: { color: '#E8F5E9', fontSize: 14, lineHeight: 20 },

  scheduleCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 14, padding: 14, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  scheduleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scheduleIconBg: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center',
  },
  scheduleTitle: { fontSize: 15, fontWeight: '700' },
  scheduleSub: { fontSize: 12, marginTop: 2 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },

  horizontalScroll: { overflow: 'visible' },
  emptyCard: { width: 280, height: 200, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  emptyText: { marginBottom: 10 },
  addBtn: { backgroundColor: '#3E8E41', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  addText: { color: '#fff', fontWeight: 'bold' },

  plantCard: {
    width: 160, borderRadius: 16, padding: 12, marginRight: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  plantImage: { width: '100%', height: 120, borderRadius: 12, marginBottom: 12, backgroundColor: '#f0f0f0' },
  plantName: { fontSize: 15, fontWeight: 'bold', marginBottom: 5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, flex: 1 },
  detailBtn: { backgroundColor: '#3E8E41', paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
  detailBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  taskContainer: { paddingLeft: 5, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  taskRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  taskText: { fontSize: 14, marginLeft: 10 }
});

export default DashboardScreen;
