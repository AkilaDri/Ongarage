import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import type { VoiceNote } from '../types';
import { VoiceNotePlayer } from './VoiceNotePlayer';

const MAX_SEC = 60;

/**
 * Records voice notes: tap to start, tap to stop (up to a minute each). Each note is listed with a player and a remove button.
 * Until the microphone is wired in the native build the recording is timed but silent, like the owner's attachments.
 */
export const VoiceNoteField: React.FC<{ notes: VoiceNote[]; onChange: (notes: VoiceNote[]) => void; max?: number; label?: string }> = ({ notes, onChange, max = 3, label = '🎙️ හඬ සටහනක් පටිගත කරන්න' }) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const stop = (sec: number) => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRecording(false);
    if (sec >= 1) onChange([...notes, { id: `vn-${Date.now()}`, durationSec: sec }]);
  };
  const start = () => {
    setSeconds(0);
    setRecording(true);
    let s = 0;
    timer.current = setInterval(() => {
      s += 1;
      setSeconds(s);
      if (s >= MAX_SEC) stop(s);
    }, 1000);
  };

  return (
    <View style={styles.wrap}>
      {notes.map((n, i) => (
        <View key={n.id} style={styles.row}>
          <View style={styles.flex1}>
            <VoiceNotePlayer note={n} index={i} />
          </View>
          <Pressable style={styles.remove} onPress={() => onChange(notes.filter((x) => x.id !== n.id))} accessibilityLabel={`Remove voice note ${i + 1}`}>
            <Text style={styles.removeText}>✕</Text>
          </Pressable>
        </View>
      ))}
      {(recording || notes.length < max) && (
        <Pressable style={({ pressed }) => [styles.record, recording && styles.recording, pressed && { opacity: 0.8 }]} onPress={() => (recording ? stop(seconds) : start())} accessibilityLabel={recording ? 'Stop recording' : 'Record voice note'}>
          <Text style={[styles.recordText, recording && { color: '#fff' }]}>{recording ? `⏹ නවත්වන්න · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : label}</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { gap: 8 },
    flex1: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    remove: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.subtleFill, alignItems: 'center', justifyContent: 'center' },
    removeText: { fontSize: 12, color: Colors.textMuted },
    record: { paddingVertical: 11, borderRadius: 14, alignItems: 'center', backgroundColor: Colors.subtleFill, borderWidth: 1, borderColor: Colors.borderColor },
    recording: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
    recordText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
  })
);
