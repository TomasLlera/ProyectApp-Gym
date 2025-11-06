// src/constants/theme.js
export const theme = {
  colors: {
    primary: '#FF6B35',
    primaryDark: '#E55A2B',
    primaryLight: '#FF8456',
    secondary: '#1A1A1A',
    white: '#FFFFFF',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    background: '#F9FAFB',
    card: '#FFFFFF',
    text: {
      primary: '#1F2937',
      secondary: '#6B7280',
      light: '#9CA3AF',
    },
    border: '#E5E7EB',
  },
  
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
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
      color: '#1F2937',
    },
    subtitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1F2937',
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      color: '#374151',
    },
    caption: {
      fontSize: 14,
      fontWeight: '400',
      color: '#6B7280',
    },
  },
};