// src/constants/theme.js
export const theme = {
  colors: {
    primary: '#F97316',
    primaryDark: '#EA6C0A',
    primaryLight: '#FB923C',
    secondary: '#0F0F0F',
    white: '#FFFFFF',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    background: '#0F0F0F',
    card: '#1C1C1E',
    cardBorder: '#2C2C2E',
    text: {
      primary: '#F5F5F5',
      secondary: '#A1A1AA',
      light: '#71717A',
    },
    border: '#2C2C2E',
  },

  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 12,
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  typography: {
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#F5F5F5',
    },
    subtitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#F5F5F5',
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      color: '#A1A1AA',
    },
    caption: {
      fontSize: 14,
      fontWeight: '400',
      color: '#71717A',
    },
  },
};
