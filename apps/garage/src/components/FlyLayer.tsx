import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { measureFlyTarget, onFly, type FlyKind, type FlyPoint } from '../utils/fly';

const LOOK: Record<FlyKind, { glyph: string; color: string }> = {
  bid: { glyph: '🤝', color: '#1a73e8' },
  schedule: { glyph: '📅', color: '#16a34a' },
  done: { glyph: '✓', color: '#16a34a' },
};

/**
 * Draws the flying token: it pops up in the middle of the screen, then arcs to where the thing now is (the "My bids" chip on the Jobs page, the Schedule
 * tab in the bottom bar), shrinking as it goes, and a ring spreads out from the place it lands.
 */
export const FlyLayer: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const [kind, setKind] = useState<FlyKind | null>(null);
  const t = useRef(new Animated.Value(0)).current;
  // Where it really lands, measured while it pops in (the page's header has come back down by then); until then a guess.
  const [landed, setLanded] = useState<FlyPoint | null>(null);

  // One continuous timeline (no stops between the parts): 0 - 0.18 the token pops in, 0.18 - 0.3 it holds, 0.3 - 0.85 it glides to its place, 0.8 - 1 the ring spreads.
  useEffect(
    () =>
      onFly((k) => {
        setKind(k);
        setLanded(null);
        t.setValue(0);
        setTimeout(() => measureFlyTarget(k).then((p) => p && setLanded(p)), 600);
        Animated.timing(t, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }).start(() => setKind(null));
      }),
    [t]
  );

  if (!kind) return null;
  const look = LOOK[kind];
  // Where it starts (the middle of the page) and where it lands.
  const from = { x: width / 2, y: height * 0.5 };
  const to = landed ?? (kind === 'bid' ? { x: width * 0.83, y: 150 } : { x: width * 0.7, y: height - 36 });
  // 0 -> 0.25 pops in place, 0.25 -> 1 travels.
  const move = t.interpolate({ inputRange: [0, 0.3, 0.85, 1], outputRange: [0, 0, 1, 1], easing: Easing.bezier(0.45, 0, 0.2, 1) });
  const x = move.interpolate({ inputRange: [0, 1], outputRange: [from.x, to.x] });
  const y = move.interpolate({ inputRange: [0, 0.5, 1], outputRange: [from.y, Math.min(from.y, to.y) - 70, to.y] });
  const scale = t.interpolate({ inputRange: [0, 0.18, 0.3, 0.85, 1], outputRange: [0.4, 1.15, 1.1, 0.4, 0.4], easing: Easing.out(Easing.cubic) });
  const opacity = t.interpolate({ inputRange: [0, 0.06, 0.78, 0.86, 1], outputRange: [0, 1, 1, 0, 0] });
  const ringScale = t.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.5, 0.5, 2], easing: Easing.out(Easing.quad) });
  const ringOpacity = t.interpolate({ inputRange: [0, 0.8, 0.84, 1], outputRange: [0, 0, 0.7, 0] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[styles.ring, { left: to.x - 24, top: to.y - 24, borderColor: look.color, opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
      />
      <Animated.View style={[styles.token, { backgroundColor: look.color, opacity, transform: [{ translateX: Animated.subtract(x, 22) }, { translateY: Animated.subtract(y, 22) }, { scale }] }]}>
        <Text style={styles.glyph}>{look.glyph}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  token: { position: 'absolute', left: 0, top: 0, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  glyph: { fontSize: 20, color: '#ffffff', fontWeight: '800' },
  ring: { position: 'absolute', width: 48, height: 48, borderRadius: 24, borderWidth: 3 },
});
