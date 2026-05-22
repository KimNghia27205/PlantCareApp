import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Lấy cấu hình Firebase từ biến môi trường của Expo
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Kiểm tra xem developer đã thay thế config placeholder chưa
if (firebaseConfig.apiKey === "YOUR_API_KEY" || firebaseConfig.projectId === "YOUR_PROJECT_ID") {
  console.warn(
    '[PlantCareApp] ⚠️ Firebase chưa được cấu hình! ' +
    'Vui lòng thay thế các giá trị placeholder trong src/services/firebaseConfig.js ' +
    'bằng thông tin từ Firebase Console của bạn.'
  );
}

// 1. Khởi tạo Firebase App
const app = initializeApp(firebaseConfig);

// 2. Khởi tạo Authentication
// Tách biệt logic persistence: Mobile dùng AsyncStorage, Web dùng mặc định (IndexedDB/LocalStorage)
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app); // Tự động dùng browserLocalPersistence trên Web
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

// 3. Khởi tạo Cloud Firestore
const db = getFirestore(app);

// 4. Khởi tạo Cloud Storage
const storage = getStorage(app);
storage.maxUploadRetryTime = 4000;    // Thử lại tối đa 4 giây khi upload
storage.maxOperationRetryTime = 4000; // Thử lại tối đa 4 giây cho tác vụ khác

export { app, auth, db, storage };
