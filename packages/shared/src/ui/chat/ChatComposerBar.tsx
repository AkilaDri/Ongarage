import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { Icon } from '../Icons';

const ICON_GREY = () => (getThemeMode() === 'dark' ? '#aab4c0' : '#54606e');
const BLUE = () => (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8');
/** The colour of what sits on the blue (the icons on a filled blue disc, the recording bar's marks). */
const ON_BLUE = () => (getThemeMode() === 'dark' ? '#0b1b3a' : '#ffffff');

export type ComposerMore = { key: string; icon: string; label: string; run: () => void };

/** A row of vertical bars drawn as the sound level of the recording (the last 38 samples; small ones are dots). */
const Waveform: React.FC<{ peaks: number[]; live: boolean }> = ({ peaks, live }) => (
  <View style={styles.wave} accessibilityLabel={live ? 'Recording' : 'Paused'}>
    {peaks.slice(-38).map((p, i) => (
      <View key={i} style={[styles.waveBar, { height: p < 0.12 ? 3 : 6 + p * 20, width: p < 0.12 ? 3 : 2.5, borderRadius: p < 0.12 ? 2 : 1.5 }]} />
    ))}
  </View>
);

/**
 * The typing bar of every chat, in the style of Instagram's: one rounded field with the camera on its left (a filled round button) and, on its right, the voice note, the pictures and
 * "more". Once there is text those give way to Send. While a voice note is recorded the whole field turns into a recording bar (stop, sound wave, time) with the bin and Send under it.
 */
export const ChatComposerBar: React.FC<{
  text: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  onFocus: () => void;
  onBlur: () => void;
  /** Send the text (or save an edit, when `editing`). */
  onSendText: () => void;
  editing: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onMic: () => void;
  /** The "more" menu is open (the caller draws it above the bar). */
  moreOpen: boolean;
  onMore?: () => void;
  recSec: number | null;
  recPaused: boolean;
  onRecPause: () => void;
  onRecCancel: () => void;
  onRecSend: () => void;
}> = ({ text, onChangeText, placeholder, onFocus, onBlur, onSendText, editing, onCamera, onGallery, onMic, moreOpen, onMore, recSec, recPaused, onRecPause, onRecCancel, onRecSend }) => {
  const [peaks, setPeaks] = useState<number[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // While recording, the wave grows (the level is simulated until the microphone is read).
  useEffect(() => {
    if (recSec === null) {
      setPeaks([]);
      return;
    }
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      if (!recPaused) setPeaks((p) => [...p.slice(-60), Math.random() < 0.35 ? 0.05 : 0.25 + Math.random() * 0.75]);
    }, 110);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [recSec === null, recPaused]);

  // The send button springs in when there is text.
  const pop = useRef(new Animated.Value(0)).current;
  const hasText = !!text.trim();
  useEffect(() => {
    Animated.timing(pop, { toValue: hasText ? 1 : 0, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [hasText, pop]);

  if (recSec !== null) {
    const time = `${String(Math.floor(recSec / 60)).padStart(2, '0')}:${String(recSec % 60).padStart(2, '0')}`;
    return (
      <View style={styles.recWrap}>
        <View style={styles.recBar}>
          <Pressable style={styles.recStop} onPress={onRecPause} accessibilityLabel={recPaused ? 'Continue recording' : 'Pause recording'}>
            {recPaused ? <Text style={styles.recPlay}>●</Text> : <View style={styles.recSquare} />}
          </Pressable>
          <Waveform peaks={peaks} live={!recPaused} />
          <Text style={styles.recTime}>{time}</Text>
        </View>
        <View style={styles.recActions}>
          <Pressable style={styles.recBin} onPress={onRecCancel} accessibilityLabel="Cancel voice note" hitSlop={8}>
            <Icon name="trash" size={22} color={Colors.textMuted} />
          </Pressable>
          <Text style={styles.recHint}>{recPaused ? 'විරාමයි — ආයෙත් පටිගත කිරීමට ඔබන්න' : 'පටිගත කරමින්…'}</Text>
          <Pressable style={styles.recSend} onPress={onRecSend} accessibilityLabel="Send voice note">
            <Icon name="send" size={20} color={ON_BLUE()} />
          </Pressable>
        </View>
      </View>
    );
  }

  // The bar: one white pill (the field, with attach and camera inside its right end) and, outside it, the green round voice-note / send button.
  return (
    <View style={styles.row} accessibilityLabel="Message bar">
      <View style={styles.pill}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={getThemeMode() === 'dark' ? Colors.textMuted : '#7a8296'}
          onFocus={onFocus}
          onBlur={onBlur}
          accessibilityLabel="Chat message"
          multiline
          // Up to five lines, then it scrolls. On a computer Enter sends (Shift+Enter makes a new line).
          onKeyPress={(e) => {
            const ne = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
            if (Platform.OS === 'web' && ne.key === 'Enter' && !ne.shiftKey) {
              (e as unknown as { preventDefault?: () => void }).preventDefault?.();
              if (hasText) onSendText();
            }
          }}
        />
        <Pressable style={styles.inBtn} onPress={onMore ?? onGallery} accessibilityLabel="Attach" hitSlop={4}>
          <Icon name="paperclip" size={24} color={ICON_GREY()} strokeWidth={1.8} />
        </Pressable>
        {!hasText && (
          <Pressable style={styles.inBtn} onPress={onCamera} accessibilityLabel="Take a photo" hitSlop={4}>
            <Icon name="camera" size={24} color={ICON_GREY()} strokeWidth={1.8} />
          </Pressable>
        )}
      </View>
      {hasText ? (
        <Animated.View style={{ transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }}>
          <Pressable style={styles.greenBtn} onPress={onSendText} accessibilityLabel={editing ? 'Save edited message' : 'Send message'}>
            <Icon name="send" size={22} color="#ffffff" strokeWidth={1.8} />
          </Pressable>
        </Animated.View>
      ) : (
        <Pressable style={styles.greenBtn} onPress={onMic} accessibilityLabel="Record voice note">
          <Icon name="mic" size={24} color="#ffffff" strokeWidth={1.8} />
        </Pressable>
      )}
    </View>
  );
};

/** The small card that opens above the bar from the "more" button. */
export const ComposerMoreMenu: React.FC<{ items: ComposerMore[]; onPick: (i: ComposerMore) => void }> = ({ items, onPick }) => (
  <View style={styles.menu} accessibilityLabel="More attachments menu">
    {items.map((i, n) => (
      <Pressable key={i.key} style={[styles.menuItem, n > 0 && styles.menuItemLine]} onPress={() => onPick(i)} accessibilityLabel={i.label}>
        <Text style={styles.menuIcon}>{i.icon}</Text>
        <Text style={styles.menuText}>{i.label}</Text>
      </Pressable>
    ))}
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 50, borderRadius: 26, paddingHorizontal: 6, backgroundColor: getThemeMode() === 'dark' ? '#303134' : '#ffffff' },
    input: { flex: 1, minHeight: 40, maxHeight: 112, paddingHorizontal: 8, paddingVertical: 8, color: getThemeMode() === 'dark' ? Colors.textMain : '#111111', fontSize: 16, lineHeight: 22, fontFamily: FONTS.bodyRegular, ...({ outlineStyle: 'none' } as object) },
    inBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    greenBtn: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: '#25b866' },

    recWrap: { gap: 10 },
    recBar: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderRadius: 28, paddingLeft: 8, paddingRight: 14, backgroundColor: BLUE() },
    recStop: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.25)' },
    recSquare: { width: 14, height: 14, borderRadius: 3, backgroundColor: ON_BLUE() },
    recPlay: { fontSize: 14, color: ON_BLUE() },
    wave: { flex: 1, height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2.5, overflow: 'hidden' },
    waveBar: { backgroundColor: ON_BLUE(), opacity: 0.95 },
    recTime: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: ON_BLUE(), minWidth: 42, textAlign: 'right' },
    recActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
    recBin: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
    recHint: { flex: 1, textAlign: 'center', fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    recSend: { width: 64, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: BLUE() },

    menu: { alignSelf: 'flex-end', minWidth: 210, borderRadius: 16, backgroundColor: getThemeMode() === 'dark' ? '#202124' : '#ffffff', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', shadowColor: '#3c4043', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 8, overflow: 'hidden' },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, minHeight: 52 },
    menuItemLine: { borderTopWidth: 1, borderTopColor: getThemeMode() === 'dark' ? Colors.borderColor : '#f1f3f4' },
    menuIcon: { fontSize: 20 },
    menuText: { fontSize: 15, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
  })
);
