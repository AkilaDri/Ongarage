import React, { useEffect, useRef, useState } from 'react';
import { pickPhotos } from '@ongarage/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
}> = ({ photos, voiceNotes, onPhotos, onVoiceNotes }) => {
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
      {photos.length > 0 && <PhotoStrip photos={photos} height={84} />}
      {photos.length > 0 && (
        <Pressable onPress={() => onPhotos(photos.slice(0, -1))} hitSlop={6}>
          <Text style={styles.remove}>අවසන් ඡායාරූපය ඉවත් කරන්න</Text>
        </Pressable>
      )}

      {/* The two attachments are equal tiles in one row: the owner sees them as one choice, both optional. */}
      <View style={styles.tileRow}>
        <Pressable
          style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }, photos.length >= MAX_PHOTOS && { opacity: 0.5 }]}
          onPress={() => void pickPhotos(MAX_PHOTOS - photos.length).then((ph) => ph.length && onPhotos([...photos, ...ph]))}
          disabled={photos.length >= MAX_PHOTOS}
          accessibilityLabel="Add photos"
        >
          <Text style={styles.tileIcon}>📷</Text>
          <Text style={styles.tileLabel}>ඡායාරූපයක්</Text>
          <Text style={styles.tileSub}>{photos.length ? `${photos.length}/${MAX_PHOTOS}` : 'විකල්පයි'}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.tile, recording && styles.tileRec, pressed && { opacity: 0.8 }]}
          onPress={() => (recording ? stop(seconds) : start())}
          accessibilityLabel={recording ? 'Stop recording' : 'Record voice note'}
        >
          <Text style={styles.tileIcon}>{recording ? '⏹' : '🎙️'}</Text>
          <Text style={[styles.tileLabel, recording && styles.tileTextRec]}>{recording ? `0:${String(seconds).padStart(2, '0')} / 0:${MAX_VOICE_SEC}` : 'හඬ සටහනක්'}</Text>
          <Text style={[styles.tileSub, recording && styles.tileTextRec]}>{recording ? 'නවත්වන්න' : `තත්පර ${MAX_VOICE_SEC} දක්වා`}</Text>
        </Pressable>
      </View>

      {/* A recorded note is a note: its own player row, with a remove control. */}
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
    wrap: { gap: 8 },
    remove: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    removeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.subtleFill, borderWidth: 1, borderColor: Colors.borderColor, justifyContent: 'center', alignItems: 'center' },
    removeText: { fontSize: 11, color: Colors.textMuted },
    tileRow: { flexDirection: 'row', gap: 10 },
    tile: { flex: 1, height: 88, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(29, 78, 216, 0.35)', backgroundColor: 'rgba(29, 78, 216, 0.06)', alignItems: 'center', justifyContent: 'center', gap: 2, padding: 8 },
    tileRec: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
    tileIcon: { fontSize: 20 },
    tileLabel: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#1d4ed8', textAlign: 'center' },
    tileSub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, textAlign: 'center' },
    tileTextRec: { color: '#ffffff' },
  })
);
