import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Thông tin cấu hình Firebase
// LƯU Ý: Vui lòng thay thế các giá trị bên dưới bằng thông tin từ Firebase Console của bạn
const firebaseConfig = {
  apiKey: "AIzaSyCkrmyB-ma8l5JPMN3N5FNtdTGGAxXGKhU",
  authDomain: "plantcareapp-5533e.firebaseapp.com",
  projectId: "plantcareapp-5533e",
  storageBucket: "plantcareapp-5533e.firebasestorage.app",
  messagingSenderId: "700039085798",
  appId: "1:700039085798:web:6b7206e15b6d40f2038527",
  measurementId: "G-1NR00J49YY"
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

export { app, auth, db, storage };
