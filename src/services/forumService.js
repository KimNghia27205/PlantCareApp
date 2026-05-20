import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Lấy danh sách bài viết trên diễn đàn
 */
export const getPosts = async () => {
  try {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const posts = [];
    querySnapshot.forEach((docSnap) => {
      posts.push({ id: docSnap.id, ...docSnap.data() });
    });
    
    return { success: true, data: posts };
  } catch (error) {
    console.error("Lỗi tải bài viết:", error);
    return { success: false, error: 'Không thể tải danh sách bài viết.' };
  }
};

/**
 * Đăng bài viết mới
 */
export const createPost = async (postData) => {
  try {
    const docRef = await addDoc(collection(db, 'posts'), {
      ...postData,
      likes: 0,
      comments: 0,
      createdAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Lỗi đăng bài:", error);
    return { success: false, error: 'Không thể đăng bài viết.' };
  }
};

/**
 * Thả tim bài viết
 */
export const likePost = async (postId) => {
  try {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      likes: increment(1)
    });
    return { success: true };
  } catch (error) {
    console.error("Lỗi like bài viết:", error);
    return { success: false, error: 'Không thể thả tim.' };
  }
};
