import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, PanResponder, Pressable, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { getThemeMode } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { flattenPhoto, rotatePhoto, type PhotoEdit } from '../../utils/photos';

const COLORS = ['#ffffff', '#ea4335', '#fbbc04', '#34a853', '#1a73e8', '#000000'];
const WIDTHS = [4, 8, 14];

type Pt = { x: number; y: number };
type Stroke = { color: string; width: number; points: Pt[] };
type TextItem = { id: number; text: string; color: string; x: number; y: number; size: number };

/** A text laid over the picture that can be dragged with a finger. */
const DragText: React.FC<{ item: TextItem; onMove: (id: number, x: number, y: number) => void; active: boolean }> = ({ item, onMove, active }) => {
  const start = useRef({ x: item.x, y: item.y });
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          start.current = { x: item.x, y: item.y };
        },
        onPanResponderMove: (_, g) => onMove(item.id, start.current.x + g.dx, start.current.y + g.dy),
      }),
    [item.id, item.x, item.y, onMove]
  );
  return (
    <View style={{ position: 'absolute', left: item.x, top: item.y }} {...(active ? pan.panHandlers : {})}>
      <Text style={{ fontSize: item.size, color: item.color, fontFamily: FONTS.bodyBold, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 3 }}>{item.text}</Text>
    </View>
  );
};

/**
 * Edits a picture before it is sent, like WhatsApp: draw on it with a finger (colour and thickness, undo), write text on it (and drag the text where it should be), turn it a
 * quarter. "Done" flattens everything into a new picture. (Editing is available in the browser build; the phone build sends the picture as chosen.)
 */
export const PhotoEditor: React.FC<{ uri: string | null; onDone: (uri: string) => void; onClose: () => void }> = ({ uri, onDone, onClose }) => {
  const [base, setBase] = useState<string | null>(uri);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [mode, setMode] = useState<'draw' | 'text'>('draw');
  const [color, setColor] = useState(COLORS[1]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [draft, setDraft] = useState('');
  const cur = useRef<Stroke | null>(null);
  const [, bump] = useState(0);
  const live = useRef({ mode, color, width });
  live.current = { mode, color, width };

  useEffect(() => {
    if (!uri) return;
    setBase(uri);
    setStrokes([]);
    setTexts([]);
    setDraft('');
    setMode('draw');
    Image.getSize(uri, (w, h) => setNatural({ w, h }), () => setNatural({ w: 1080, h: 1080 }));
  }, [uri]);

  // The picture is shown as large as the space allows, with its own shape; everything drawn is kept in those coordinates.
  const shown = useMemo(() => {
    if (!natural || !box.w || !box.h) return { w: 0, h: 0 };
    const k = Math.min(box.w / natural.w, box.h / natural.h);
    return { w: natural.w * k, h: natural.h * k };
  }, [natural, box]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => live.current.mode === 'draw',
        onMoveShouldSetPanResponder: () => live.current.mode === 'draw',
        onPanResponderGrant: (e) => {
          cur.current = { color: live.current.color, width: live.current.width, points: [{ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }] };
          bump((n) => n + 1);
        },
        onPanResponderMove: (e) => {
          cur.current?.points.push({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
          bump((n) => n + 1);
        },
        onPanResponderRelease: () => {
          const s = cur.current;
          cur.current = null;
          if (s && s.points.length > 1) setStrokes((list) => [...list, s]);
          else bump((n) => n + 1);
        },
      }),
    []
  );

  if (!uri || !base) return null;
  const path = (s: Stroke) => s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const untouched = strokes.length === 0 && texts.length === 0;
  const undo = () => {
    if (texts.length && (!strokes.length || mode === 'text')) setTexts((t) => t.slice(0, -1));
    else setStrokes((s) => s.slice(0, -1));
  };
  const addText = () => {
    const t = draft.trim();
    if (!t) return;
    setTexts((list) => [...list, { id: Date.now(), text: t, color, x: Math.max(8, shown.w / 2 - t.length * 7), y: shown.h / 2 - 16, size: 28 }]);
    setDraft('');
  };
  const done = async () => {
    const edit: PhotoEdit = { strokes, texts: texts.map((t) => ({ text: t.text, color: t.color, x: t.x, y: t.y, size: t.size })) };
    onDone(untouched ? base : await flattenPhoto(base, edit, shown));
  };
  const rotate = async () => {
    if (!untouched) return;
    const r = await rotatePhoto(base);
    setBase(r);
    Image.getSize(r, (w, h) => setNatural({ w, h }), () => undefined);
  };
  const ink = getThemeMode() === 'dark' ? '#0b1b3a' : '#ffffff';

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.top}>
          <Pressable style={styles.tbtn} onPress={onClose} accessibilityLabel="Close editor"><Text style={styles.tglyph}>✕</Text></Pressable>
          <View style={styles.topRight}>
            <Pressable style={[styles.tbtn, untouched && styles.off]} onPress={rotate} disabled={!untouched} accessibilityLabel="Rotate"><Text style={styles.tglyph}>⟳</Text></Pressable>
            <Pressable style={[styles.tbtn, untouched && styles.off]} onPress={undo} disabled={untouched} accessibilityLabel="Undo"><Text style={styles.tglyph}>↶</Text></Pressable>
          </View>
        </View>

        <View style={styles.stage} onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {shown.w > 0 && (
            <View style={{ width: shown.w, height: shown.h }}>
              <Image source={{ uri: base }} style={{ width: shown.w, height: shown.h }} resizeMode="contain" />
              <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
                <Svg width={shown.w} height={shown.h}>
                  {[...strokes, ...(cur.current ? [cur.current] : [])].map((s, i) => (
                    <Path key={i} d={path(s)} stroke={s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  ))}
                </Svg>
              </View>
              {texts.map((t) => (
                <DragText key={t.id} item={t} active={mode === 'text'} onMove={(id, x, y) => setTexts((list) => list.map((q) => (q.id === id ? { ...q, x, y } : q)))} />
              ))}
            </View>
          )}
        </View>

        {mode === 'text' && (
          <View style={styles.textBar}>
            <TextInput style={styles.textInput} value={draft} onChangeText={setDraft} placeholder="ලියන්න…" placeholderTextColor="#9aa0a6" onSubmitEditing={addText} accessibilityLabel="Text on the picture" />
            <Pressable style={styles.addBtn} onPress={addText} accessibilityLabel="Add the text"><Text style={styles.addText}>එක් කරන්න</Text></Pressable>
          </View>
        )}

        <View style={styles.tools}>
          <View style={styles.modes}>
            <Pressable style={[styles.mode, mode === 'draw' && styles.modeOn]} onPress={() => setMode('draw')} accessibilityLabel="Draw"><Text style={styles.modeText}>✏️ ඇඳීම</Text></Pressable>
            <Pressable style={[styles.mode, mode === 'text' && styles.modeOn]} onPress={() => setMode('text')} accessibilityLabel="Text"><Text style={styles.modeText}>Aa ලිවීම</Text></Pressable>
          </View>
          <View style={styles.colors}>
            {COLORS.map((c) => (
              <Pressable key={c} style={[styles.dot, { backgroundColor: c }, color === c && styles.dotOn]} onPress={() => setColor(c)} accessibilityLabel={`Colour ${c}`} />
            ))}
            {mode === 'draw' && WIDTHS.map((w) => (
              <Pressable key={w} style={[styles.wbtn, width === w && styles.modeOn]} onPress={() => setWidth(w)} accessibilityLabel={`Thickness ${w}`}>
                <View style={{ width: w + 4, height: w + 4, borderRadius: (w + 4) / 2, backgroundColor: '#ffffff' }} />
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.done} onPress={() => void done()} accessibilityLabel="Done editing"><Text style={[styles.doneText, { color: ink }]}>✓ අවසන්</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 14, paddingBottom: 6 },
  topRight: { flexDirection: 'row', gap: 6 },
  tbtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  tglyph: { fontSize: 20, color: '#ffffff' },
  off: { opacity: 0.35 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  textBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  textInput: { flex: 1, height: 44, borderRadius: 22, paddingHorizontal: 16, color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.16)', fontSize: 15, fontFamily: FONTS.bodyRegular, ...({ outlineStyle: 'none' } as object) },
  addBtn: { paddingHorizontal: 16, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8' },
  addText: { color: '#ffffff', fontSize: 13.5, fontFamily: FONTS.bodySemiBold },
  tools: { gap: 10, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 18 },
  modes: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  mode: { paddingHorizontal: 16, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  modeOn: { backgroundColor: 'rgba(26,115,232,0.9)' },
  modeText: { color: '#ffffff', fontSize: 13.5, fontFamily: FONTS.bodySemiBold },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', alignItems: 'center' },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  dotOn: { borderColor: '#ffffff', transform: [{ scale: 1.2 }] },
  wbtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  done: { alignSelf: 'center', paddingHorizontal: 28, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  doneText: { fontSize: 14.5, fontFamily: FONTS.bodyBold },
});
