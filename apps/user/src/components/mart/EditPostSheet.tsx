import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { ActionButton, Colors, FONTS, getAi, SUGGEST_MIN_CONFIDENCE, themedStyles, type VoiceNote } from '@ongarage/shared';
import { useMart, type MartEnquiry } from '../../context/MartContext';
import { MediaAttachments } from '../MediaAttachments';
import { Sheet } from '../Sheet';

/**
 * Edit one's own request (a post on the open wall, or any open request): add to the description or change it, add photos or a voice note. What is written is checked like a new post
 * (no phone numbers or off-app payments, nothing unfit), and the shops see the changes on the request.
 */
export const EditPostSheet: React.FC<{ item: MartEnquiry | null; onClose: () => void }> = ({ item, onClose }) => {
  const { editEnquiry } = useMart();
  const [shown, setShown] = useState<MartEnquiry | null>(item);
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!item) return;
    const b = item.enquiry.briefs[0];
    setShown(item);
    setNote(b?.note ?? '');
    setPhotos(b?.photos ?? []);
    setVoiceNotes(b?.voiceNotes ?? []);
    setError(null);
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.enquiry.id]);

  if (!shown) return null;
  const b = shown.enquiry.briefs[0];

  const save = async () => {
    if (busy) return;
    setBusy(true);
    const text = note.trim();
    if (text) {
      const [off, mod] = await Promise.all([getAi().checkOffPlatform(text), getAi().moderate(text)]);
      if (off.confidence >= SUGGEST_MIN_CONFIDENCE && off.value.flagged) {
        setError('දුරකථන අංක, ගෙවීම් හෝ වෙනත් යෙදුම් පණිවිඩ එක් නොකරන්න — OnMart තුළම වෙළඳසැල් සමඟ සම්බන්ධ වන්න.');
        setBusy(false);
        return;
      }
      if (mod.confidence >= SUGGEST_MIN_CONFIDENCE && !mod.value.ok) {
        setError('විස්තරයේ වචන අනුමත නොවේ — කොටස පමණක් සරලව විස්තර කරන්න.');
        setBusy(false);
        return;
      }
    }
    editEnquiry(shown.enquiry.id, { note: text || undefined, photos, voiceNotes });
    onClose();
  };

  return (
    <Sheet
      visible={!!item}
      title="පෝස්ට් එක සංස්කරණය"
      subtitle={`${b?.name ?? ''}${b?.vehicle ? ` · ${b.vehicle.name} ${b.vehicle.plate}` : ''}`}
      onClose={onClose}
      footer={<ActionButton label={busy ? 'සුරකිමින්…' : 'සුරකින්න'} icon="✓" variant="primary" disabled={busy} onPress={save} />}
    >
      <Text style={styles.label}>විස්තරය</Text>
      <TextInput
        style={styles.input}
        multiline
        value={note}
        onChangeText={(t) => {
          setNote(t);
          setError(null);
        }}
        placeholder="මාදිලිය, වර්ෂය, කොටස් අංකය, තත්ත්වය වැනි අමතර විස්තර…"
        placeholderTextColor={Colors.textMuted}
        maxLength={300}
        accessibilityLabel="Post description"
      />
      <Text style={styles.label}>ඡායාරූප සහ හඬ පණිවිඩ</Text>
      <MediaAttachments photos={photos} voiceNotes={voiceNotes} onPhotos={setPhotos} onVoiceNotes={setVoiceNotes} />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    label: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 6 },
    input: { minHeight: 96, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard, color: Colors.textMain, fontSize: 14, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top' },
    error: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.errorText, lineHeight: 18 },
  })
);
