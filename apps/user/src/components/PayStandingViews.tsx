import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ActionButton, Colors, FONTS, getThemeMode, OVERDUE_LIMIT_DAYS, OWED_LIMIT, PAY_LEVEL_TEXT, themedStyles } from '@ongarage/shared';
import { usePayStanding } from '../context/PayStanding';
import { useCustomerRecord } from '../context/CustomerRecord';
import { useWorkshops } from '../context/WorkshopContext';
import { CustomerRatingView } from './workshop/CustomerRatingView';
import { money } from '../utils/format';
import { elevation1, outline } from '../utils/material';
import { Sheet } from './Sheet';

/**
 * The owner's payment record on the Account tab: the badge (new / good / sometimes late / a problem), what it is made of, and what the limits are, so a customer who
 * has fallen behind knows exactly how to put it right (pay the balance: the limit lifts the moment it is paid).
 */
export const PayReliabilityCard: React.FC = () => {
  const s = usePayStanding();
  const rec = useCustomerRecord();
  const { workshops } = useWorkshops();
  // What other garages see: the worse of how I pay and what garages said. The ratings themselves are listed below, to answer or dispute.
  const t = PAY_LEVEL_TEXT[rec.level];
  const rated = Object.values(workshops).filter((w) => !!w.progress.customerRating);
  return (
    <View style={styles.card} accessibilityLabel="Payment record">
      <View style={styles.row}>
        <Text style={styles.badge}>{t.icon}</Text>
        <View style={styles.flex1}>
          <Text style={styles.title}>ගෙවීම් වාර්තාව</Text>
          <Text style={styles.level}>{t.label}</Text>
        </View>
      </View>
      {s.jobs > 0 && (
        <View style={styles.tiles}>
          <View style={styles.tile}>
            <Text style={styles.tileValue}>{s.jobs}</Text>
            <Text style={styles.tileLabel}>රැකියා</Text>
          </View>
          <View style={styles.tile}>
            <Text style={[styles.tileValue, { color: Colors.successText }]}>{s.paidInFull}</Text>
            <Text style={styles.tileLabel}>කාලයට ගෙවූ</Text>
          </View>
          <View style={styles.tile}>
            <Text style={[styles.tileValue, { color: s.unpaid ? Colors.errorText : Colors.successText }]}>{s.unpaid ? money(s.owed) : '✓'}</Text>
            <Text style={styles.tileLabel}>ඉතිරි</Text>
          </View>
        </View>
      )}
      {s.limited && (
        <View style={styles.limit}>
          <Text style={styles.limitTitle}>⛔ නව වැඩ නවතා ඇත</Text>
          <Text style={styles.limitText}>{s.reason}. ගෙවූ විගස නැවත විවෘත වේ.</Text>
        </View>
      )}
      {rated.length > 0 && <Text style={styles.heading}>ගරාජ ඔබ ගැන කියූ දේ</Text>}
      {rated.map((w) => (
        <CustomerRatingView key={w.id} workshop={w} />
      ))}
      <Text style={styles.fine}>දින {OVERDUE_LIMIT_DAYS}ක් හෝ LKR {OWED_LIMIT.toLocaleString('en-US')} ක් ප්‍රමාද වුවහොත් නව වැඩ නවතී.</Text>
    </View>
  );
};

/** A calm bar above the tab bar while a balance is due or late (tap: where it is owed); louder once new work is limited. */
export const PayStandingBanner: React.FC<{ onPress: () => void; /** Inside the Home card, between the action cards and the search bar, not floating above the tab bar. */ inline?: boolean }> = ({ onPress, inline }) => {
  const s = usePayStanding();
  const { width } = useWindowDimensions();
  if (!s.warn && !s.limited) return null;
  // The notice's two lines each stay on one line on most phones: the text size follows the width left for the text. Measured in Noto Sans Sinhala, the second line is
  // 24.75 times its size wide and the bold first line 17.2 times; the bar's padding and the Home card's own padding come off the screen's width. 13px is the most, 11px the least.
  const textWidth = width - (inline ? 86 : 38);
  const bodySize = Math.min(13, Math.max(11, Math.floor((textWidth / 25.3) * 10) / 10));
  const titleSize = Math.min(14.5, Math.max(12.5, Math.floor((textWidth / 17.9) * 10) / 10));
  return (
    <Pressable style={[styles.banner, inline && styles.bannerInline, s.limited && styles.bannerLimited]} onPress={onPress} accessibilityLabel="Payment balance reminder">
      {s.limited ? (
        // What happened (bold, dark red), then what to do (regular, the main text colour), each on its own line.
        <View style={styles.bannerLines}>
          <Text style={[styles.bannerTitle, { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.7) }]}>ප්‍රමාද වූ හිඟ මුදල් ගෙවිමක් ඇත.</Text>
          <Text style={[styles.bannerBody, { fontSize: bodySize, lineHeight: Math.round(bodySize * 1.7) }]}>Ongarage සේවා ලබා ගැනීමට එම මුදල පියවන්න.</Text>
        </View>
      ) : (
        <Text style={styles.bannerText} numberOfLines={3}>
          {`⚠️ ගෙවිය යුතු ${money(s.owed)} ${s.overdueDays ? 'ප්‍රමාදයි' : 'අද දිනයයි'} — බලන්න ›`}
        </Text>
      )}
    </Pressable>
  );
};

/** Shown instead of starting a new job, accepting a bid or booking directly while the owner's balance limits it. */
export const PayFirstSheet: React.FC<{ visible: boolean; onClose: () => void; onViewOwed: () => void }> = ({ visible, onClose, onViewOwed }) => {
  const s = usePayStanding();
  return (
    <Sheet
      visible={visible}
      title="පළමුව ඉතිරි හිඟ මුදල ගෙවන්න"
      subtitle="එතෙක් quotes සහ bookings නවතා ඇත"
      onClose={onClose}
      footer={
        <ActionButton
          label="ගෙවිය යුතු හිඟ මුදල බලන්න"
          icon="💳"
          variant="primary"
          onPress={() => {
            onClose();
            onViewOwed();
          }}
        />
      }
    >
      <Text style={styles.text}>
        දින {s.overdueDays}ක් ප්‍රමාද වූ LKR {s.owed.toLocaleString('en-US')} ක හිඟ මුදල් ගෙවීමක් ඇත. එය ගරාජයට ගෙවා ගරාජය මගින්ද සහතික කළ පසු අලුත් රැකියා පළ කිරීම, ලංසු පිළිගැනීම සහ සෘජු වෙන් කිරීම නැවත විවෘත වේ.
      </Text>
      <Text style={styles.fine}>SOS, OnChat, OnMart සහ ගෙවීම් සැමවිටම විවෘතයි.</Text>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    card: { gap: 8, padding: 14, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    badge: { fontSize: 28 },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    heading: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    sub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
    level: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 1 },
    tiles: { flexDirection: 'row', gap: 8, marginTop: 2 },
    tile: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.08)' : '#f1f6fe' },
    tileValue: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    tileLabel: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    fine: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    text: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 20 },
    limit: { gap: 2, padding: 10, borderRadius: 10, backgroundColor: getThemeMode() === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fce8e6', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.4)' },
    limitTitle: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.errorText },
    limitText: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 18 },
    banner: { marginHorizontal: 6, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? '#4a3200' : '#fef7e0', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.5)' },
    // Inside the Home card, the search bar keeps its place (28px under the notice: the card's 8 gap + its own 20 top margin); the notice has the same 28px above it, so it sits in the middle of the space.
    bannerInline: { marginHorizontal: 4, marginBottom: 0, marginTop: 20 },
    bannerLimited: { backgroundColor: getThemeMode() === 'dark' ? '#4a1512' : '#fce8e6', borderColor: 'rgba(239, 68, 68, 0.5)' },
    // Sinhala has vowel signs above and below the line, so it needs about 1.7 times its size between lines.
    // The late-payment notice: the fact first (bold, dark red: about 7:1 on the pink), the action under it (regular). Leading about 1.7 times the size, for Sinhala's vowel signs.
    bannerLines: { gap: 2 },
    bannerTitle: { fontSize: 14.5, lineHeight: 25, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#fecaca' : '#991b1b' },
    bannerBody: { fontSize: 13.5, lineHeight: 23, fontFamily: FONTS.bodyRegular, color: Colors.textMain },
    bannerText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, lineHeight: 22 },
  })
);
