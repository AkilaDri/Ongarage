import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { themedStyles } from '@ongarage/shared';

const WeatherAnimation: React.FC<{ hour: number }> = ({ hour }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, [floatAnim]);

  const translateY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  
  let icon: string;
  if (hour < 12) icon = '☀️'; // Morning: sun
  else if (hour < 17) icon = '☁️'; // Afternoon: cloud
  else if (hour < 20) icon = '🌅'; // Evening: sunset
  else icon = '🌙'; // Night: moon

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY }] }]}>
      <Text style={styles.icon}>{icon}</Text>
    </Animated.View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { justifyContent: 'center', alignItems: 'center', width: 48, height: 48 },
    icon: { fontSize: 32 },
  })
);

export default WeatherAnimation;
