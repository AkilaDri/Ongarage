import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';
import { money } from '../utils/format';
import { CancelQuoteSheet } from './CancelQuoteSheet';
import type { Booking } from '../types';

/** On a job card and in its chat: the owner asked to cancel (answer it with a compensation), or the garage's answer is waiting for the owner. */
export const CancelRequestNote: React.FC<{ booking: Booking }> = ({ booking: b }) => {
  const [open, setOpen] = useState(false);
  const req = b.progress?.cancelRequest;
  if (!req) return null;
  return (
    <View style={styles.box} accessibilityLabel="Cancellation request">
      <Text style={styles.title}>{req.status === 'requested' ? '🛑 අයිතිකරු රැකියාව අවලංගු කිරීමට ඉල්ලයි' : '⏳ අයිතිකරුගේ තීරණය බලාපොරොත්තුවෙන්'}</Text>
      <Text style={styles.text}>
        හේතුව: {req.reason}
        {req.note ? ` · “${req.note}”` : ''}
      </Text>
      {req.status === 'requested' ? (
        <>
          <Text style={styles.text}>අනුමත කර, මෙතෙක් කළ වැඩවලට ඔබගේ වන්දිය දන්වන්න.</Text>
          <ActionButton label="අනුමත කර වන්දිය දන්වන්න" icon="💰" variant="primary" compact onPress={() => setOpen(true)} />
        </>
      ) : (
        <Text style={styles.text}>
          💰 ඔබ දැන්වූ වන්දිය {money(req.compensation ?? 0)}
          {req.workDone ? ` (${req.workDone})` : ''} — අයිතිකරු එකඟ වුවහොත් රැකියාව අවලංගු වේ; නැත්නම් ඉල්ලීම ඉවත් කර වැඩ දිගටම කෙරේ.
        </Text>
      )}
      <CancelQuoteSheet booking={open ? b : null} onClose={() => setOpen(false)} />
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    box: { gap: 6, padding: 12, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fce8e6', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.4)' },
    title: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.errorText },
    text: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 18 },
  })
);
