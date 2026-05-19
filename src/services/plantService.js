import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebaseConfig';

/**
 * Upload hình ảnh lên Firebase Storage và trả về URL
 * Sử dụng base64 string thay vì Blob để tương thích với React Native / Expo Go
 * @param {string} base64Data - Chuỗi base64 của ảnh (lấy từ imageService)
 * @param {string} userId - ID của người dùng để phân loại thư mục
 */
export const uploadPlantImage = async (base64Data, userId) => {
  try {
    // Tạo tên file ngẫu nhiên dựa trên thời gian
    const filename = `plants/${userId}/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);

    // Upload lên Firebase Storage bằng base64 string (ổn định trên React Native)
    await uploadString(storageRef, base64Data, 'base64', {
      contentType: 'image/jpeg'
    });

    // Lấy URL tĩnh
    const downloadUrl = await getDownloadURL(storageRef);
    return { success: true, url: downloadUrl };
  } catch (error) {
    console.error("Lỗi upload ảnh:", error);
    return { success: false, error: 'Không thể tải ảnh lên hệ thống.' };
  }
};

/**
 * Thêm một cây mới vào Firestore (Nhật ký cây trồng)
 * @param {object} plantData - Thông tin cây trồng (bao gồm imageUrl và kết quả từ AI)
 */
export const addPlant = async (plantData) => {
  try {
    const docRef = await addDoc(collection(db, 'plants'), {
      ...plantData,
      createdAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Lỗi thêm cây:", error);
    return { success: false, error: 'Không thể lưu thông tin cây.' };
  }
};

/**
 * Lấy danh sách cây trồng của một người dùng
 * @param {string} userId - ID người dùng
 */
export const getPlantsByUser = async (userId) => {
  try {
    const q = query(collection(db, 'plants'), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    const plants = [];
    querySnapshot.forEach((docSnap) => {
      plants.push({ id: docSnap.id, ...docSnap.data() });
    });
    
    return { success: true, data: plants };
  } catch (error) {
    console.error("Lỗi tải danh sách cây:", error);
    return { success: false, error: 'Không thể tải danh sách cây trồng.' };
  }
};

/**
 * Xóa một cây trồng khỏi hệ thống (bao gồm cả ảnh trên Storage)
 * @param {string} plantId - ID của cây trồng (Document ID trong Firestore)
 * @param {string} imageUrl - URL ảnh trên Storage để xóa kèm (tránh rò rỉ dung lượng)
 */
export const deletePlant = async (plantId, imageUrl) => {
  try {
    // Xóa ảnh trên Firebase Storage nếu có
    if (imageUrl) {
      try {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
      } catch (storageError) {
        // Không block nếu ảnh đã bị xóa hoặc không tồn tại
        console.warn("Không thể xóa ảnh trên Storage:", storageError);
      }
    }

    // Xóa document trên Firestore
    await deleteDoc(doc(db, 'plants', plantId));
    return { success: true };
  } catch (error) {
    console.error("Lỗi xóa cây:", error);
    return { success: false, error: 'Không thể xóa cây trồng này.' };
  }
};
