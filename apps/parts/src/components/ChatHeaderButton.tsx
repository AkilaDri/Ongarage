import React from 'react';
import { StyleSheet, View } from 'react-native';
import { OnChatPill } from '@ongarage/shared';
import { useChat } from '../context/ChatContext';

/** The OnChat button at the top right: the ONCHAT pill (opens the list of every conversation, the number is the unread messages). */
export const ChatHeaderButton: React.FC = () => {
  const { openInbox, totalUnread } = useChat();
  return (
    <View style={styles.box}>
      <OnChatPill onPress={openInbox} count={totalUnread} />
    </View>
  );
};

const styles = StyleSheet.create({
  box: { height: 44, justifyContent: 'center', zIndex: 3 },
});
