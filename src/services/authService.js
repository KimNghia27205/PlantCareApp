import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

/**
 * Đăng ký tài khoản mới bằng Email/Password
 * Đồng thời tạo một bản ghi user tương ứng trong Firestore
 */
export const registerUser = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Cập nhật displayName cho Auth profile
    await updateProfile(user, { displayName });

    // Force refresh để đảm bảo displayName đã cập nhật trước khi AuthContext đọc
    await user.reload();

    // Lưu thông tin user vào Firestore collection 'users'
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: displayName,
      createdAt: new Date().toISOString()
    });

    // Trả về currentUser đã được reload (có displayName mới nhất)
    return { success: true, user: auth.currentUser };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Đăng nhập bằng Email/Password
 */
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Đăng xuất
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Cấu hình Client ID lấy từ Firebase Console (Cần thay thế bằng ID thật)
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID_TU_FIREBASE.apps.googleusercontent.com',
});

/**
 * Đăng nhập bằng Google
 */
export const loginWithGoogle = async () => {
  try {
    // Kích hoạt Play Services
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    
    // Mở popup chọn tài khoản Google
    const userInfo = await GoogleSignin.signIn();
    
    // Lấy ID Token
    const { idToken } = await GoogleSignin.getTokens();

    // Tạo Credential cho Firebase
    const googleCredential = GoogleAuthProvider.credential(idToken);

    // Đăng nhập Firebase
    const userCredential = await signInWithCredential(auth, googleCredential);
    const user = userCredential.user;

    // Đảm bảo user có bản ghi trong Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLogin: new Date().toISOString()
    }, { merge: true }); // dùng merge để không ghi đè dữ liệu cũ (ví dụ: điểm số)

    return { success: true, user };
  } catch (error) {
    console.error("Google Sign-in Error:", error);
    return { success: false, error: error.message };
  }
};
