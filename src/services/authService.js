import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile 
} from 'firebase/auth';
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
