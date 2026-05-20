import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const ForumScreen = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const dummyPosts = [
    { 
      id: 'dummy1', 
      title: 'Cây trầu bà của mình bị vàng lá, xin cứu!', 
      content: 'Mọi người cho mình hỏi cây trầu bà nhà mình dạo này hay bị vàng lá rụng nhiều là bị sao ạ?', 
      author: 'Mai Hương', 
      tags: ['#chuabenh', '#trauba'],
      likes: 12,
      comments: 5
    },
    { 
      id: 'dummy2', 
      title: 'Khoe góc ban công xanh mát mùa hè', 
      content: 'Chăm bẵm mãi cuối cùng mấy ẻm sen đá cũng lên màu đẹp quá.', 
      author: 'PlantLover_99', 
      tags: ['#bancong', '#senda'],
      likes: 45,
      comments: 10
    },
  ];

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const postList = [];
      querySnapshot.forEach((doc) => {
        postList.push({ id: doc.id, ...doc.data() });
      });
      
      setPosts(postList.length > 0 ? postList : dummyPosts);
    } catch (error) {
      console.error("Lỗi tải bài viết:", error);
      setPosts(dummyPosts);
    } finally {
      setLoading(false);
    }
  };

  const renderPost = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postContent} numberOfLines={2}>{item.content}</Text>
      
      <View style={styles.tagsContainer}>
        {item.tags?.map((tag, index) => (
          <Text key={index} style={styles.tag}>{tag}</Text>
        ))}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.author}>✍️ {item.author}</Text>
        <View style={styles.stats}>
          <Text style={styles.statText}>❤️ {item.likes || 0}</Text>
          <Text style={styles.statText}>💬 {item.comments || 0}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cộng đồng</Text>
        <TouchableOpacity style={styles.createButton}>
          <Text style={styles.createButtonText}>Đăng bài</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#1565C0" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          renderItem={renderPost}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  statText: { color: '#555', marginLeft: 15, fontSize: 13 }
});

export default ForumScreen;
