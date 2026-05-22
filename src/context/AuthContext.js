import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    // 1. Kiểm tra session hiện tại khi mở app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(normalizeUser(session?.user ?? null));
      setLoading(false);
    });

    // 2. Lắng nghe sự thay đổi trạng thái đăng nhập từ Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(normalizeUser(session?.user ?? null));
      setLoading(false);
    });

    // Cleanup subscription khi component unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

