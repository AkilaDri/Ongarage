import React, { useEffect, useState } from 'react';
import { pickPhotos } from '@ongarage/shared';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, FONTS, PhotoStrip, themedStyles, getThemeMode } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { formatDate, formatTime } from '../utils/format';
import { Sheet } from './Sheet';
import type { Booking } from '../types';

const outline = () => (getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0');

/**
 * The job card's list of details the garage added while the work goes on (what it found, what
 * it did, what it needs), newest last, with photos. New ones are added with the floating button
 * (`AddJobDetailFab`) until the job is done.
 */
export const JobCardUpdates: React.FC<{ booking: Booking }> = ({ booking: b }) => {
  const updates = b.updates ?? [];
  // Short by default: only the latest update, a line or two of it; the earlier ones open with a link.
  const [all, setAll] = useState(false);
  const shown = all ? updates : updates.slice(-1);
  const earlier = updates.length - 1;
  return (
    <>
      <Text style={styles.section}>රැකියා කාඩ්පත {updates.length ? `(${updates.length})` : ''}</Text>
      <View style={styles.card}>
        {updates.length === 0 && <Text style={styles.empty}>තවම විස්තර එක් කර නැත. රැකියාව සිදුවන අතරතුර හමු වූ දේ, කළ දේ සහ අවශ්‍ය දේ සටහන් කිරීමට පහළ දකුණේ ＋ බොත්තම ඔබන්න.</Text>}
        {shown.map((u, i) => (
          <View key={u.id} style={[styles.update, i === shown.length - 1 && styles.updateLast]}>
            <Text style={styles.when}>
              {formatDate(u.at)} · {formatTime(u.at)}
              {!all && !!u.photos?.length ? `  ·  📷 ${u.photos.length}` : ''}
            </Text>
            {!!u.text && (
              <Text style={styles.text} numberOfLines={all ? undefined : 2}>
                {u.text}
              </Text>
            )}
            {all && !!u.photos?.length && <PhotoStrip photos={u.photos} height={64} />}
          </View>
        ))}
        {earlier > 0 && (
          <Pressable onPress={() => setAll((v) => !v)} hitSlop={6} accessibilityLabel={all ? 'Show only the latest update' : 'Show the earlier updates'}>
            <Text style={styles.more}>{all ? 'අඩුවෙන් පෙන්වන්න ‹' : `කලින් විස්තර ${earlier} ක් බලන්න ›`}</Text>
          </Pressable>
        )}
      </View>
    </>
  );
};

/** The floating "＋" button on a job card: opens the form for a new detail. */
export const AddJobDetailFab: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <Pressable style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]} onPress={onPress} accessibilityLabel="Add a job detail">
    <Text style={styles.fabPlus}>＋</Text>
    <Text style={styles.fabLabel}>විස්තරයක්</Text>
  </Pressable>
);

/** The form behind the floating button: some text and photos for the job card. */
export const AddJobDetailSheet: React.FC<{ booking: Booking; visible: boolean; onClose: () => void }> = ({ booking: b, visible, onClose }) => {
  const { addJobUpdate } = useGarage();
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setText('');
      setPhotos([]);
    }
  }, [visible]);

  const add = () => {
    addJobUpdate(b.id, text, photos);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="රැකියා කාඩ්පතට විස්තරයක්"
      subtitle={`${b.title} · ${b.vehicle.plate}`}
      footer={<ActionButton label="කාඩ්පතට එක් කරන්න" icon="＋" variant="primary" disabled={!text.trim() && !photos.length} onPress={add} />}
    >
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="රැකියාව ගැන අලුත් විස්තරයක් (උදා: බ්‍රේක් ඩිස්ක් ද ගෙවී ඇත)"
        placeholderTextColor={Colors.textMuted}
        multiline
        autoFocus
        accessibilityLabel="Job card detail"
      />
      <PhotoStrip photos={photos} height={72} onAdd={photos.length < 6 ? () => void pickPhotos(6 - photos.length).then((ph) => ph.length && setPhotos((p) => [...p, ...ph])) : undefined} addLabel="ඡායාරූපයක්" />
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    section: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary, marginTop: 8, letterSpacing: 0.2 },
    card: {
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: outline(),
      borderRadius: 12,
      padding: 16,
      gap: 12,
      shadowColor: '#3c4043',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: getThemeMode() === 'dark' ? 0.4 : 0.15,
      shadowRadius: 3,
      elevation: 1,
    },
    empty: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 19 },
    update: { gap: 6, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e8eaed' },
    updateLast: { paddingBottom: 0, borderBottomWidth: 0 },
    when: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    text: { fontSize: 14, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 21 },
    // Material extended FAB: a pill with a plus and a label, floating over the job card at its bottom right.
    more: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8', paddingTop: 8 },
    fab: {
      position: 'absolute',
      right: 16,
      bottom: 16,
      zIndex: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 56,
      paddingHorizontal: 20,
      borderRadius: 16,
      backgroundColor: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8',
      shadowColor: '#3c4043',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    fabPlus: { fontSize: 22, lineHeight: 24, fontWeight: '700', color: getThemeMode() === 'dark' ? '#0b1b3a' : '#ffffff' },
    fabLabel: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#0b1b3a' : '#ffffff' },
    input: {
      minHeight: 96,
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: outline(),
      color: Colors.textMain,
      fontSize: 14,
      fontFamily: FONTS.bodyRegular,
      textAlignVertical: 'top',
    },
  })
);
