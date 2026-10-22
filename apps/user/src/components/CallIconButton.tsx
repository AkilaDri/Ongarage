import React from 'react';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { themedStyles } from '@ongarage/shared';
import { useChat } from '../context/ChatContext';

/** A round phone icon for the top of a repair card: one tap rings the garage. */
export const CallIconButton: React.FC<{ phone?: string; name: string; /** The job's chat, where the call is written down. */ chatId?: string }> = ({ phone, name, chatId }) => {
  const { logCall } = useChat();
  if (!phone) return null;
  return (
    <Pressable style={styles.btn} onPress={() => {
        if (chatId) logCall(chatId);
        Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
      }} hitSlop={6} accessibilityLabel={`Call ${name}`}>
      <Text style={styles.icon}>📞</Text>
    </Pressable>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    btn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16, 185, 129, 0.14)' },
    icon: { fontSize: 16 },
  })
);
