import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, Alert, Platform, Image, ScrollView, KeyboardAvoidingView
} from 'react-native';
import { getPosts, createPost, toggleLikePost, getComments, addComment } from '../services/forumService';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { pickImage, uploadImageToStorage } from '../services/imageService';
import { Ionicons } from '@expo/vector-icons';
import { getUserProfile, updateUserProfile } from '../services/authService';
// Các hàm helper thuần túy được đưa lên cấp cao nhất để dùng chung
const getInitials = (name = '') => name.trim().charAt(0).toUpperCase() || '?';
const getAvatarColor = (name = '') => {
  const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#009688'];
  return colors[name.charCodeAt(0) % colors.length];
};

// Component con hiển thị chi tiết bài viết (ListHeaderComponent) tách biệt
// giúp ngăn chặn việc bị unmount/remount gây nháy/reload hình ảnh mỗi khi thêm bình luận mới
const PostDetailHeader = React.memo(({ 
  selectedPost, 
  user, 
  theme: t, 
  loadingComments, 
  commentsLength, 
  handleLike 
}) => {
  if (!selectedPost) return null;
  const postLiked = user && selectedPost.likedBy?.includes(user.uid);
  return (
    <View style={styles.detailPostArea}>
      <View style={styles.cardHeader}>
        {selectedPost.authorAvatar ? (
          <Image source={{ uri: selectedPost.authorAvatar }} style={styles.authorAvatar} />
        ) : (
          <View style={[styles.authorAvatar, { backgroundColor: getAvatarColor(selectedPost.author) }]}>
            <Text style={styles.authorInitial}>{getInitials(selectedPost.author)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.authorName, { color: t.text }]}>{selectedPost.author}</Text>
          <Text style={[styles.postTime, { color: t.subText }]}>
            {selectedPost.createdAt 
              ? (typeof selectedPost.createdAt === 'string' && !isNaN(Date.parse(selectedPost.createdAt))
                  ? new Date(selectedPost.createdAt).toLocaleDateString('vi-VN')
                  : 'Vừa xong')
              : 'Vừa xong'}
          </Text>
        </View>
        {selectedPost.tags?.map((tag, i) => (
          <View key={i} style={[styles.tagBadge, { backgroundColor: t.dark ? '#1a3a5c' : '#E3F2FD' }]}>
            <Text style={[styles.tagText, { color: t.dark ? '#90CAF9' : '#1976D2' }]}>{tag}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.detailPostTitle, { color: t.text }]}>{selectedPost.title}</Text>
      <Text style={[styles.detailPostContent, { color: t.text }]}>{selectedPost.content}</Text>

      {selectedPost.imageUrl ? (
        <Image source={{ uri: selectedPost.imageUrl }} style={styles.detailPostImage} />
      ) : null}

      <View style={[styles.detailStatsRow, { borderBottomColor: t.dark ? '#2a2a2a' : '#f0f0f0' }]}>
        <TouchableOpacity style={styles.statBtn} onPress={() => handleLike(selectedPost.id)}>
          <Ionicons 
            name={postLiked ? "heart" : "heart-outline"} 
            size={18} 
            color={postLiked ? "#EF5350" : "#E57373"} 
          />
          <Text style={[styles.statText, { color: postLiked ? "#EF5350" : t.subText, fontWeight: postLiked ? '600' : '400' }]}>
            Thích ({selectedPost.likes || 0})
          </Text>
        </TouchableOpacity>
        <View style={styles.statBtn}>
          <Ionicons name="chatbubble-outline" size={16} color={t.subText} />
          <Text style={[styles.statText, { color: t.subText }]}>
            Bình luận ({selectedPost.comments || 0})
          </Text>
        </View>
      </View>

      <Text style={[styles.commentsSectionTitle, { color: t.text }]}>Bình luận</Text>
      
      {loadingComments && (
        <ActivityIndicator size="small" color="#1565C0" style={{ marginVertical: 20 }} />
      )}
      
      {!loadingComments && commentsLength === 0 && (
        <View style={styles.noCommentsWrapper}>
          <Ionicons name="chatbubbles-outline" size={32} color={t.subText} />
          <Text style={[styles.noCommentsText, { color: t.subText }]}>Chưa có bình luận nào. Hãy là người đầu tiên!</Text>
        </View>
      )}
    </View>
  );
});

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

  // States cho bình luận & Chi tiết bài viết
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

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
      
      if (uploadRes.success) {
        imageUrl = uploadRes.url;
      } else {
        // Gặp lỗi upload ảnh (CORS trên Web hoặc mạng yếu) -> Hỏi người dùng đăng không ảnh
        let proceed = false;
        if (Platform.OS === 'web') {
          proceed = window.confirm(
            '⚠️ Không thể tải ảnh lên (do cấu hình CORS Supabase trên trình duyệt Web).\n\nBạn có muốn tiếp tục đăng bài viết mà không kèm ảnh không?'
          );
        } else {
          proceed = await new Promise((resolve) => {
            Alert.alert(
              '⚠️ Lỗi tải ảnh',
              'Không thể tải ảnh đính kèm lên Supabase Storage. Bạn có muốn tiếp tục đăng bài mà không kèm ảnh không?',
              [
                { text: 'Hủy', onPress: () => resolve(false), style: 'cancel' },
                { text: 'Tiếp tục', onPress: () => resolve(true) }
              ]
            );
          });
        }
        
        if (!proceed) {
          setIsSubmitting(false);
          return;
        }
      }
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
      try {
        const profileRes = await getUserProfile(user.uid);
        if (profileRes.success) {
          const currentPoints = profileRes.data.points || 0;
          await updateUserProfile(user.uid, { points: currentPoints + 10 });
        }
      } catch (e) {
        console.error("Lỗi cộng điểm Supabase:", e);
      }
      Alert.alert('🎉 Đã đăng!', 'Bài viết của bạn đã được đăng. +10 điểm!');
      setModalVisible(false);
      setTitle(''); setContent(''); setPostImageUri(null);
      fetchData();
    } else {
      Alert.alert('Lỗi', result.error);
    }
    setIsSubmitting(false);
  };

  // Ràng buộc: Mỗi acc chỉ thả tim được 1 lần (Toggle Like/Unlike)
  const handleLike = async (postId) => {
    if (!user) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để thả tim bài viết.');
      return;
    }
    
    // Tìm post hiện tại để update tức thời (Optimistic UI)
    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost) return;
    
    const likedBy = targetPost.likedBy || [];
    const hasLiked = likedBy.includes(user.uid);
    
    const updatedLikedBy = hasLiked 
      ? likedBy.filter(uid => uid !== user.uid)
      : [...likedBy, user.uid];
      
    const updatedLikes = hasLiked
      ? Math.max(0, (targetPost.likes || 0) - 1)
      : (targetPost.likes || 0) + 1;
      
    // Cập nhật UI ngay lập tức
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, likedBy: updatedLikedBy, likes: updatedLikes } 
        : p
    ));
    
    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost(prev => ({
        ...prev,
        likedBy: updatedLikedBy,
        likes: updatedLikes
      }));
    }

    // Gửi yêu cầu lên Firestore
    const res = await toggleLikePost(postId, user.uid);
    if (!res.success) {
      // Rollback nếu có lỗi xảy ra
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, likedBy: likedBy, likes: targetPost.likes } 
          : p
      ));
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(targetPost);
      }
      Alert.alert('Lỗi', res.error);
    }
  };

  // Mở modal chi tiết bài viết & Tải bình luận
  const handleOpenDetail = async (post) => {
    setSelectedPost(post);
    setDetailModalVisible(true);
    setLoadingComments(true);
    setNewComment('');
    
    const res = await getComments(post.id);
    if (res.success) {
      setComments(res.data);
    } else {
      Alert.alert('Lỗi', res.error);
    }
    setLoadingComments(false);
  };

  // Thêm bình luận mới
  const handleAddComment = async () => {
    if (!newComment.trim() || submittingComment) return;
    if (!user) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để gửi bình luận.');
      return;
    }
    
    setSubmittingComment(true);
    const commentData = {
      content: newComment.trim(),
      author: user?.displayName || 'Người dùng ẩn danh',
      authorId: user?.uid,
    };
    
    const res = await addComment(selectedPost.id, commentData);
    if (res.success) {
      setNewComment('');
      // Tải lại danh sách bình luận
      const updatedCommentsRes = await getComments(selectedPost.id);
      if (updatedCommentsRes.success) {
        setComments(updatedCommentsRes.data);
      }
      
      // Đồng bộ số lượng comment ở màn hình ngoài & trong modal
      setPosts(prev => prev.map(p => 
        p.id === selectedPost.id 
          ? { ...p, comments: (p.comments || 0) + 1 } 
          : p
      ));
      setSelectedPost(prev => ({
        ...prev,
        comments: (prev.comments || 0) + 1
      }));
    } else {
      Alert.alert('Lỗi', res.error);
    }
    setSubmittingComment(false);
  };



  const renderPost = ({ item }) => {
    const hasLiked = user && item.likedBy?.includes(user.uid);
    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: t.cardBg }]} 
        onPress={() => handleOpenDetail(item)}
        activeOpacity={0.95}
      >
        <View style={styles.cardHeader}>
          {item.authorAvatar ? (
            <Image source={{ uri: item.authorAvatar }} style={styles.authorAvatar} />
          ) : (
            <View style={[styles.authorAvatar, { backgroundColor: getAvatarColor(item.author) }]}>
              <Text style={styles.authorInitial}>{getInitials(item.author)}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.authorName, { color: t.text }]}>{item.author}</Text>
            <Text style={[styles.postTime, { color: t.subText }]}>
              {item.createdAt 
                ? (typeof item.createdAt === 'string' && !isNaN(Date.parse(item.createdAt))
                    ? new Date(item.createdAt).toLocaleDateString('vi-VN')
                    : 'Vừa xong')
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
            <Ionicons 
              name={hasLiked ? "heart" : "heart-outline"} 
              size={17} 
              color={hasLiked ? "#EF5350" : "#E57373"} 
            />
            <Text style={[styles.statText, { color: hasLiked ? "#EF5350" : t.subText, fontWeight: hasLiked ? '600' : '400' }]}>
              {item.likes || 0}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statBtn} onPress={() => handleOpenDetail(item)}>
            <Ionicons name="chatbubble-outline" size={15} color={t.subText} />
            <Text style={[styles.statText, { color: t.subText }]}>{item.comments || 0}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCommentItem = ({ item }) => (
    <View style={[styles.commentCard, { borderBottomColor: t.dark ? '#2a2a2a' : '#f0f0f0' }]}>
      {item.userAvatar ? (
        <Image source={{ uri: item.userAvatar }} style={styles.commentAvatar} />
      ) : (
        <View style={[styles.commentAvatar, { backgroundColor: getAvatarColor(item.author) }]}>
          <Text style={styles.commentAvatarText}>{getInitials(item.author)}</Text>
        </View>
      )}
      <View style={styles.commentContentWrapper}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentAuthor, { color: t.text }]}>{item.author}</Text>
          <Text style={[styles.commentTime, { color: t.subText }]}>
            {item.createdAt
              ? new Date(item.createdAt).toLocaleDateString('vi-VN')
              : 'Vừa xong'}
          </Text>
        </View>
        <Text style={[styles.commentBody, { color: t.text }]}>{item.content}</Text>
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

      {posts.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      )}

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

      {/* Modal Chi tiết bài viết & Bình luận */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.detailModalContent, { backgroundColor: t.cardBg }]}>
              {/* Header của Modal */}
              <View style={[styles.detailModalHeader, { borderBottomColor: t.dark ? '#2a2a2a' : '#f0f0f0' }]}>
                <TouchableOpacity 
                  onPress={() => setDetailModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <Ionicons name="close" size={24} color={t.text} />
                </TouchableOpacity>
                <Text style={[styles.detailModalHeaderTitle, { color: t.text }]}>Chi tiết bài đăng</Text>
                <View style={{ width: 24 }} />
              </View>

              {selectedPost && (
                <FlatList
                  data={comments}
                  keyExtractor={item => item.id}
                  renderItem={renderCommentItem}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.detailScrollList}
                  ListHeaderComponent={
                    <PostDetailHeader
                      selectedPost={selectedPost}
                      user={user}
                      theme={t}
                      loadingComments={loadingComments}
                      commentsLength={comments.length}
                      handleLike={handleLike}
                    />
                  }
                />
              )}

              {/* Ô Nhập Bình Luận dạng Tin nhắn Fixed */}
              <View style={[styles.commentInputWrapper, { 
                backgroundColor: t.cardBg, 
                borderTopColor: t.dark ? '#2a2a2a' : '#f0f0f0',
                paddingBottom: Platform.OS === 'ios' ? 24 : 12 
              }]}>
                {user ? (
                  <View style={[styles.commentInputInner, { backgroundColor: t.bg, borderColor: t.inputBorder }]}>
                    <TextInput
                      style={[styles.commentTextInput, { color: t.text }]}
                      placeholder="Viết câu trả lời..."
                      placeholderTextColor={t.subText}
                      value={newComment}
                      onChangeText={setNewComment}
                      multiline
                      maxLength={500}
                    />
                    <TouchableOpacity 
                      style={[styles.sendCommentBtn, { backgroundColor: newComment.trim() ? '#1565C0' : (t.dark ? '#2a2a2a' : '#eaeaea') }]}
                      onPress={handleAddComment}
                      disabled={!newComment.trim() || submittingComment}
                    >
                      {submittingComment 
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Ionicons name="send" size={16} color={newComment.trim() ? '#fff' : t.subText} />
                      }
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={[styles.loginToCommentText, { color: t.subText }]}>Vui lòng đăng nhập để có thể bình luận.</Text>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  input: { 
    borderWidth: 1, 
    borderRadius: 10, 
    padding: 12, 
    marginBottom: 14, 
    fontSize: 15,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
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

  // Styles cho Post Detail & Comment Modal
  detailModalContent: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  detailModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  closeBtn: { padding: 4 },
  detailModalHeaderTitle: { fontSize: 16, fontWeight: 'bold' },
  detailScrollList: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  detailPostArea: { marginBottom: 20 },
  detailPostTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 10 },
  detailPostContent: { fontSize: 14, lineHeight: 22, marginBottom: 14 },
  detailPostImage: { width: '100%', height: 220, borderRadius: 12, marginVertical: 8, resizeMode: 'cover' },
  detailStatsRow: { flexDirection: 'row', gap: 20, paddingVertical: 12, borderBottomWidth: 1, marginBottom: 16 },
  commentsSectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  
  noCommentsWrapper: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  noCommentsText: { fontSize: 13, textAlign: 'center' },
  
  commentCard: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  commentContentWrapper: { flex: 1 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  commentAuthor: { fontSize: 13, fontWeight: '600' },
  commentTime: { fontSize: 10 },
  commentBody: { fontSize: 13, lineHeight: 18 },
  
  commentInputWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  commentInputInner: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, gap: 10 },
  commentTextInput: { 
    flex: 1, 
    fontSize: 14, 
    paddingVertical: 4, 
    maxHeight: 80,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  sendCommentBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  loginToCommentText: { fontSize: 13, textAlign: 'center', fontStyle: 'italic', paddingVertical: 6 },
});

export default ForumScreen;
