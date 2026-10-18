import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, FONTS, getThemeMode, RATING_EXPIRY_MONTHS, tagLabel, themedStyles } from '@ongarage/shared';
import { useWorkshops, type OwnerWorkshop } from '../../context/WorkshopContext';
import { Sheet } from '../Sheet';

type Mode = 'reply' | 'dispute' | null;

/** The owner answers a garage's rating: a reply that is shown with it, or a dispute (it then stays out of the public record until it is settled). */
const AnswerSheet: React.FC<{ workshop: OwnerWorkshop | null; mode: Mode; onClose: () => void }> = ({ workshop, mode, onClose }) => {
  const { replyToCustomerRating, disputeCustomerRating } = useWorkshops();
  const [shown, setShown] = useState(workshop);
  const [text, setText] = useState('');
  useEffect(() => {
    if (!workshop) return;
    setShown(workshop);
    setText('');
  }, [workshop?.id, mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const w = workshop ?? shown;
  if (!w?.progress.customerRating) return null;
  const dispute = mode === 'dispute';
  return (
    <Sheet
      visible={!!workshop && !!mode}
      title={dispute ? 'ශ්‍රේණිගත කිරීම ගැන ගැටලුවක්' : 'ශ්‍රේණිගත කිරීමට පිළිතුරක්'}
      subtitle={w.garageName}
      onClose={onClose}
      footer={
        <ActionButton
          label={dispute ? 'ගැටලුව ඉදිරිපත් කරන්න' : 'පිළිතුර යවන්න'}
          icon={dispute ? '⚠️' : '💬'}
          variant="primary"
          disabled={!text.trim()}
          onPress={() => {
            if (dispute) disputeCustomerRating(w.id, text);
            else replyToCustomerRating(w.id, text);
            onClose();
          }}
        />
      }
    >
      <Text style={styles.hint}>
        {dispute
          ? 'ශ්‍රේණිගත කිරීම වැරදියි නම් හේතුව සඳහන් කරන්න. විසඳෙන තෙක් එය අනෙක් ගරාජවලට පෙනෙන ඔබගේ වාර්තාවට ගණන් නොගනී.'
          : 'ඔබගේ පිළිතුර ශ්‍රේණිගත කිරීම සමඟ පෙන්වයි.'}
      </Text>
      <TextInput style={styles.input} multiline placeholder={dispute ? 'උදා: මම එදිනම ගෙවා ඇත (රිසිට් අංකය…)' : 'ඔබගේ පිළිතුර'} placeholderTextColor={Colors.textMuted} value={text} onChangeText={setText} maxLength={200} accessibilityLabel="Rating answer" />
    </Sheet>
  );
};

/** A garage's rating of the owner for a closed job, with the owner's reply or dispute. Shown on the job's card (the tracker) and on the Account tab. */
export const CustomerRatingView: React.FC<{ workshop: OwnerWorkshop }> = ({ workshop: w }) => {
  const [mode, setMode] = useState<Mode>(null);
  const r = w.progress.customerRating;
  if (!r) return null;
  const open = r.dispute?.status === 'open';

  return (
    <View style={styles.box} accessibilityLabel="Garage's rating of you">
      <Text style={styles.title}>
        ⭐ {w.garageName} ඔබව ★{r.stars} ලෙස ශ්‍රේණිගත කළා
      </Text>
      {r.tags.length > 0 && <Text style={styles.text}>{r.tags.map(tagLabel).join(' · ')}</Text>}
      {!!r.note && <Text style={styles.text}>“{r.note}”</Text>}
      {!!r.reply && <Text style={styles.text}>💬 ඔබගේ පිළිතුර: “{r.reply.text}”</Text>}
      {open && <Text style={[styles.text, { color: Colors.warning }]}>⚠️ ඔබ ගැටලුවක් ඉදිරිපත් කළා: “{r.dispute!.note}” — OnGarage සලකා බලයි; එතෙක් මෙය ඔබගේ පොදු වාර්තාවට ගණන් නොගනී.</Text>}
      {!r.dispute && (
        <View style={styles.row}>
          {!r.reply && (
            <View style={styles.flex1}>
              <ActionButton label="පිළිතුරු දෙන්න" icon="💬" variant="ghost" compact onPress={() => setMode('reply')} />
            </View>
          )}
          <View style={styles.flex1}>
            <ActionButton label="ගැටලුවක්" icon="⚠️" variant="ghost" compact onPress={() => setMode('dispute')} />
          </View>
        </View>
      )}
      <Text style={styles.fine}>මාස {RATING_EXPIRY_MONTHS}කට පසු මෙය ගණන් නොගනී. ඉතිරි මුදල ගෙවූ විට “ගෙවුවේ නැහැ” “ප්‍රමාදව ගෙවුවා” බවට පත් වේ.</Text>
      <AnswerSheet workshop={mode ? w : null} mode={mode} onClose={() => setMode(null)} />
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', gap: 8 },
    box: { gap: 6, padding: 12, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.08)' : '#f1f6fe', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#d2e3fc' },
    title: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    text: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 18 },
    fine: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 15 },
    hint: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    input: { minHeight: 80, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard, color: Colors.textMain, fontSize: 13, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top' },
  })
);
