import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, 
  Modal, TextInput, Alert 
} from 'react-native';
import { getPosts, createPost, likePost } from '../services/forumService';
import { AuthContext } from '../context/AuthContext';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const ForumScreen = () => {
  const { user } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const result = await getPosts();
    if (result.success) {
      setPosts(result.data);
    } else {
      Alert.alert('Lỗi', result.error);
    }
    setLoading(false);
  };

  const handleCreatePost = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ tiêu đề và nội dung.');
      return;
    }
    if (!user) {
      Alert.alert('Lỗi', 'Bạn cần đăng nhập để đăng bài.');
      return;
    }

    setIsSubmitting(true);
    const newPost = {
      title,
      content,
      author: user.displayName || 'Người dùng ẩn danh',
      authorId: user.uid,
      tags: ['#hoidap'] // Mặc định cho demo
    };

    const result = await createPost(newPost);
    if (result.success) {
      // Tặng 10 điểm cho người dùng khi đăng bài thành công
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { points: increment(10) });
      } catch (e) {
        console.warn("Không thể cộng điểm:", e);
      }

      Alert.alert('Thành công', 'Bài viết đã được đăng! Bạn được cộng 10 điểm.');
      setModalVisible(false);
      setTitle('');
      setContent('');
      fetchData(); // Reload danh sách
    } else {
      Alert.alert('Lỗi', result.error);
    }
    setIsSubmitting(false);
  };

  const handleLike = async (postId) => {
    if (!user) return;
    
    // Optimistic UI update
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p));
    
    // Gửi request lên server
    await likePost(postId);
  };

  const renderPost = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postContent} numberOfLines={3}>{item.content}</Text>
      
      <View style={styles.tagsContainer}>
        {item.tags?.map((tag, index) => (
          <Text key={index} style={styles.tag}>{tag}</Text>
        ))}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.author}>✍️ {item.author}</Text>
        <View style={styles.stats}>
          <TouchableOpacity onPress={() => handleLike(item.id)}>
             <Text style={styles.statText}>❤️ {item.likes || 0}</Text>
          </TouchableOpacity>
          <Text style={styles.statText}>💬 {item.comments || 0}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cộng đồng</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.createButtonText}>Đăng bài</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#1565C0" style={{ marginTop: 50 }} />
      ) : posts.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#666' }}>Chưa có bài viết nào.</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          renderItem={renderPost}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshing={loading}
          onRefresh={fetchData}
        />
      )}

      {/* Modal Đăng Bài */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Đăng bài mới</Text>
            
            <TextInput 
              style={styles.input} 
              placeholder="Tiêu đề (VD: Cây trầu bà bị vàng lá)" 
              value={title}
              onChangeText={setTitle}
            />

            <TextInput 
              style={[styles.input, styles.textArea]} 
              placeholder="Nội dung bài viết..." 
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreatePost} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Đăng bài</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f0f4f8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1565C0' },
  createButton: { backgroundColor: '#1565C0', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  createButtonText: { color: '#fff', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 3 },
  postTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  postContent: { color: '#666', fontSize: 14, marginBottom: 12, lineHeight: 20 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  tag: { backgroundColor: '#E3F2FD', color: '#1976D2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, fontSize: 12, marginRight: 8, marginBottom: 5 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  author: { color: '#888', fontSize: 13, fontStyle: 'italic' },
  stats: { flexDirection: 'row' },
  statText: { color: '#555', marginLeft: 15, fontSize: 13 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: '#fff', borderRadius: 15, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1565C0', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
  textArea: { height: 120 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#eee', borderRadius: 8, marginRight: 10 },
  cancelBtnText: { color: '#333', fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#1565C0', borderRadius: 8, marginLeft: 10 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' }
});

export default ForumScreen;
