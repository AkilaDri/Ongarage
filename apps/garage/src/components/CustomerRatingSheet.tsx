import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, CUSTOMER_TAGS, FONTS, getAi, NOTE_BLOCKED, SUGGEST_MIN_CONFIDENCE, themedStyles, type CustomerTag } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { Sheet } from './Sheet';
import type { Booking } from '../types';

/**
 * The garage rates the customer after a closed job: stars, and fixed reasons (not free accusations) so other garages can read the record fairly; an optional short note
 * goes through the same moderation as a customer's review. The customer sees it, can answer it and can dispute it.
 */
export const CustomerRatingSheet: React.FC<{ booking: Booking | null; onClose: () => void }> = ({ booking, onClose }) => {
  const { rateCustomer } = useGarage();
  const [shown, setShown] = useState(booking);
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!booking) return;
    setShown(booking);
    const paid = booking.progress?.payment;
    // Start from what the payment record already says.
    setStars(0);
    setTags(paid ? (paid.status === 'paid' ? (paid.missedCount ? ['paidLate'] : ['paidOnTime']) : ['paidLate']) : []);
    setNote('');
    setProblem(null);
  }, [booking?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const b = booking ?? shown;
  if (!b) return null;
  const toggle = (t: CustomerTag) => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]));

  const submit = async () => {
    if (!stars) return;
    if (note.trim()) {
      const m = await getAi().moderate(note);
      if (m.confidence >= SUGGEST_MIN_CONFIDENCE && !m.value.ok) {
        setProblem(m.value.reasons.map((r) => NOTE_BLOCKED[r]).filter(Boolean).join(' '));
        return;
      }
    }
    if (rateCustomer(b.id, { stars, tags, note })) onClose();
  };

  return (
    <Sheet
      visible={!!booking}
      title="පාරිභෝගිකයා ශ්‍රේණිගත කරන්න"
      subtitle={`${b.customer.name} · ${b.title}`}
      onClose={onClose}
      footer={<ActionButton label="ශ්‍රේණිගත කරන්න" icon="⭐" variant="primary" disabled={!stars} onPress={submit} />}
    >
      <Text style={styles.hint}>සත්‍ය, කාරණා පදනම් වූ ශ්‍රේණිගත කිරීමක් පමණක් දෙන්න. පාරිභෝගිකයාට මෙය දැකීමට, පිළිතුරු දීමට සහ ගැටලුවක් ඉදිරිපත් කිරීමට හැක.</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setStars(n)} hitSlop={6} accessibilityLabel={`Rate customer ${n} stars`}>
            <Text style={[styles.star, n <= stars && styles.starOn]}>{n <= stars ? '★' : '☆'}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.heading}>මොන වගේද? (තෝරන්න)</Text>
      <View style={styles.tags}>
        {CUSTOMER_TAGS.map((t) => {
          const on = tags.includes(t.id);
          return (
            <Pressable key={t.id} style={[styles.tag, on && (t.good ? styles.tagGood : styles.tagBad)]} onPress={() => toggle(t.id)} accessibilityLabel={`Tag ${t.label}`} accessibilityState={{ selected: on }}>
              <Text style={[styles.tagText, on && styles.tagTextOn]}>
                {on ? '✓ ' : ''}
                {t.good ? '👍' : '⚠️'} {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput style={styles.note} multiline placeholder="කෙටි සටහනක් (විකල්ප)" placeholderTextColor={Colors.textMuted} value={note} onChangeText={(t) => { setNote(t); setProblem(null); }} maxLength={140} accessibilityLabel="Customer rating note" />
      {!!problem && <Text style={styles.error}>{problem}</Text>}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    hint: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    stars: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 4 },
    star: { fontSize: 36, color: Colors.textMuted },
    starOn: { color: '#f59e0b' },
    heading: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    tagGood: { borderColor: 'rgba(16, 185, 129, 0.6)', backgroundColor: 'rgba(16, 185, 129, 0.14)' },
    tagBad: { borderColor: 'rgba(239, 68, 68, 0.6)', backgroundColor: 'rgba(239, 68, 68, 0.12)' },
    tagText: { fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    tagTextOn: { color: Colors.textMain, fontFamily: FONTS.bodyBold },
    note: { minHeight: 56, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard, color: Colors.textMain, fontSize: 13, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top' },
    error: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
  })
);
