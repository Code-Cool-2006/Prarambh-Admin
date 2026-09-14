import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SparkTheme } from '@/constants/theme';

interface CyberCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  hasTab?: boolean;
  offsetColor?: string;
  borderColor?: string;
  borderRadius?: number;
}

export function CyberCard({
  children,
  style,
  innerStyle,
  hasTab = true,
  offsetColor = SparkTheme.cyberOffset,
  borderColor = SparkTheme.cyberBorder,
  borderRadius = 22,
}: CyberCardProps) {
  return (
    <View style={[s.container, style]}>
      {/* 1. Purple offset shadow backdrop */}
      <View
        style={[
          s.offsetBackdrop,
          {
            backgroundColor: offsetColor,
            borderRadius,
          },
        ]}
      />

      {/* 2. Front card with neon border */}
      <View
        style={[
          s.frontCard,
          {
            borderColor,
            borderRadius,
          },
        ]}
      >
        {/* Inner dark gradient content */}
        <LinearGradient
          colors={SparkTheme.gradients.cyberInner}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[s.innerContainer, { borderRadius: borderRadius - 2 }, innerStyle]}
        >
          {children}
        </LinearGradient>
      </View>

      {/* 3. Glowing neon pill tab on the right edge */}
      {hasTab && (
        <View
          style={[
            s.pillTab,
            {
              shadowColor: SparkTheme.accent,
            },
          ]}
        />
      )}
    </View>
  );
}

export default CyberCard;

const s = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  offsetBackdrop: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    opacity: 0.95,
  },
  frontCard: {
    borderWidth: 1.8,
    backgroundColor: '#090218',
    overflow: 'hidden',
    shadowColor: SparkTheme.cyberBorder,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  innerContainer: {
    padding: 20,
    width: '100%',
  },
  pillTab: {
    position: 'absolute',
    right: -6,
    top: '38%',
    width: 6,
    height: 38,
    backgroundColor: '#ede9fe',
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 10,
  },
});
