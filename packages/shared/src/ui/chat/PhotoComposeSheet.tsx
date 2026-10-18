import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getThemeMode } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { canEditPhotos, compressPhoto, pickPhotos } from '../../utils/photos';
import { Icon } from '../Icons';
import { PhotoEditor } from './PhotoEditor';

const BLUE = () => (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8');

/**
 * What happens after pictures are chosen, like WhatsApp: the chosen pictures big on a dark screen with a numbered strip under them (a "+" adds more, ✕ takes one out), an HD switch,
 * a pencil on the small picture to edit it (draw, text, turn), a caption, and Send with the count. Without HD the pictures are shrunk to about 1600 px before they go.
 */
export const PhotoComposeSheet: React.FC<{
  photos: string[] | null;
  /** Open the editor on the first picture at once (the "draw" action of the more menu). */
  startEditing?: boolean;
  onClose: () => void;
  onSend: (photos: string[], caption?: string) => void | Promise<void>;
}> = ({ photos, startEditing, onClose, onSend }) => {
  const [list, setList] = useState<string[]>([]);
  const [i, setI] = useState(0);
  const [caption, setCaption] = useState('');
  const [hd, setHd] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!photos) return;
    setList(photos);
    setI(0);
    setCaption('');
    setHd(false);
    setBusy(false);
    setEditing(!!startEditing && canEditPhotos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  if (!photos) return null;
  const cur = list[Math.min(i, list.length - 1)];

  const remove = (n: number) => {
    const next = list.filter((_, k) => k !== n);
    if (!next.length) return onClose();
    setList(next);
    setI(Math.max(0, Math.min(i, next.length - 1)));
  };
  const addMore = async () => {
    const more = await pickPhotos(Math.max(0, 10 - list.length), 'library');
    if (more.length) setList((l) => [...l, ...more].slice(0, 10));
  };
  const send = async () => {
    if (busy || !list.length) return;
    setBusy(true);
    const out = hd ? list : await Promise.all(list.map((u) => compressPhoto(u)));
    await onSend(out, caption.trim() || undefined);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.top}>
          <Pressable style={styles.round} onPress={onClose} accessibilityLabel="Close"><Text style={styles.glyph}>✕</Text></Pressable>
          <Text style={styles.title}>ඡායාරූප {list.length}</Text>
          <Pressable style={[styles.hd, hd && styles.hdOn]} onPress={() => setHd((v) => !v)} accessibilityLabel="HD quality" accessibilityState={{ selected: hd }}>
            <Text style={[styles.hdText, hd && styles.hdTextOn]}>HD</Text>
          </Pressable>
        </View>

        <View style={styles.stage}>{!!cur && <Image source={{ uri: cur }} style={styles.big} resizeMode="contain" />}</View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {list.map((u, n) => (
            <Pressable key={`${u}-${n}`} style={[styles.thumb, n === i && styles.thumbOn]} onPress={() => setI(n)} accessibilityLabel={`Picture ${n + 1}`}>
              <Image source={{ uri: u }} style={styles.thumbImg} />
              <View style={styles.badge}><Text style={styles.badgeText}>{n + 1}</Text></View>
              <Pressable style={styles.remove} onPress={() => remove(n)} hitSlop={6} accessibilityLabel={`Remove picture ${n + 1}`}><Text style={styles.removeText}>✕</Text></Pressable>
            </Pressable>
          ))}
          {list.length < 10 && (
            <Pressable style={styles.add} onPress={() => void addMore()} accessibilityLabel="Add more pictures"><Text style={styles.addText}>＋</Text></Pressable>
          )}
        </ScrollView>

        <View style={styles.bar}>
          {canEditPhotos && !!cur && (
            <Pressable style={styles.editThumb} onPress={() => setEditing(true)} accessibilityLabel="Edit this picture">
              <Image source={{ uri: cur }} style={styles.editImg} />
              <View style={styles.pencil}><Text style={styles.pencilText}>✎</Text></View>
            </Pressable>
          )}
          <TextInput
            style={styles.caption}
            value={caption}
            onChangeText={setCaption}
            placeholder="විස්තරයක් එක් කරන්න…"
            placeholderTextColor="#9aa0a6"
            accessibilityLabel="Caption"
            onSubmitEditing={() => void send()}
          />
          <Pressable style={[styles.send, busy && styles.sending]} onPress={() => void send()} disabled={busy} accessibilityLabel="Send pictures">
            <Icon name="send" size={22} color="#ffffff" />
            <View style={styles.count}><Text style={styles.countText}>{list.length}</Text></View>
          </Pressable>
        </View>

        <PhotoEditor
          uri={editing ? cur ?? null : null}
          onClose={() => setEditing(false)}
          onDone={(u) => {
            setList((l) => l.map((x, k) => (k === i ? u : x)));
            setEditing(false);
          }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0b0c' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 14, paddingBottom: 6 },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  glyph: { fontSize: 20, color: '#ffffff' },
  title: { fontSize: 16, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  hd: { minWidth: 48, height: 36, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  hdOn: { backgroundColor: '#ffffff' },
  hdText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  hdTextOn: { color: '#0b0b0c' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  big: { width: '100%', height: '100%' },
  strip: { gap: 8, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  thumb: { width: 58, height: 58, borderRadius: 8, overflow: 'visible', borderWidth: 2, borderColor: 'transparent' },
  thumbOn: { borderColor: '#ffffff' },
  thumbImg: { width: '100%', height: '100%', borderRadius: 6 },
  badge: { position: 'absolute', top: -6, left: -6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#25d366' },
  badgeText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  remove: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.75)' },
  removeText: { fontSize: 11, color: '#ffffff' },
  add: { width: 58, height: 58, borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 26, color: '#ffffff' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 18 },
  editThumb: { width: 50, height: 50, borderRadius: 10, overflow: 'hidden' },
  editImg: { width: '100%', height: '100%' },
  pencil: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.38)' },
  pencilText: { fontSize: 22, color: '#ffffff' },
  caption: { flex: 1, height: 48, borderRadius: 24, paddingHorizontal: 18, color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.14)', fontSize: 15, fontFamily: FONTS.bodyRegular, ...({ outlineStyle: 'none' } as object) },
  send: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? '#1a73e8' : '#1a73e8' },
  sending: { opacity: 0.5 },
  count: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  countText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: '#0b0b0c' },
});
void BLUE;
