import { supabase } from './supabaseClient';

// Hàm chuẩn hóa đối tượng User của Supabase để tương thích ngược hoàn toàn với mã Firebase cũ
const normalizeUser = (supabaseUser) => {
  if (!supabaseUser) return null;
  return {
    ...supabaseUser,
    uid: supabaseUser.id, // Map 'id' của Supabase thành 'uid' của Firebase
    displayName: supabaseUser.user_metadata?.display_name || supabaseUser.email?.split('@')[0] || 'User',
    email: supabaseUser.email
  };
};

/**
 * Đăng ký tài khoản mới bằng Email/Password
 * Đồng thời tạo một bản ghi user tương ứng trong bảng 'users' ở database
 */
export const registerUser = async (email, password, displayName) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName
        }
      }
    });

    if (error) throw error;
    const user = data.user;

    // Lưu thông tin profile user vào bảng 'users' để đồng bộ thông tin
    if (user) {
      const { error: dbError } = await supabase
        .from('users')
        .insert([
          {
            id: user.id,
            email: user.email,
            display_name: displayName,
            created_at: new Date().toISOString()
          }
        ]);
      if (dbError) {
        console.warn("Lỗi đồng bộ bảng users:", dbError.message);
      }
    }

    return { success: true, user: normalizeUser(user) };
  } catch (error) {
    console.error("Lỗi đăng ký:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Đăng nhập bằng Email/Password
 */
export const loginUser = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return { success: true, user: normalizeUser(data.user) };
  } catch (error) {
    console.error("Lỗi đăng nhập:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Đăng xuất
 */
export const logoutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Lỗi đăng xuất:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Gửi email đặt lại mật khẩu (quên mật khẩu)
 */
export const sendForgotPasswordEmail = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Lỗi quên mật khẩu:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Lấy thông tin chi tiết profile user từ bảng 'users'
 */
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    // Map snake_case to camelCase
    return {
      success: true,
      data: {
        id: data.id,
        email: data.email,
        displayName: data.display_name,
        points: data.points || 0,
        photoURL: data.photo_url || null,
        createdAt: data.created_at
      }
    };
  } catch (error) {
    console.error("Lỗi lấy thông tin profile:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Cập nhật thông tin profile user
 */
export const updateUserProfile = async (userId, updateData) => {
  try {
    const mappedData = {};
    if (updateData.displayName !== undefined) mappedData.display_name = updateData.displayName;
    if (updateData.points !== undefined) mappedData.points = updateData.points;
    if (updateData.photoURL !== undefined) mappedData.photo_url = updateData.photoURL;

    const { error } = await supabase
      .from('users')
      .update(mappedData)
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Lỗi cập nhật profile:", error.message);
    return { success: false, error: error.message };
  }
};


