import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import type { VoiceNote } from '../types';

const BARS = 28;

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

// A stable waveform per note, so it doesn't jump between renders.
const waveform = (id: string) => {
  let seed = [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return Array.from({ length: BARS }, () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return 0.25 + ((seed >>> 16) % 1000) / 1333;
  });
};

/**
 * Plays an owner's voice note. Until recording exists in the owner app (no uri),
 * playback is simulated over the note's real duration.
 */
export const VoiceNotePlayer: React.FC<{ note: VoiceNote; index: number }> = ({ note, index }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const at = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const bars = useMemo(() => waveform(note.id), [note.id]);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      at.current = value;
      setElapsed(value * note.durationSec);
    });
    return () => progress.removeListener(id);
  }, [progress, note.durationSec]);

  useEffect(() => () => progress.stopAnimation(), [progress]);

  const toggle = () => {
    if (playing) {
      progress.stopAnimation();
      setPlaying(false);
      return;
    }
    const from = at.current >= 1 ? 0 : at.current;
    progress.setValue(from);
    setPlaying(true);
    Animated.timing(progress, { toValue: 1, duration: (1 - from) * note.durationSec * 1000, easing: Easing.linear, useNativeDriver: false }).start(({ finished }) => {
      if (finished) setPlaying(false);
    });
  };

  return (
    <View style={styles.wrap}>
      <Pressable style={({ pressed }) => [styles.play, pressed && { opacity: 0.8 }]} onPress={toggle} accessibilityLabel={playing ? 'Pause voice note' : 'Play voice note'}>
        <Text style={styles.playIcon}>{playing ? '❚❚' : '▶'}</Text>
      </Pressable>
      <View style={styles.flex1}>
        <View style={styles.wave} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {bars.map((h, i) => (
            <View key={i} style={[styles.bar, { height: 26 * h }]} />
          ))}
          {/* The played part, revealed left to right over the same bars. */}
          <Animated.View
            style={[styles.playedClip, { width: progress.interpolate({ inputRange: [0, 1], outputRange: [0, width] }) }]}
            pointerEvents="none"
          >
            <View style={[styles.waveInner, { width }]}>
              {bars.map((h, i) => (
                <View key={i} style={[styles.bar, styles.barPlayed, { height: 26 * h }]} />
              ))}
            </View>
          </Animated.View>
        </View>
        <View style={styles.meta}>
          <Text style={styles.metaText}>හඬ සටහන {index + 1}</Text>
          <Text style={styles.metaText}>{playing || elapsed > 0 ? `${clock(elapsed)} / ${clock(note.durationSec)}` : clock(note.durationSec)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    wrap: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    play: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
    playIcon: { fontSize: 13, fontWeight: '900', color: '#fff' },
    wave: { height: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    waveInner: { height: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    playedClip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
    bar: { width: 3, borderRadius: 2, backgroundColor: Colors.subtleBorder },
    barPlayed: { backgroundColor: Colors.primary },
    meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    metaText: { fontSize: 10, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
  })
);
