import React, { useEffect, useRef, useState } from 'react';
import { pickPhotos } from '@ongarage/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FlowButton } from './FlowButton';
import { Colors, FONTS, PhotoStrip, themedStyles, VoiceNotePlayer, type VoiceNote } from '@ongarage/shared';

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
}> = ({ photos, voiceNotes, onPhotos, onVoiceNotes, hint = true }) => {
  const [recording, setRecording] = useState(false);
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
        <View style={styles.flex1}>
          <FlowButton
            label="ඡායාරූපයක්"
            icon="📷"
            variant="primary"
            disabled={photos.length >= MAX_PHOTOS}
            onPress={() => void pickPhotos(MAX_PHOTOS - photos.length).then((ph) => ph.length && onPhotos([...photos, ...ph]))}
          />
        </View>
        <View style={styles.flex1}>
          <FlowButton
            label={recording ? `⏹ 0:${String(seconds).padStart(2, '0')} / 0:${MAX_VOICE_SEC}` : 'හඬ සටහනක්'}
            icon={recording ? undefined : '🎙️'}
            variant={recording ? 'record' : 'primary'}
            onPress={() => (recording ? stop(seconds) : start())}
          />
        </View>
      </View>
      {hint && <Text style={styles.hint}>{`ඡායාරූප විකල්පයි · හඬ සටහන තත්පර ${MAX_VOICE_SEC} දක්වා`}</Text>}

      <PhotoStrip photos={photos} height={72} />
      {photos.length > 0 && (
        <Pressable onPress={() => onPhotos(photos.slice(0, -1))} hitSlop={6}>
          <Text style={styles.remove}>අවසන් ඡායාරූපය ඉවත් කරන්න</Text>
        </Pressable>
      )}

      {voiceNotes.map((n, i) => (
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
    remove: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    removeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.subtleFill, borderWidth: 1, borderColor: Colors.borderColor, justifyContent: 'center', alignItems: 'center' },
    removeText: { fontSize: 11, color: Colors.textMuted },
    btnRow: { flexDirection: 'row', gap: 10 },
    hint: { fontSize: 12.5, lineHeight: 18, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
  })
);
