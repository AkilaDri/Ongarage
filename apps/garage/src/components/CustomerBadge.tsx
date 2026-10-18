import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, PAY_LEVEL_TEXT, RATING_EXPIRY_MONTHS, tagLabel, themedStyles } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { money } from '../utils/format';
import { Sheet } from './Sheet';
import type { Customer } from '../types';

/**
 * What other garages have found about a customer, before taking their work: a badge (🟢 reliable, 🟡 sometimes late, 🔴 a payment problem) with how many jobs it rests on.
 * It is made from the customer's payment records and the ratings garages gave (never from the garages' names); tap it for the detail. A customer with no history shows nothing.
 */
export const CustomerBadge: React.FC<{ customer: Customer; compact?: boolean }> = ({ customer, compact }) => {
  const { customerRecord } = useGarage();
  const [open, setOpen] = useState(false);
  const r = customerRecord(customer);
  if (r.level === 'new') return null;
  const t = PAY_LEVEL_TEXT[r.level];

  return (
    <>
      {compact ? (
        // Just a mark that sits before the customer's name: the level's dot and the garages' average stars. Tap it for the detail.
        <Pressable onPress={() => setOpen(true)} hitSlop={8} style={styles.mark} accessibilityLabel={`Customer record ${t.label}`}>
          <Text style={styles.markText}>{t.icon}{r.avgStars ? ` ★${r.avgStars}` : ''}</Text>
        </Pressable>
      ) : (
      <Pressable style={[styles.badge, r.level === 'poor' && styles.poor, r.level === 'fair' && styles.fair]} onPress={() => setOpen(true)} accessibilityLabel={`Customer record ${t.label}`}>
        <Text style={styles.badgeText} numberOfLines={1}>
          {t.icon} {t.label} · රැකියා {r.jobs}
          {r.avgStars ? ` · ★${r.avgStars}` : ''}
        </Text>
      </Pressable>
      )}
      <Sheet visible={open} title="පාරිභෝගිකයාගේ වාර්තාව" subtitle={`${t.icon} ${t.label}`} onClose={() => setOpen(false)}>
        <Text style={styles.hint}>
          මෙය පාරිභෝගිකයාගේ ගෙවීම් වාර්තා සහ ගරාජ දුන් ශ්‍රේණිගත කිරීම් වලින් සෑදේ. ගරාජවල නම් පෙන්වන්නේ නැත.
        </Text>
        <View style={styles.rows}>
          <Row label="වාර්තා කළ රැකියා" value={String(r.jobs)} />
          <Row label="සම්පූර්ණයෙන් ගෙවූ" value={`${r.paidInFull}${r.paidLate ? ` (ප්‍රමාදව ${r.paidLate})` : ''}`} />
          <Row label="ඉතිරි මුදල්" value={r.unpaid ? `${money(r.owed)} · ගෙවා නැති ${r.unpaid}` : 'නැත'} />
          <Row label="ගරාජවල ශ්‍රේණිය" value={r.rated ? `★${r.avgStars} (${r.rated})` : '—'} />
        </View>
        {r.topTags.length > 0 && (
          <>
            <Text style={styles.heading}>ගරාජ බොහෝ විට කියූ දේ</Text>
            <View style={styles.tags}>
              {r.topTags.map((x) => (
                <View key={x.tag} style={styles.tag}>
                  <Text style={styles.tagText}>
                    {tagLabel(x.tag)} · {x.count}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
        {r.disputed > 0 && <Text style={styles.hint}>ℹ️ පාරිභෝගිකයා විරුද්ධ වූ ශ්‍රේණිගත කිරීම් {r.disputed}ක් විසඳෙන තෙක් මෙම වාර්තාවට ගණන් නොගනී.</Text>}
        <Text style={styles.hint}>සාධාරණත්වය සඳහා: කේතයෙන් වසා දැමූ රැකියා පමණක් ශ්‍රේණිගත කෙරේ; පාරිභෝගිකයාට පිළිතුරු දීමට සහ ගැටලුවක් ඉදිරිපත් කිරීමට හැක; මාස {RATING_EXPIRY_MONTHS}කට පසු සටහන් ගණන් නොගනී; ඉතිරි මුදල ගෙවූ විට “ගෙවුවේ නැහැ” “ප්‍රමාදව ගෙවුවා” බවට පත් වේ.</Text>
      </Sheet>
    </>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.45)', backgroundColor: getThemeMode() === 'dark' ? 'rgba(16, 185, 129, 0.1)' : '#e6f4ea' },
    mark: { flexShrink: 0 },
    markText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    fair: { borderColor: 'rgba(245, 158, 11, 0.5)', backgroundColor: getThemeMode() === 'dark' ? 'rgba(245, 158, 11, 0.1)' : '#fef7e0' },
    poor: { borderColor: 'rgba(239, 68, 68, 0.5)', backgroundColor: getThemeMode() === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fce8e6' },
    badgeText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    hint: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    rows: { gap: 6, padding: 12, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    rowLabel: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    rowValue: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, flexShrink: 1, textAlign: 'right' },
    heading: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: Colors.subtleFill },
    tagText: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textMain },
  })
);
