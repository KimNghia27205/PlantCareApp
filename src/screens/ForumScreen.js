import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, Alert, Platform, Image
} from 'react-native';
import { getPosts, createPost, likePost } from '../services/forumService';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { pickImage, uploadImageToStorage } from '../services/imageService';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

const ForumScreen = () => {
  const { user } = useContext(AuthContext);
  const { theme: t } = useTheme();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postImageUri, setPostImageUri] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const result = await getPosts();
    if (result.success) setPosts(result.data);
    else Alert.alert('Lỗi', result.error);
    setLoading(false);
  };

  const handlePickPostImage = async () => {
    const result = await pickImage();
    if (result.success) setPostImageUri(result.uri);
  };

  const handleCreatePost = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ tiêu đề và nội dung.');
      return;
    }
    setIsSubmitting(true);

    let imageUrl = null;
    if (postImageUri) {
      setUploadingImage(true);
      const uploadRes = await uploadImageToStorage(
        postImageUri,
        `forum/${user?.uid}/${Date.now()}.jpg`
      );
      setUploadingImage(false);
      if (uploadRes.success) imageUrl = uploadRes.url;
    }

    const newPost = {
      title, content,
      author: user?.displayName || 'Người dùng ẩn danh',
      authorId: user?.uid,
      tags: ['#hoidap'],
      ...(imageUrl && { imageUrl }),
    };

    const result = await createPost(newPost);
    if (result.success) {
      try { await updateDoc(doc(db, 'users', user.uid), { points: increment(10) }); } catch (e) {}
      Alert.alert('🎉 Đã đăng!', 'Bài viết của bạn đã được đăng. +10 điểm!');
      setModalVisible(false);
      setTitle(''); setContent(''); setPostImageUri(null);
      fetchData();
    } else {
      Alert.alert('Lỗi', result.error);
    }
    setIsSubmitting(false);
  };

  const handleLike = async (postId) => {
    if (!user) return;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p));
    await likePost(postId);
  };

  const getInitials = (name = '') => name.trim().charAt(0).toUpperCase() || '?';
  const getAvatarColor = (name = '') => {
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#009688'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const renderPost = ({ item }) => (
    <View style={[styles.card, { backgroundColor: t.cardBg }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.authorAvatar, { backgroundColor: getAvatarColor(item.author) }]}>
          <Text style={styles.authorInitial}>{getInitials(item.author)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.authorName, { color: t.text }]}>{item.author}</Text>
          <Text style={[styles.postTime, { color: t.subText }]}>
            {item.createdAt?.toDate
              ? item.createdAt.toDate().toLocaleDateString('vi-VN')
              : 'Vừa xong'}
          </Text>
        </View>
        {item.tags?.slice(0, 1).map((tag, i) => (
          <View key={i} style={[styles.tagBadge, { backgroundColor: t.dark ? '#1a3a5c' : '#E3F2FD' }]}>
            <Text style={[styles.tagText, { color: t.dark ? '#90CAF9' : '#1976D2' }]}>{tag}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.postTitle, { color: t.text }]}>{item.title}</Text>
      <Text style={[styles.postContent, { color: t.subText }]} numberOfLines={item.imageUrl ? 2 : 3}>
        {item.content}
      </Text>

      {/* Hiển thị ảnh bài viết nếu có */}
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
      ) : null}

      <View style={[styles.cardFooter, { borderTopColor: t.dark ? '#2a2a2a' : '#f0f0f0' }]}>
        <TouchableOpacity style={styles.statBtn} onPress={() => handleLike(item.id)}>
          <Ionicons name="heart-outline" size={16} color="#E57373" />
          <Text style={[styles.statText, { color: t.subText }]}>{item.likes || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statBtn}>
          <Ionicons name="chatbubble-outline" size={15} color={t.subText} />
          <Text style={[styles.statText, { color: t.subText }]}>{item.comments || 0}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { backgroundColor: t.bg }]}>
        <View>
          <Text style={[styles.title, { color: t.dark ? '#90CAF9' : '#1565C0' }]}>Cộng đồng</Text>
          <Text style={[styles.subtitle, { color: t.subText }]}>Chia sẻ kinh nghiệm trồng cây</Text>
        </View>
        <TouchableOpacity style={styles.postBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="create-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1565C0" style={{ marginTop: 60 }} />
      ) : posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 56 }}>💬</Text>
          <Text style={[styles.emptyTitle, { color: t.text }]}>Chưa có bài viết nào</Text>
          <Text style={[styles.emptySubText, { color: t.subText }]}>Hãy là người đầu tiên chia sẻ!</Text>
          <TouchableOpacity style={styles.postBtnFull} onPress={() => setModalVisible(true)}>
            <Text style={styles.postBtnText}>Đăng bài ngay</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          renderItem={renderPost}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={fetchData}
        />
      )}

      {/* FAB đăng bài khi đã có bài */}
      {posts.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Modal đăng bài */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: t.cardBg }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: t.dark ? '#90CAF9' : '#1565C0' }]}>✍️ Đăng bài mới</Text>

            <Text style={[styles.label, { color: t.subText }]}>Tiêu đề</Text>
            <TextInput
              style={[styles.input, { backgroundColor: t.bg, borderColor: t.inputBorder, color: t.text }]}
              placeholder="VD: Cây trầu bà bị vàng lá..."
              placeholderTextColor={t.subText}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={[styles.label, { color: t.subText }]}>Nội dung</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: t.bg, borderColor: t.inputBorder, color: t.text }]}
              placeholder="Mô tả chi tiết vấn đề của bạn..."
              placeholderTextColor={t.subText}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />

            {/* Phần chọn ảnh */}
            <Text style={[styles.label, { color: t.subText }]}>Ảnh đính kèm (tùy chọn)</Text>
            {postImageUri ? (
              <View style={styles.imagePreviewWrapper}>
                <Image source={{ uri: postImageUri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setPostImageUri(null)}>
                  <Ionicons name="close-circle" size={24} color="#FF5252" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.changeImageOverlay} onPress={handlePickPostImage}>
                  <Ionicons name="camera" size={16} color="#fff" />
                  <Text style={styles.changeImageText}>Đổi ảnh</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.imagePicker, { backgroundColor: t.bg, borderColor: t.inputBorder }]}
                onPress={handlePickPostImage}
              >
                <Ionicons name="image-outline" size={26} color={t.subText} />
                <Text style={[styles.imagePickerText, { color: t.subText }]}>Nhấn để thêm ảnh</Text>
              </TouchableOpacity>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: t.dark ? '#2a2a2a' : '#f0f0f0' }]}
                onPress={() => { setModalVisible(false); setPostImageUri(null); }}
              >
                <Text style={[styles.cancelBtnText, { color: t.subText }]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreatePost}
                disabled={isSubmitting || uploadingImage}
              >
                {(isSubmitting || uploadingImage)
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>Đăng bài</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 55 : 35, paddingBottom: 14,
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 13, marginTop: 2 },
  postBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#1565C0',
    justifyContent: 'center', alignItems: 'center',
  },
  postBtnFull: { backgroundColor: '#1565C0', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, marginTop: 8 },
  postBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  list: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 4 },

  card: { borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  authorAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  authorInitial: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  authorName: { fontSize: 14, fontWeight: '600' },
  postTime: { fontSize: 11, marginTop: 1 },
  tagBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tagText: { fontSize: 11, fontWeight: 'bold' },
  postTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  postContent: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  postImage: { width: '100%', height: 180, borderRadius: 10, marginBottom: 12, resizeMode: 'cover', backgroundColor: '#f0f0f0' },
  cardFooter: { flexDirection: 'row', gap: 16, paddingTop: 10, borderTopWidth: 1 },
  statBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 13 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingBottom: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 8 },
  emptySubText: { fontSize: 14, marginBottom: 10 },

  fab: { position: 'absolute', bottom: 95, right: 20, backgroundColor: '#1565C0', width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', shadowColor: '#1565C0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 7 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 15 },
  textArea: { height: 100 },

  // Image styles
  imagePicker: { height: 80, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 14, gap: 8 },
  imagePickerText: { fontSize: 13 },
  imagePreviewWrapper: { position: 'relative', marginBottom: 14, borderRadius: 10, overflow: 'hidden' },
  imagePreview: { width: '100%', height: 130, resizeMode: 'cover' },
  removeImageBtn: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12 },
  changeImageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 5, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
  changeImageText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 12 },
  cancelBtnText: { fontWeight: 'bold', fontSize: 15 },
  submitBtn: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: '#1565C0', borderRadius: 12 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});

export default ForumScreen;
