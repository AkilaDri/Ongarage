import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, FONTS, SERVICE_CATEGORIES, themedStyles, softEdge, softShadow } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { Sheet } from './Sheet';

/**
 * Which services the garage offers. Edits are a draft until saved, so a stray tap
 * can't silently stop jobs for a category.
 */
export const ServicesSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { profile, bids, toggleService } = useGarage();
  const [draft, setDraft] = useState<string[]>(profile.services);

  useEffect(() => {
    if (visible) setDraft(profile.services);
  }, [visible, profile.services]);

  const added = draft.filter((id) => !profile.services.includes(id));
  const removed = profile.services.filter((id) => !draft.includes(id));
  const changes = added.length + removed.length;
  const pendingIn = (id: string) => bids.filter((b) => b.status === 'pending' && b.job.categoryId === id).length;

  const save = () => {
    [...added, ...removed].forEach(toggleService);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      title="ලබා දෙන සේවා"
      subtitle="ඔබට රැකියා සහ ඍජු වෙන්කිරීම් ලැබෙන්නේ තෝරාගත් සේවා සඳහා පමණි"
      onClose={onClose}
      footer={
        <ActionButton
          label={changes ? `වෙනස්කම් ${changes} සුරකින්න` : 'වෙනස්කම් නැත'}
          icon="✓"
          variant="primary"
          disabled={!changes || draft.length === 0}
          onPress={save}
        />
      }
    >
      {SERVICE_CATEGORIES.map((c) => {
        const on = draft.includes(c.id);
        const pending = pendingIn(c.id);
        const turningOff = !on && profile.services.includes(c.id);
        return (
          <Pressable key={c.id} style={[styles.row, on && styles.rowOn]} onPress={() => setDraft((d) => (on ? d.filter((x) => x !== c.id) : [...d, c.id]))}>
            <Text style={styles.icon}>{c.icon}</Text>
            <View style={styles.flex1}>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.sub} numberOfLines={1}>
                {c.subcategories.slice(0, 3).join(' · ')}
              </Text>
              {turningOff && pending > 0 && <Text style={styles.warn}>⚠️ මෙම සේවාවේ ඔබගේ ලංසු {pending} ක් තවම විවෘතයි</Text>}
            </View>
            <View style={[styles.switch, on && styles.switchOn]}>
              <View style={[styles.knob, on && styles.knobOn]} />
            </View>
          </Pressable>
        );
      })}
      {draft.length === 0 && <Text style={[styles.warn, { textAlign: 'center' }]}>අවම වශයෙන් එක් සේවාවක් තෝරන්න.</Text>}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: softEdge(), backgroundColor: Colors.bgCard, ...softShadow() },
    rowOn: { borderColor: 'rgba(56, 189, 248, 0.45)' },
    icon: { fontSize: 22, width: 30, textAlign: 'center' },
    name: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    warn: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, marginTop: 3 },
    switch: { width: 42, height: 24, borderRadius: 12, padding: 3, backgroundColor: Colors.subtleBorder, justifyContent: 'center' },
    switchOn: { backgroundColor: Colors.primary },
    knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
    knobOn: { alignSelf: 'flex-end' },
  })
);
