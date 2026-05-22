import { collection, addDoc, getDocs, query, where, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebaseConfig';

/**
 * Upload hình ảnh lên Firebase Storage và trả về URL
 */
export const uploadPlantImage = async (base64Data, userId) => {
  try {
    const filename = `plants/${userId}/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);

    await uploadString(storageRef, base64Data, 'base64', {
      contentType: 'image/jpeg'
    });

    const downloadUrl = await getDownloadURL(storageRef);
    // FIX #10: Trả về cả storagePath lẫn downloadUrl để dùng khi xóa
    return { success: true, url: downloadUrl, storagePath: filename };
  } catch (error) {
    console.error("Lỗi upload ảnh:", error);
    return { success: false, error: 'Không thể tải ảnh lên hệ thống.' };
  }
};

/**
 * Thêm một cây mới vào Firestore
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
 * Xóa một cây trồng khỏi hệ thống
 * FIX #10: Đọc storagePath từ Firestore thay vì dùng downloadUrl trực tiếp
 */
export const deletePlant = async (plantId) => {
  try {
    // Lấy document để lấy storagePath
    const plantRef = doc(db, 'plants', plantId);
    const plantSnap = await getDoc(plantRef);

    if (plantSnap.exists()) {
      const data = plantSnap.data();
      // FIX #10: Ưu tiên dùng storagePath (path thật), không dùng downloadURL
      const pathToDelete = data.storagePath || null;

      if (pathToDelete) {
        try {
          const imageRef = ref(storage, pathToDelete);
          await deleteObject(imageRef);
        } catch (storageError) {
          // Không block nếu ảnh đã bị xóa hoặc không tồn tại
          console.warn("Không thể xóa ảnh trên Storage:", storageError.code);
        }
      }
    }

    // Xóa document trên Firestore
    await deleteDoc(plantRef);
    return { success: true };
  } catch (error) {
    console.error("Lỗi xóa cây:", error);
    return { success: false, error: 'Không thể xóa cây trồng này.' };
  }
};

/**
 * Thêm một bản ghi nhật ký mới cho cây
 */
export const addPlantLog = async (logData, base64Image = null) => {
  try {
    let imageUrl = null;
    let storagePath = null;

    if (base64Image) {
      const filename = `plant_logs/${logData.userId}/${logData.plantId}_${Date.now()}.jpg`;
      const storageRefObj = ref(storage, filename);
      await uploadString(storageRefObj, base64Image, 'base64', { contentType: 'image/jpeg' });
      imageUrl = await getDownloadURL(storageRefObj);
      storagePath = filename;
    }

    const docRef = await addDoc(collection(db, 'plant_logs'), {
      plantId: logData.plantId,
      userId: logData.userId,
      note: logData.note,
      date: logData.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      imageUrl: imageUrl,
      storagePath: storagePath
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Lỗi thêm nhật ký:", error);
    return { success: false, error: 'Không thể lưu nhật ký cây.' };
  }
};

/**
 * Lấy danh sách nhật ký của một cây
 */
export const getPlantLogs = async (plantId) => {
  try {
    const q = query(collection(db, 'plant_logs'), where("plantId", "==", plantId));
    const querySnapshot = await getDocs(q);

    const logs = [];
    querySnapshot.forEach((docSnap) => {
      logs.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Sắp xếp giảm dần theo ngày ghi chú (date) hoặc createdAt
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));

    return { success: true, data: logs };
  } catch (error) {
    console.error("Lỗi tải nhật ký:", error);
    return { success: false, error: 'Không thể tải nhật ký cây trồng.' };
  }
};

/**
 * Xóa một bản ghi nhật ký
 */
export const deletePlantLog = async (logId) => {
  try {
    const logRef = doc(db, 'plant_logs', logId);
    const logSnap = await getDoc(logRef);

    if (logSnap.exists()) {
      const data = logSnap.data();
      const pathToDelete = data.storagePath;

      if (pathToDelete) {
        try {
          const imageRef = ref(storage, pathToDelete);
          await deleteObject(imageRef);
        } catch (storageError) {
          console.warn("Không thể xóa ảnh nhật ký trên Storage:", storageError.code);
        }
      }
    }

    await deleteDoc(logRef);
    return { success: true };
  } catch (error) {
    console.error("Lỗi xóa nhật ký:", error);
    return { success: false, error: 'Không thể xóa bản ghi nhật ký này.' };
  }
};
