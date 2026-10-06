import React, { useMemo, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Colors, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';

/** How far a card must travel sideways before it opens the full details. */
const SWIPE_OPEN = 70;

/**
 * A card that can be dragged sideways (either way). Past SWIPE_OPEN it springs back
 * and dissolves into the full job details; vertical drags still scroll the list.
 */
export const SwipeCard: React.FC<{ onOpen: () => void; style: StyleProp<ViewStyle>; children: React.ReactNode }> = ({ onOpen, style, children }) => {
  const x = useRef(new Animated.Value(0)).current;
  const open = useRef(onOpen);
  open.current = onOpen;

  const responder = useMemo(() => {
    const settle = () => Animated.spring(x, { toValue: 0, stiffness: 260, damping: 24, useNativeDriver: true }).start();
    return PanResponder.create({
      // Capture so a swipe that starts on a button still moves the card; taps are unaffected.
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => x.setValue(Math.max(-140, Math.min(140, g.dx))),
      onPanResponderRelease: (_, g) => {
        const opened = Math.abs(g.dx) > SWIPE_OPEN || (Math.abs(g.dx) > 30 && Math.abs(g.vx) > 0.6);
        settle();
        if (opened) open.current();
      },
      onPanResponderTerminate: settle,
    });
  }, [x]);

  const reveal = x.interpolate({ inputRange: [-SWIPE_OPEN, -12, 0, 12, SWIPE_OPEN], outputRange: [1, 0, 0, 0, 1], extrapolate: 'clamp' });
  const fadeOut = x.interpolate({ inputRange: [-140, 0, 140], outputRange: [0.45, 1, 0.45], extrapolate: 'clamp' });

  return (
    <View>
      <Animated.View style={[styles.reveal, { opacity: reveal }]} pointerEvents="none">
        <Text style={styles.revealText}>📄 සම්පූර්ණ විස්තර</Text>
        <Text style={styles.revealText}>සම්පූර්ණ විස්තර 📄</Text>
      </Animated.View>
      <Animated.View {...responder.panHandlers} style={[style, { opacity: fadeOut, transform: [{ translateX: x }] }]}>
        {children}
      </Animated.View>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    reveal: {
      ...StyleSheet.absoluteFill,
      borderRadius: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      backgroundColor: 'rgba(56, 189, 248, 0.14)',
      borderWidth: 1,
      borderColor: 'rgba(56, 189, 248, 0.4)',
    },
    revealText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: Colors.primary },
  })
);
