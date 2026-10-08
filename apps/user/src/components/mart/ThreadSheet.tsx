import React, { useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, FONTS, formatTime, themedStyles, softEdge, softFill, type PartsQuickAsk, type PartsShop } from '@ongarage/shared';
import { useMart } from '../../context/MartContext';
import { SAMPLE_UPLOAD_PHOTOS } from '../../constants/mockData';
import { Sheet } from '../Sheet';

export type ThreadTarget = { enquiryId: string; shop: PartsShop };

const QUICK: { id: PartsQuickAsk; label: string }[] = [
  { id: 'available', label: 'තොගයේ තිබේද?' },
  { id: 'price', label: 'මිල කීයද?' },
  { id: 'fits', label: 'මගේ වාහනයට ගැළපේද?' },
  { id: 'holdIt', label: 'මට තබා ගන්න' },
  { id: 'delivery', label: 'ගෙදරටම එවන්න පුළුවන්ද?' },
  { id: 'photo', label: 'ඡායාරූපයක් එවන්න' },
];

/**
 * A conversation with one shop about one request: quick questions, a short message or a photo. A message that tries
 * to move the deal off the app (a phone number, paying elsewhere) is held back; there is always a call button.
 */
export const ThreadSheet: React.FC<{ target: ThreadTarget | null; onClose: () => void }> = ({ target, onClose }) => {
  const { threadFor, sendMessage } = useMart();
  const [shown, setShown] = useState<ThreadTarget | null>(target);
  const [text, setText] = useState('');
  const [blocked, setBlocked] = useState(false);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    if (!target) return;
    setShown(target);
    setText('');
    setBlocked(false);
  }, [target]);

  const thread = shown ? threadFor(shown.enquiryId, shown.shop.id) : undefined;
  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: true });
  }, [thread?.messages.length]);

  if (!shown) return null;
  const s = shown;

  const send = async (msg: { quick?: PartsQuickAsk; text?: string; photos?: string[] }) => {
    const ok = await sendMessage(s.enquiryId, s.shop.id, msg);
    setBlocked(!ok);
    if (ok) setText('');
  };
  const quickLabel = (q?: PartsQuickAsk) => QUICK.find((x) => x.id === q)?.label;

  return (
    <Sheet visible={!!target} title={s.shop.name} subtitle="කොටස ගැන වෙළඳසැලෙන් අසන්න" onClose={onClose}>
      <Pressable style={styles.call} onPress={() => Linking.openURL(`tel:${s.shop.phone.replace(/\s/g, '')}`)} accessibilityLabel={`Call ${s.shop.name}`}>
        <Text style={styles.callText}>📞 {s.shop.phone}</Text>
      </Pressable>

      <ScrollView ref={scroll} style={styles.list} contentContainerStyle={styles.listBody} nestedScrollEnabled>
        {!thread?.messages.length && <Text style={styles.sub}>පහත ඉක්මන් ප්‍රශ්නයක් තෝරන්න, නැත්නම් පණිවිඩයක් ලියන්න.</Text>}
        {thread?.messages.map((m) => (
          <View key={m.id} style={[styles.bubble, m.from === 'buyer' ? styles.mine : styles.theirs]}>
            {!!m.quick && !m.text && <Text style={[styles.msg, m.from === 'buyer' && styles.msgMine]}>{quickLabel(m.quick)}</Text>}
            {!!m.text && <Text style={[styles.msg, m.from === 'buyer' && styles.msgMine]}>{m.text}</Text>}
            {m.photos?.map((u) => (
              <Image key={u} source={{ uri: u }} style={styles.photo} />
            ))}
            <Text style={[styles.time, m.from === 'buyer' && styles.msgMine]}>{formatTime(m.at)}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.quick}>
        {QUICK.map((q) => (
          <Pressable key={q.id} style={styles.chip} onPress={() => send({ quick: q.id })} accessibilityLabel={`Ask ${q.id}`}>
            <Text style={styles.chipText}>{q.label}</Text>
          </Pressable>
        ))}
      </View>

      {blocked && <Text style={styles.error}>දුරකථන අංක, ගෙවීම් හෝ වෙනත් යෙදුම් පණිවිඩ යැවිය නොහැක — OnMart තුළම කතා කරන්න, නැත්නම් ඉහත අමතන්න බොත්තම භාවිත කරන්න.</Text>}
      <View style={styles.inputRow}>
        <Pressable style={styles.photoBtn} onPress={() => send({ photos: [SAMPLE_UPLOAD_PHOTOS[0]] })} accessibilityLabel="Send a photo">
          <Text style={styles.photoIcon}>📷</Text>
        </Pressable>
        <TextInput style={styles.input} value={text} onChangeText={(t) => { setText(t); setBlocked(false); }} placeholder="පණිවිඩයක් ලියන්න" placeholderTextColor={Colors.textMuted} accessibilityLabel="Message" />
        <Pressable style={[styles.send, !text.trim() && styles.sendOff]} disabled={!text.trim()} onPress={() => send({ text })} accessibilityLabel="Send message">
          <Text style={styles.sendText}>යවන්න</Text>
        </Pressable>
      </View>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    call: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: softFill() },
    callText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    list: { maxHeight: 280, borderRadius: 16, backgroundColor: softFill() },
    listBody: { padding: 12, gap: 8 },
    sub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    bubble: { maxWidth: '82%', padding: 10, borderRadius: 16, gap: 4 },
    mine: { alignSelf: 'flex-end', backgroundColor: Colors.primary },
    theirs: { alignSelf: 'flex-start', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge() },
    msg: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 18 },
    msgMine: { color: '#ffffff' },
    time: { fontSize: 9, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, alignSelf: 'flex-end' },
    photo: { width: 160, height: 110, borderRadius: 10 },
    quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 14, backgroundColor: 'rgba(2, 132, 199, 0.12)' },
    chipText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    error: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.errorText, lineHeight: 17 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    photoBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: softFill(), alignItems: 'center', justifyContent: 'center' },
    photoIcon: { fontSize: 17 },
    input: { flex: 1, height: 42, paddingHorizontal: 14, borderRadius: 21, backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge(), color: Colors.textMain, fontSize: 13, fontFamily: FONTS.bodyRegular },
    send: { paddingHorizontal: 14, height: 42, borderRadius: 21, backgroundColor: Colors.primary, justifyContent: 'center' },
    sendOff: { opacity: 0.4 },
    sendText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  })
);
