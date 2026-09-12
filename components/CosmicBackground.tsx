import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CosmicBackgroundProps {
  children?: React.ReactNode;
}

export function CosmicBackground({ children }: CosmicBackgroundProps) {
  return (
    <View style={s.container}>
      {/* Top large radial purple glow */}
      <View style={s.topGlow} />

      {/* Bottom right fuchsia accent glow */}
      <View style={s.bottomGlow} />

      {/* Mid left ambient lavender glow */}
      <View style={s.midGlow} />

      {children}
    </View>
  );
}

export default CosmicBackground;

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#060010',
    overflow: 'hidden',
    zIndex: -1,
  },
  topGlow: {
    position: 'absolute',
    top: -SCREEN_WIDTH * 0.4,
    left: SCREEN_WIDTH * 0.1,
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: (SCREEN_WIDTH * 0.8) / 2,
    backgroundColor: 'rgba(124, 58, 237, 0.22)',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 80,
    elevation: 0,
  },
  bottomGlow: {
    position: 'absolute',
    bottom: -SCREEN_WIDTH * 0.3,
    right: -SCREEN_WIDTH * 0.2,
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderRadius: (SCREEN_WIDTH * 0.7) / 2,
    backgroundColor: 'rgba(232, 121, 249, 0.14)',
    shadowColor: '#e879f9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 70,
    elevation: 0,
  },
  midGlow: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.45,
    left: -SCREEN_WIDTH * 0.25,
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.5,
    borderRadius: (SCREEN_WIDTH * 0.5) / 2,
    backgroundColor: 'rgba(147, 51, 234, 0.12)',
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 60,
    elevation: 0,
  },
});
