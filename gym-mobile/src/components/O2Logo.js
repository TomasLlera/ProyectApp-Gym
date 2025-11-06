// src/components/O2Logo.js
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { theme } from '../constants/theme';

export const O2Logo = ({ size = 'medium', showText = true }) => {
  const sizes = {
    small: { image: 60, text: 16 },
    medium: { image: 120, text: 24 },
    large: { image: 200, text: 32 },
  };

  const currentSize = sizes[size];

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/o2-gym-logo.png')}
        style={{
          width: currentSize.image,
          height: currentSize.image,
        }}
        resizeMode="contain"
      />
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.title, { fontSize: currentSize.text }]}>
            O2 Gym
          </Text>
          <Text style={[styles.subtitle, { fontSize: currentSize.text * 0.5 }]}>
            Cuida tu salud
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  textContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 4,
  },
  subtitle: {
    color: theme.colors.primary,
  },
});