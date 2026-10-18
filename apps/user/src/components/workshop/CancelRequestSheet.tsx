import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, FONTS, themedStyles } from '@ongarage/shared';
import { useWorkshops, type OwnerWorkshop } from '../../context/WorkshopContext';
import { money } from '../../utils/format';
import { Sheet } from '../Sheet';

/**
 * Where a cancellation the owner asked for stands. Waiting: the garage has not answered yet (the owner may withdraw the request).
 * Answered: the garage approved it and states its compensation for the work done so far; the owner pays it and cancels (and rates the garage),
 * or withdraws the request and the work carries on.
 */
export const CancelRequestSheet: React.FC<{ workshop: OwnerWorkshop | null; onClose: () => void }> = ({ workshop, onClose }) => {
  const { confirmCancel, withdrawCancel } = useWorkshops();
  const [shown, setShown] = useState(workshop);
  const [stars, setStars] = useState(0);

  useEffect(() => {
    if (!workshop) return;
    setShown(workshop);
    setStars(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshop?.id]);

  const w = workshop ?? shown;
  const req = w?.progress.cancelRequest;
  if (!w || !req) return null;
  const quoted = req.status === 'quoted';

  return (
    <Sheet
      visible={!!workshop}
      title={quoted ? 'වන්දි යෝජනාව' : 'අවලංගු කිරීමේ ඉල්ලීම'}
      subtitle={`${w.garageName} · ${quoted ? 'ගරාජයේ පිළිතුර' : 'පිළිතුර බලාපොරොත්තුවෙන්'}`}
      onClose={onClose}
      footer={
        <View style={styles.col}>
          {quoted && (
            <ActionButton
              label={`${money(req.compensation ?? 0)} වන්දියට එකඟයි — රැකියාව අවලංගු කරන්න`}
              icon="✓"
              variant="success"
              compact
              onPress={() => {
                confirmCancel(w.id, { rating: stars || undefined });
                onClose();
              }}
            />
          )}
          <ActionButton
            label="ඉල්ලීම ඉවත් කර වැඩ දිගටම කරගෙන යන්න"
            icon="↩️"
            variant="ghost"
            compact
            onPress={() => {
              withdrawCancel(w.id);
              onClose();
            }}
          />
        </View>
      }
    >
      <View style={styles.box}>
        <Text style={styles.label}>ඔබගේ ඉල්ලීම</Text>
        <Text style={styles.text}>
          හේතුව: {req.reason}
          {req.note ? ` · “${req.note}”` : ''}
        </Text>
      </View>

      {!quoted && <Text style={styles.waiting}>⏳ {w.garageName} ඉල්ලීම සලකා බලා, මෙතෙක් කළ වැඩවලට වන්දියක් දැනුම් දෙයි. එතෙක් වැඩ නවතා ඇත — ඔබට ඉල්ලීම ඉවත් කර වැඩ දිගටම කරගෙන යා හැක.</Text>}

      {quoted && (
        <>
          <View style={[styles.box, styles.quote]} accessibilityLabel="Garage compensation">
            <Text style={styles.label}>ගරාජය අනුමත කළා — වන්දිය</Text>
            <Text style={styles.amount}>{money(req.compensation ?? 0)}</Text>
            {!!req.workDone && <Text style={styles.text}>මෙතෙක් කළ වැඩ: {req.workDone}</Text>}
            <Text style={styles.hint}>මෙම මුදල අවලංගු කළ පසු ගරාජයට ගෙවිය යුතුයි (යෙදුමෙන් පිටත). වන්දිය වැඩි යැයි හැඟේ නම් ඉල්ලීම ඉවත් කර වැඩ දිගටම කරගෙන යන්න.</Text>
          </View>

          <Text style={styles.label}>ගරාජයේ සේවාව ශ්‍රේණිගත කරන්න (විකල්ප)</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setStars((s) => (s === n ? 0 : n))} hitSlop={6} accessibilityLabel={`Rate ${n} stars`}>
                <Text style={[styles.star, n <= stars && styles.starOn]}>{n <= stars ? '★' : '☆'}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    col: { gap: 8 },
    box: { gap: 4, padding: 12, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    quote: { borderColor: 'rgba(16, 185, 129, 0.5)' },
    label: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    text: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 19 },
    amount: { fontSize: 24, fontFamily: FONTS.titleBold, color: Colors.successText },
    hint: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    waiting: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 19 },
    stars: { flexDirection: 'row', gap: 6 },
    star: { fontSize: 30, color: Colors.textMuted },
    starOn: { color: '#f59e0b' },
  })
);
