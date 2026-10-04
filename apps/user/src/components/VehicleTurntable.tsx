import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Colors, themedStyles } from '@ongarage/shared';

const W = 66;
const H = 56;
const RX = 27; // platform radii
const RY = 7.5;
const CY = H - 11; // platform centre
const STEPS = 36;
const SPIN_MS = 4200;
const LIGHT_PHASES = [0, 1 / 3, 2 / 3];

const range = Array.from({ length: STEPS + 1 }, (_, i) => i / STEPS);
const angle = (t: number, phase = 0) => (t + phase) * Math.PI * 2;

// The car is drawn side-on, so a turn around the vertical axis is a horizontal
// squash through edge-on, mirrored for the far side. A true cos θ lingers at
// full width and reads as a pause, so the squash runs at a constant rate instead.
const squash = (t: number) => 4 * Math.abs(t - 0.5) - 1; // triangle wave: +1 → −1 → +1 over one turn
const carScaleX = range.map(squash);
const shadowScale = range.map((t) => 0.55 + 0.45 * Math.abs(squash(t)));

const light = (phase: number) => ({
  x: range.map((t) => RX * Math.cos(angle(t, phase))),
  y: range.map((t) => RY * Math.sin(angle(t, phase))),
  // sin > 0 is the near edge of the platform: brighter and larger there.
  opacity: range.map((t) => 0.25 + 0.75 * ((Math.sin(angle(t, phase)) + 1) / 2)),
  scale: range.map((t) => 0.6 + 0.6 * ((Math.sin(angle(t, phase)) + 1) / 2)),
});
const LIGHTS = LIGHT_PHASES.map(light);

interface VehicleTurntableProps {
  vehicleId: string;
  icon: string;
  onPress?: () => void;
}

export const VehicleTurntable: React.FC<VehicleTurntableProps> = ({ vehicleId, icon, onPress }) => {
  const spin = useRef(new Animated.Value(0)).current;
  const arrive = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const turn = Animated.loop(Animated.timing(spin, { toValue: 1, duration: SPIN_MS, easing: Easing.linear, useNativeDriver: true }));
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    turn.start();
    pulse.start();
    return () => {
      turn.stop();
      pulse.stop();
    };
  }, [spin, glow]);

  // A newly selected vehicle drops onto the stage.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    arrive.setValue(0);
    Animated.spring(arrive, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
  }, [vehicleId, arrive]);

  const lights = useMemo(
    () =>
      LIGHTS.map((l) => ({
        opacity: spin.interpolate({ inputRange: range, outputRange: l.opacity }),
        transform: [
          { translateX: spin.interpolate({ inputRange: range, outputRange: l.x }) },
          { translateY: spin.interpolate({ inputRange: range, outputRange: l.y }) },
          { scale: spin.interpolate({ inputRange: range, outputRange: l.scale }) },
        ],
      })),
    [spin]
  );

  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel="තෝරාගත් වාහනය">
      <View style={styles.stage}>
        <Animated.View style={[styles.spotlight, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] }) }]} />

        <View style={styles.platformRim} />
        <View style={styles.platform} />
        {lights.map((style, i) => (
          <Animated.View key={i} style={[styles.light, style]} />
        ))}

        <Animated.View
          style={[styles.carShadow, { transform: [{ scaleX: spin.interpolate({ inputRange: range, outputRange: shadowScale }) }] }]}
        />
        <Animated.Text
          style={[
            styles.car,
            {
              opacity: arrive,
              transform: [
                { translateY: arrive.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) },
                { scale: arrive.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                { scaleX: spin.interpolate({ inputRange: range, outputRange: carScaleX }) },
              ],
            },
          ]}
        >
          {icon}
        </Animated.Text>
      </View>
    </Pressable>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    stage: { width: W, height: H, alignItems: 'center' },
    spotlight: {
      position: 'absolute',
      top: 2,
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(56, 189, 248, 0.16)',
      shadowColor: Colors.primary,
      shadowOpacity: 0.6,
      shadowRadius: 16,
    },
    platformRim: {
      position: 'absolute',
      top: CY - RY - 2,
      width: RX * 2 + 4,
      height: RY * 2 + 6,
      borderRadius: RX,
      backgroundColor: Colors.bgCardHover,
      borderWidth: 1.5,
      borderColor: 'rgba(56, 189, 248, 0.55)',
      shadowColor: Colors.primary,
      shadowOpacity: 0.7,
      shadowRadius: 10,
      elevation: 4,
    },
    platform: {
      position: 'absolute',
      top: CY - RY,
      width: RX * 2 - 4,
      height: RY * 2,
      borderRadius: RX,
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: Colors.glassBorder,
    },
    light: {
      position: 'absolute',
      top: CY - 2,
      left: W / 2 - 2,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: Colors.primary,
      shadowColor: Colors.primary,
      shadowOpacity: 1,
      shadowRadius: 4,
    },
    carShadow: {
      position: 'absolute',
      top: CY - 4,
      width: 30,
      height: 7,
      borderRadius: 4,
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    car: { position: 'absolute', top: CY - 33, fontSize: 30, lineHeight: 36 },
  })
);
