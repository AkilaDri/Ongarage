import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { OnChatPill } from '@ongarage/shared';
import { useChat } from '../context/ChatContext';

/**
 * The OnChat button at the top right: the ONCHAT pill (opens the list of every conversation, the number is the unread messages). `scrolled` is kept for the
 * pages that pass it; the pill stays the same size.
 */
export const ChatHeaderButton: React.FC<{ scrolled?: Animated.Value }> = () => {
  const { openInbox, totalUnread } = useChat();
  return (
    <View style={styles.box}>
      <OnChatPill onPress={openInbox} count={totalUnread} />
    </View>
  );
};

const styles = StyleSheet.create({
  box: { height: 44, justifyContent: 'center', alignItems: 'flex-end', zIndex: 3 },
});
