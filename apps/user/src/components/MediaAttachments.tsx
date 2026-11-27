import React, { useEffect, useRef, useState } from 'react';
import { pickPhotos } from '@ongarage/shared';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlowButton } from './FlowButton';
import { Colors, FONTS, themedStyles, VoiceNotePlayer, type VoiceNote } from '@ongarage/shared';

const MAX_PHOTOS = 6;
const MAX_VOICE_SEC = 30;

/**
 * Photos and voice notes an owner attaches to a job or booking. Camera, gallery and
 * microphone access come with the native build; until then "add" uses sample photos
 * and recording is timed but silent, so the garage side can show real attachments.
 */
export const MediaAttachments: React.FC<{
  photos: string[];
  voiceNotes: VoiceNote[];
  onPhotos: (p: string[]) => void;
  onVoiceNotes: (v: VoiceNote[]) => void;
  /** The one-line note under the buttons (on by default; a form that explains it elsewhere turns it off). */
  hint?: boolean;
  /** One of the two buttons only, for a form that keeps them apart. */
  only?: 'photo' | 'voice';
}> = ({ photos, voiceNotes, onPhotos, onVoiceNotes, hint = true, only }) => {
  const [recording, setRecording] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const stop = (sec: number) => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRecording(false);
    if (sec >= 1) onVoiceNotes([...voiceNotes, { id: `vn-${Date.now()}`, durationSec: sec }]);
  };

  const start = () => {
    setSeconds(0);
    setRecording(true);
    let s = 0;
    timer.current = setInterval(() => {
      s += 1;
      setSeconds(s);
      if (s >= MAX_VOICE_SEC) stop(s);
    }, 1000);
  };

  return (
    <View style={styles.wrap}>
      {/* Two equal buttons, the same as the flows' footers: a photo or a voice note (either one is enough to describe the problem). */}
      <View style={styles.btnRow}>
        {only !== 'voice' && <View style={styles.flex1}>
          <FlowButton
            label="ඡායාරූපයක්"
            icon="📷"
            variant="primary"
            disabled={photos.length >= MAX_PHOTOS}
            onPress={() => void pickPhotos(MAX_PHOTOS - photos.length).then((ph) => ph.length && onPhotos([...photos, ...ph]))}
          />
        </View>}
        {only !== 'photo' && <View style={styles.flex1}>
          <FlowButton
            label={recording ? `⏹ 0:${String(seconds).padStart(2, '0')} / 0:${MAX_VOICE_SEC}` : 'හඬ සටහනක්'}
            icon={recording ? undefined : '🎙️'}
            variant={recording ? 'record' : 'primary'}
            onPress={() => (recording ? stop(seconds) : start())}
          />
        </View>}
      </View>
      {hint && <Text style={styles.hint}>{`ඡායාරූප විකල්පයි · හඬ සටහන තත්පර ${MAX_VOICE_SEC} දක්වා`}</Text>}

      {/* Each photo carries its own ✕ (remove that one), and tapping the photo opens it larger. */}
      {only !== 'voice' && photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
          {photos.map((uri, i) => (
            <View key={uri + i} style={styles.thumbWrap}>
              <Pressable onPress={() => setOpen(i)} accessibilityLabel={`Photo ${i + 1}, open`}>
                <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
              </Pressable>
              <Pressable style={styles.thumbX} onPress={() => onPhotos(photos.filter((_, k) => k !== i))} hitSlop={8} accessibilityLabel={`Remove photo ${i + 1}`}>
                <Text style={styles.thumbXText}>✕</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={styles.lightbox} onPress={() => setOpen(null)} accessibilityLabel="Close photo">
          {open !== null && !!photos[open] && <Image source={{ uri: photos[open] }} style={styles.full} resizeMode="contain" />}
        </Pressable>
      </Modal>

      {only !== 'photo' && voiceNotes.map((n, i) => (
        <View key={n.id} style={styles.voiceRow}>
          <View style={styles.flex1}>
            <VoiceNotePlayer note={n} index={i} />
          </View>
          <Pressable style={styles.removeBtn} onPress={() => onVoiceNotes(voiceNotes.filter((x) => x.id !== n.id))} accessibilityLabel={`Remove voice note ${i + 1}`}>
            <Text style={styles.removeText}>✕</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    wrap: { gap: 10 },
    thumbs: { gap: 10, paddingTop: 8, paddingRight: 8 },
    thumbWrap: { width: 88, height: 72 },
    thumb: { width: 88, height: 72, borderRadius: 14, backgroundColor: Colors.subtleFill },
    thumbX: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e3a8a', borderWidth: 2, borderColor: '#ffffff' },
    thumbXText: { fontSize: 11, lineHeight: 14, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    lightbox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.9)' },
    full: { width: '100%', height: '80%' },
    voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    removeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.subtleFill, borderWidth: 1, borderColor: Colors.borderColor, justifyContent: 'center', alignItems: 'center' },
    removeText: { fontSize: 11, color: Colors.textMuted },
    btnRow: { flexDirection: 'row', gap: 10 },
    hint: { fontSize: 12.5, lineHeight: 18, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
  })
);
