import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { BRAND, FONTS, OnChatIcon, getThemeMode, themedStyles } from '@ongarage/shared';
import { useChat } from '../context/ChatContext';

/**
 * The chat icon in the top bar: opens the list of every conversation; a red count shows the unread messages.
 * `scrolled` (0 = top of the page, 1 = scrolled): the full ONCHAT icon fades into the short ON one.
 * `round`: a round brand-coloured button with the short ON bubble in white, for the corner of the folded Home.
 * `night`: a soft light that pulses behind the button, so it reads on the dark sky.
 */
export const ChatHeaderButton: React.FC<{ scrolled?: Animated.Value; round?: boolean; night?: boolean }> = ({ scrolled, round = false, night = false }) => {
  const { openInbox, totalUnread } = useChat();
  const fill = getThemeMode() === 'dark' ? '#3b6fd4' : BRAND.navy;
  const fallback = useRef(new Animated.Value(0)).current;
  const progress = scrolled ?? fallback;
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!night) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [night, glow]);
  const halo = night && <Animated.View pointerEvents="none" style={[styles.halo, round ? styles.haloRound : styles.haloTop, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }]} />;
  if (round) {
    return (
      <Pressable style={[styles.round, { backgroundColor: fill }]} onPress={openInbox} hitSlop={6} accessibilityLabel="Messages">
        {halo}
        <OnChatIcon width={32} color={fill} fill="#ffffff" short />
        {totalUnread > 0 && (
          <View style={styles.roundBadge}>
            <Text style={styles.badgeText}>{totalUnread > 9 ? '9+' : totalUnread}</Text>
          </View>
        )}
      </Pressable>
    );
  }
  return (
    <Pressable style={styles.btn} onPress={openInbox} hitSlop={6} accessibilityLabel="Messages">
      {halo}
      <Animated.View style={{ opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
        <OnChatIcon width={64} color="#ffffff" fill={fill} />
        {totalUnread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalUnread > 9 ? '9+' : totalUnread}</Text>
          </View>
        )}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.shortWrap, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}>
        <View>
          <OnChatIcon width={40} color="#ffffff" fill={fill} short />
          {/* Half over the bubble's top right corner, so it sits on the edge. */}
          {totalUnread > 0 && (
            <View style={styles.badgeInBubble}>
              <Text style={styles.badgeInBubbleText}>{totalUnread > 9 ? '9+' : totalUnread}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    btn: {
      width: 66,
      height: 66,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      // In front of the sky, so the sun / moon never covers the button.
      zIndex: 3,
    },
    shortWrap: { alignItems: 'flex-end', justifyContent: 'center' },
    badge: { position: 'absolute', top: -12, right: -10, zIndex: 2, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, borderWidth: 2, borderColor: getThemeMode() === 'dark' ? '#12161c' : '#ffffff', backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
    badgeText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    badgeInBubble: { position: 'absolute', top: -7, right: -7, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, borderWidth: 2, borderColor: getThemeMode() === 'dark' ? '#12161c' : '#ffffff', backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
    badgeInBubbleText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    round: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#0D2B3E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    // A soft halo only: no solid fill, just a light shadow that spreads a little past the icon.
    halo: { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, backgroundColor: 'transparent', shadowColor: '#7dd3fc', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 8, elevation: 0 },
    haloTop: { borderRadius: 32 },
    haloRound: { borderRadius: 34 },
    roundBadge: { position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, borderWidth: 2, borderColor: '#ffffff', backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  })
);
