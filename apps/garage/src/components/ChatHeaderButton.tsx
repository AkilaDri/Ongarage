import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FONTS, Icon, getThemeMode, themedStyles } from '@ongarage/shared';
import { useChat } from '../context/ChatContext';

/** The chat icon in the top header: opens the list of every conversation; a red count shows the unread messages. */
export const ChatHeaderButton: React.FC = () => {
  const { openInbox, totalUnread } = useChat();
  return (
    <Pressable style={styles.btn} onPress={openInbox} hitSlop={6} accessibilityLabel="Messages">
      <Icon name="message-circle" size={26} color="#ffffff" />
      {totalUnread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalUnread > 9 ? '9+' : totalUnread}</Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    btn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: getThemeMode() === 'dark' ? '#3b6fd4' : '#1a73e8',
      shadowColor: '#3c4043',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 4,
      elevation: 4,
    },
    icon: { fontSize: 18 },
    badge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, borderWidth: 2, borderColor: getThemeMode() === 'dark' ? '#12161c' : '#ffffff', backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
    badgeText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  })
);
