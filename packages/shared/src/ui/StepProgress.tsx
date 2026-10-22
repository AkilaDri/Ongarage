import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Colors, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';

/**
 * The step that is being worked on: a soft light keeps running along it from its start to its end (and the step's colour breathes a little),
 * as if the job were moving through the step. Read from the clock on every frame, so it never stalls and every running step moves in step.
 */
const RunningSeg: React.FC<{ style: object }> = ({ style }) => {
  const [width, setWidth] = useState(0);
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      t.setValue((Date.now() % 1600) / 1600);
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [t]);
  const light = Math.max(14, width * 0.45);
  return (
    <View style={[styles.seg, style, styles.runningClip]} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
      <Animated.View style={[styles.light, { width: light, transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-light, width] }) }] }]} />
    </View>
  );
};

/**
 * A segmented progress bar with the current step's name, matching the SOS dispatch
 * steppers. `current` is the index of the active step; `alert` paints it amber (e.g.
 * waiting for the owner, or a dispute).
 */
export const StepProgress: React.FC<{ steps: string[]; current: number; alert?: boolean; compact?: boolean }> = ({ steps, current, alert, compact }) => {
  const i = Math.max(0, Math.min(current, steps.length - 1));
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {steps.map((s, j) => (
          j === i ? <RunningSeg key={s} style={alert ? styles.alert : styles.active} /> : <View key={s} style={[styles.seg, j < i && styles.done]} />
        ))}
      </View>
      {!compact && (
        <Text style={styles.label}>
          පියවර {i + 1}/{steps.length} · <Text style={[styles.labelStrong, alert && { color: Colors.warning }]}>{steps[i]}</Text>
        </Text>
      )}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { gap: 6 },
    bar: { flexDirection: 'row', gap: 4 },
    seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },
    done: { backgroundColor: Colors.success },
    active: { backgroundColor: Colors.primary },
    alert: { backgroundColor: Colors.warning },
    runningClip: { overflow: 'hidden' },
    light: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.65)' },
    label: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    labelStrong: { fontFamily: FONTS.bodyBold, color: Colors.textMain },
  })
);
