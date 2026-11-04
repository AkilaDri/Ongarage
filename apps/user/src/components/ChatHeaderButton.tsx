import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { FONTS, OnChatIcon, getThemeMode, themedStyles } from '@ongarage/shared';
import { useChat } from '../context/ChatContext';

/**
 * The chat icon in the top bar: opens the list of every conversation; a red count shows the unread messages.
 * `scrolled` (0 = top of the page, 1 = scrolled): the full ONCHAT icon fades into the short ON one.
 */
export const ChatHeaderButton: React.FC<{ scrolled?: Animated.Value }> = ({ scrolled }) => {
  const { openInbox, totalUnread } = useChat();
  const fill = getThemeMode() === 'dark' ? '#3b6fd4' : '#1a73e8';
  const fallback = useRef(new Animated.Value(0)).current;
  const progress = scrolled ?? fallback;
  return (
    <Pressable style={styles.btn} onPress={openInbox} hitSlop={6} accessibilityLabel="Messages">
      <Animated.View style={{ opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
        <OnChatIcon width={64} color="#ffffff" fill={fill} />
        {totalUnread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalUnread > 9 ? '9+' : totalUnread}</Text>
          </View>
        )}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.shortWrap, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}>
        {/* The count takes the place of "ON" in the middle of the bubble; with no new message it just says ON. */}
        <OnChatIcon width={40} color="#ffffff" fill={fill} short label={totalUnread > 0 ? (totalUnread > 9 ? '9+' : String(totalUnread)) : undefined} />
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
  })
);
