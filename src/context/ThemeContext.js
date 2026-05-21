import React, { createContext, useState, useContext } from 'react';

export const ThemeContext = createContext();

// Hook tiện lợi để dùng trong các screen
export const useTheme = () => useContext(ThemeContext);

// Bảng màu cho 2 theme
export const lightTheme = {
  dark: false,
  bg: '#F2FBF2',
  cardBg: '#fff',
  sectionBg: '#fff',
  text: '#333',
  subText: '#666',
  headerBg: '#F2FBF2',
  bannerBg: '#3E8E41',
  tabBarBg: '#fff',
  tabBarBorder: '#eee',
  inputBg: '#fff',
  inputBorder: '#ddd',
  settingsBg: '#f0f7f0',
};

export const darkTheme = {
  dark: true,
  bg: '#121212',
  cardBg: '#1E1E1E',
  sectionBg: '#1E1E1E',
  text: '#E8E8E8',
  subText: '#A0A0A0',
  headerBg: '#121212',
  bannerBg: '#2A6A2E',
  tabBarBg: '#1E1E1E',
  tabBarBorder: '#333',
  inputBg: '#2C2C2C',
  inputBorder: '#444',
  settingsBg: '#121212',
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => setIsDark(prev => !prev);
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
