import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, 
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, 
  Platform, ScrollView 
} from 'react-native';
import { loginUser, registerUser, sendForgotPasswordEmail } from '../services/authService';

const LoginScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Validate đầu vào
    if (!email.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    if (!isLogin && !displayName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên hiển thị.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await loginUser(email.trim(), password);
      } else {
        result = await registerUser(email.trim(), password, displayName.trim());
      }

      if (!result.success) {
        console.error("Supabase Auth Error:", result.error);
        
        let errorMessage = result.error;
        if (isLogin) {
          // Chỉ định nghĩa thông báo lỗi chung khi nhập sai mật khẩu/tài khoản
          errorMessage = 'Mật khẩu hoặc tài khoản chưa chính xác vui lòng nhập lại';
        } else {
          errorMessage = 'Lỗi: ' + result.error;
        }
        
        // Cố gắng hiển thị thông báo lỗi
        if (Platform.OS === 'web') {
          window.alert(errorMessage);
        } else {
          Alert.alert('Lỗi', errorMessage);
        }
      }
      // Nếu thành công, AuthContext sẽ tự động nhận user và chuyển trang
    } catch (error) {
      console.error("Unexpected Error:", error);
      if (Platform.OS === 'web') {
        window.alert('Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.');
      } else {
        Alert.alert('Lỗi', 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };



  const handleForgotPassword = async () => {
    if (!email.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Vui lòng nhập địa chỉ email vào ô phía trên để nhận liên kết đặt lại mật khẩu.');
      } else {
        Alert.alert(
          'Quên mật khẩu', 
          'Vui lòng nhập email của bạn vào ô Email phía trên để nhận liên kết khôi phục mật khẩu.'
        );
      }
      return;
    }

    setLoading(true);
    try {
      const result = await sendForgotPasswordEmail(email.trim());
      if (result.success) {
        if (Platform.OS === 'web') {
          window.alert('Liên kết đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư!');
        } else {
          Alert.alert(
            'Thành công',
            'Liên kết đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư đến (hoặc thư rác).'
          );
        }
      } else {
        console.error("Forgot Password Error:", result.error);
        let errorMessage = 'Không thể gửi email khôi phục. Vui lòng kiểm tra lại email của bạn.';
        if (result.error.includes('auth/user-not-found') || result.error.includes('user-not-found')) {
          errorMessage = 'Tài khoản email này chưa được đăng ký.';
        } else if (result.error.includes('auth/invalid-email') || result.error.includes('invalid-email')) {
          errorMessage = 'Địa chỉ email không đúng định dạng.';
        }
        
        if (Platform.OS === 'web') {
          window.alert(errorMessage);
        } else {
          Alert.alert('Lỗi', errorMessage);
        }
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      if (Platform.OS === 'web') {
        window.alert('Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.');
      } else {
        Alert.alert('Lỗi', 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.appTitle}>🌿 PlantCareApp</Text>
        <Text style={styles.subtitle}>
          {isLogin ? 'Đăng nhập để tiếp tục' : 'Tạo tài khoản mới'}
        </Text>

        {/* Tên hiển thị - chỉ hiện khi đăng ký */}
        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Tên hiển thị"
            placeholderTextColor="#999"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <TextInput
          style={styles.input}
          placeholder="Mật khẩu"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        {isLogin && (
          <TouchableOpacity 
            onPress={handleForgotPassword} 
            style={styles.forgotPasswordButton}
            disabled={loading}
          >
            <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleSubmit} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isLogin ? 'Đăng nhập' : 'Đăng ký'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setIsLogin(!isLogin)} 
          style={styles.switchButton}
        >
          <Text style={styles.switchText}>
            {isLogin 
              ? 'Chưa có tài khoản? Đăng ký ngay' 
              : 'Đã có tài khoản? Đăng nhập'}
          </Text>
        </TouchableOpacity>


      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f7f0',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 14,
    color: '#333',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  forgotPasswordText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#4CAF50',
    fontSize: 15,
  },

});

export default LoginScreen;
