import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, PhotoStrip, themedStyles, VoiceNotePlayer, type VoiceNote } from '@ongarage/shared';
import { SAMPLE_UPLOAD_PHOTOS } from '../constants/mockData';

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
      <PhotoStrip
        photos={photos}
        height={84}
        onAdd={photos.length < MAX_PHOTOS ? () => onPhotos([...photos, SAMPLE_UPLOAD_PHOTOS[photos.length % SAMPLE_UPLOAD_PHOTOS.length]]) : undefined}
        addLabel="ඡායාරූපයක්"
      />
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
      <Pressable
        style={({ pressed }) => [styles.record, recording && styles.recording, pressed && { opacity: 0.8 }]}
        onPress={() => (recording ? stop(seconds) : start())}
        accessibilityLabel={recording ? 'Stop recording' : 'Record voice note'}
      >
        <Text style={[styles.recordText, recording && { color: '#fff' }]}>
          {recording ? `⏹ නවත්වන්න · 0:${String(seconds).padStart(2, '0')} / 0:${MAX_VOICE_SEC}` : `🎙️ හඬ සටහනක් පටිගත කරන්න (තත්. ${MAX_VOICE_SEC} දක්වා)`}
        </Text>
      </Pressable>
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
    record: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.45)', backgroundColor: 'rgba(239, 68, 68, 0.08)', alignItems: 'center' },
    recording: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
    recordText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
  })
);
