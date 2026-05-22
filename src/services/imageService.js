import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { supabase } from './supabaseClient';

/**
 * Yêu cầu quyền truy cập Camera và Thư viện ảnh
 */
export const requestMediaPermissions = async () => {
  if (Platform.OS === 'web') {
    // Trình duyệt Web không cần xin quyền qua Expo Native API
    return {
      cameraGranted: true,
      libraryGranted: true,
    };
  }

  try {
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    const libraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();

    return {
      cameraGranted: cameraStatus.status === 'granted',
      libraryGranted: libraryStatus.status === 'granted',
    };
  } catch (error) {
    console.warn("Lỗi xin quyền native:", error);
    return { cameraGranted: false, libraryGranted: false };
  }
};

/**
 * Mở Camera để chụp ảnh
 */
export const takePhoto = async () => {
  try {
    const { cameraGranted } = await requestMediaPermissions();
    if (!cameraGranted) {
      return { error: 'Cần cấp quyền truy cập camera để chụp ảnh.' };
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      let base64Data = asset.base64;

      // Hỗ trợ Web: Nếu base64 trống nhưng URI là data URL, tự trích xuất
      if (!base64Data && asset.uri && asset.uri.startsWith('data:')) {
        const parts = asset.uri.split(';base64,');
        if (parts.length > 1) {
          base64Data = parts[1];
        }
      }

      // Đảm bảo loại bỏ tiền tố nếu còn sót
      if (base64Data) {
        base64Data = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      }

      return { 
        success: true,
        uri: asset.uri,
        base64: base64Data 
      };
    }
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Mở thư viện để chọn ảnh
 */
export const pickImage = async () => {
  try {
    const { libraryGranted } = await requestMediaPermissions();
    if (!libraryGranted) {
      return { success: false, error: 'Cần cấp quyền truy cập thư viện để chọn ảnh.' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      let base64Data = asset.base64;

      // Hỗ trợ Web: Nếu base64 trống nhưng URI là data URL, tự trích xuất
      if (!base64Data && asset.uri && asset.uri.startsWith('data:')) {
        const parts = asset.uri.split(';base64,');
        if (parts.length > 1) {
          base64Data = parts[1];
        }
      }

      // Đảm bảo loại bỏ tiền tố nếu còn sót
      if (base64Data) {
        base64Data = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      }

      return { 
        success: true,
        uri: asset.uri,
        base64: base64Data 
      };
    }
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Tải ảnh lên Supabase Storage
 * @param {string} uri - Local URI của ảnh
 * @param {string} path - Đường dẫn lưu trên Storage (vd: 'avatars/user123.jpg')
 */
export const uploadImageToStorage = async (uri, path) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Loại bỏ tiền tố '/' ở đầu đường dẫn nếu có để tránh lỗi tạo thư mục rỗng trong Supabase Storage
    const cleanedPath = path.startsWith('/') ? path.slice(1) : path;
    const bucket = 'plants'; // Tên bucket lưu trữ của Supabase

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(cleanedPath, blob, {
        contentType: blob.type || 'image/jpeg',
        upsert: true
      });
      
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(cleanedPath);
      
    return { success: true, url: publicUrl };
  } catch (error) {
    console.error("Lỗi upload ảnh Supabase:", error);
    return { success: false, error: error.message };
  }
};
