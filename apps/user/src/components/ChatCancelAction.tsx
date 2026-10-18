import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { canRequestCancel, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';
import { useWorkshops } from '../context/WorkshopContext';
import { CancelJobSheet } from './workshop/CancelJobSheet';

/** "Cancel the job" at the right end of the chat's vehicle bar: it asks for a reason and sends the garage the cancellation request. */
export const ChatCancelAction: React.FC<{ id: string }> = ({ id }) => {
  const { workshops } = useWorkshops();
  const [open, setOpen] = useState(false);
  const w = workshops[id];
  if (!w || !canRequestCancel(w.progress)) return null;
  return (
    <>
      <Pressable style={styles.btn} onPress={() => setOpen(true)} hitSlop={6} accessibilityLabel="Cancel this job">
        <Text style={styles.text}>✖ රැකියාව අවලංගු කරන්න</Text>
      </Pressable>
      <CancelJobSheet workshop={open ? w : null} onClose={() => setOpen(false)} />
    </>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    btn: { paddingHorizontal: 12, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(242, 139, 130, 0.5)' : 'rgba(217, 48, 37, 0.4)', backgroundColor: getThemeMode() === 'dark' ? 'rgba(242, 139, 130, 0.12)' : '#fce8e6' },
    text: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#f28b82' : '#d93025' },
  })
);
