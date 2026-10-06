import React, { createContext, useContext, useMemo, useRef } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Colors, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';

/** How far a card must travel sideways before it opens the full details. */
const SWIPE_OPEN = 70;

/**
 * Nested cards (a garage's bid inside a posted job's card): a touch that starts inside
 * an inner card belongs to it, so the outer card doesn't move with it.
 */
const NestContext = createContext<{ inner: boolean } | null>(null);

/**
 * A card that can be dragged sideways (either way). Past SWIPE_OPEN it springs back
 * and dissolves into the full details; vertical drags still scroll the list. The card
 * only slides (no fading) and its text can't be selected while dragging, so it never
 * flickers on the web.
 */
export const SwipeCard: React.FC<{ onOpen: () => void; style: StyleProp<ViewStyle>; children: React.ReactNode }> = ({ onOpen, style, children }) => {
  const x = useRef(new Animated.Value(0)).current;
  const open = useRef(onOpen);
  open.current = onOpen;
  const parent = useContext(NestContext);
  const nest = useRef({ inner: false }).current;

  const responder = useMemo(() => {
    const settle = () => Animated.spring(x, { toValue: 0, stiffness: 260, damping: 24, useNativeDriver: Platform.OS !== 'web' }).start();
    return PanResponder.create({
      // Capture runs outer → inner on every new touch: the outer card forgets any old
      // claim, then an inner card claims this touch for itself.
      onStartShouldSetPanResponderCapture: () => {
        nest.inner = false;
        if (parent) parent.inner = true;
        return false;
      },
      // Capture so a swipe that starts on a button still moves the card; taps are unaffected.
      onMoveShouldSetPanResponderCapture: (_, g) => !nest.inner && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => x.setValue(Math.max(-140, Math.min(140, g.dx))),
      onPanResponderRelease: (_, g) => {
        const opened = Math.abs(g.dx) > SWIPE_OPEN || (Math.abs(g.dx) > 30 && Math.abs(g.vx) > 0.6);
        settle();
        if (opened) open.current();
      },
      onPanResponderTerminate: settle,
    });
  }, [x, nest, parent]);

  const reveal = x.interpolate({ inputRange: [-SWIPE_OPEN, -12, 0, 12, SWIPE_OPEN], outputRange: [1, 0, 0, 0, 1], extrapolate: 'clamp' });

  return (
    <View>
      <Animated.View style={[styles.reveal, { opacity: reveal }]} pointerEvents="none">
        <Text style={styles.revealText}>📄 සම්පූර්ණ විස්තර</Text>
        <Text style={styles.revealText}>සම්පූර්ණ විස්තර 📄</Text>
      </Animated.View>
      <Animated.View {...responder.panHandlers} style={[style, NO_SELECT, { transform: [{ translateX: x }] }]}>
        <NestContext.Provider value={nest}>{children}</NestContext.Provider>
      </Animated.View>
    </View>
  );
};

// Dragging over text on the web would select it and interrupt the swipe.
const NO_SELECT = (Platform.OS === 'web' ? { userSelect: 'none' } : {}) as ViewStyle;

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
