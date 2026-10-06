import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, FONTS, themedStyles } from '@ongarage/shared';
import { useShop } from '../context/ShopContext';
import { Sheet } from './Sheet';
import { ago } from '../utils/format';
import type { ShopReview as Review } from '../types';

type Filter = 'all' | 'unanswered' | 'low';

// Starting points the owner can edit; a personal reply reads better than a stock one.
const TEMPLATES = ['ඔබගේ ප්‍රතිචාරයට ස්තූතියි! නැවතත් ඔබව පිළිගැනීමට සතුටුයි.', 'සිදු වූ අපහසුතාවයට සමාවෙන්න. අපි එය නිවැරදි කරගන්නම්.'];

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export const ReviewsSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { reviews, rating } = useShop();
  const [filter, setFilter] = useState<Filter>('all');
  const unanswered = reviews.filter((r) => !r.reply);
  const low = reviews.filter((r) => r.rating <= 3);
  const list = filter === 'unanswered' ? unanswered : filter === 'low' ? low : reviews;

  return (
    <Sheet visible={visible} title="සමාලෝචන" subtitle="ගරාජවලින් ලැබුණු සමාලෝචන · ඔබගේ පිළිතුරු සියලු ගරාජවලට පෙනේ" onClose={onClose}>
      <View style={styles.summary}>
        <Text style={styles.avg}>★ {rating.average}</Text>
        <View style={styles.flex1}>
          <Text style={styles.name}>සමාලෝචන {rating.count}</Text>
          <Text style={styles.sub}>{unanswered.length ? `පිළිතුරු නොදුන් ${unanswered.length}` : 'සියල්ලට පිළිතුරු දී ඇත ✓'}</Text>
        </View>
      </View>

      <View style={styles.chips}>
        {(
          [
            ['all', `සියල්ල (${reviews.length})`],
            ['unanswered', `පිළිතුරු නැති (${unanswered.length})`],
            ['low', `තරු 3 හෝ අඩු (${low.length})`],
          ] as [Filter, string][]
        ).map(([id, label]) => (
          <Pressable key={id} style={[styles.filter, filter === id && styles.filterActive]} onPress={() => setFilter(id)}>
            <Text style={[styles.filterText, filter === id && styles.filterTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {list.length === 0 ? <Text style={styles.empty}>මෙහි සමාලෝචන නැත.</Text> : list.map((r) => <ReviewItem key={r.id} review={r} />)}
    </Sheet>
  );
};

const ReviewItem: React.FC<{ review: Review }> = ({ review: r }) => {
  const { replyReview } = useShop();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  const startEdit = () => {
    setText(r.reply?.text ?? '');
    setEditing(true);
  };
  const send = () => {
    replyReview(r.id, text);
    setEditing(false);
  };

  return (
    <View style={[styles.card, r.rating <= 3 && styles.cardLow]}>
      <View style={styles.rowBetween}>
        <Text style={styles.name}>{r.garage}</Text>
        <Text style={styles.stars}>{stars(r.rating)}</Text>
      </View>
      <Text style={styles.text}>“{r.text}”</Text>
      <Text style={styles.sub}>{ago(Date.now() - r.at)}</Text>

      {editing ? (
        <View style={styles.editor}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="ඔබගේ පිළිතුර ලියන්න…"
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={300}
            autoFocus
          />
          {!text && (
            <View style={styles.templates}>
              {TEMPLATES.map((t) => (
                <Pressable key={t} style={styles.template} onPress={() => setText(t)}>
                  <Text style={styles.templateText} numberOfLines={1}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={styles.editorActions}>
            <Pressable style={styles.linkBtn} onPress={() => setEditing(false)}>
              <Text style={[styles.link, { color: Colors.textMuted }]}>අවලංගු</Text>
            </Pressable>
            <Pressable style={[styles.sendBtn, !text.trim() && styles.sendOff]} disabled={!text.trim()} onPress={send}>
              <Text style={styles.sendText}>පිළිතුර පළ කරන්න</Text>
            </Pressable>
          </View>
        </View>
      ) : r.reply ? (
        <View style={styles.reply}>
          <Text style={styles.replyLabel}>↩ ඔබගේ පිළිතුර · {ago(Date.now() - r.reply.at)}</Text>
          <Text style={styles.replyText}>{r.reply.text}</Text>
          <View style={styles.replyActions}>
            <Pressable style={styles.linkBtn} onPress={startEdit}>
              <Text style={styles.link}>සංස්කරණය</Text>
            </Pressable>
            <Pressable style={styles.linkBtn} onPress={() => replyReview(r.id, '')}>
              <Text style={[styles.link, { color: Colors.errorText }]}>මකන්න</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.replyBtn} onPress={startEdit}>
          <Text style={styles.link}>↩ පිළිතුරු දෙන්න</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    summary: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.35)' },
    avg: { fontSize: 26, fontWeight: '900', color: Colors.warning },
    name: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    filter: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    filterActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    filterText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    filterTextActive: { color: '#fff' },
    empty: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', paddingVertical: 16 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 16, padding: 14, gap: 6 },
    cardLow: { borderColor: 'rgba(245, 158, 11, 0.4)' },
    stars: { fontSize: 13, color: Colors.warning, letterSpacing: 2 },
    text: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 19 },
    reply: { marginTop: 4, padding: 10, borderRadius: 12, backgroundColor: 'rgba(56, 189, 248, 0.08)', borderLeftWidth: 3, borderLeftColor: Colors.primary, gap: 3 },
    replyLabel: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    replyText: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 18 },
    replyActions: { flexDirection: 'row', gap: 12 },
    replyBtn: { alignSelf: 'flex-start', marginTop: 2, paddingVertical: 4 },
    linkBtn: { paddingVertical: 4 },
    link: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    editor: { gap: 8, marginTop: 4 },
    input: {
      minHeight: 72,
      padding: 12,
      borderRadius: 12,
      backgroundColor: Colors.subtleFill,
      borderWidth: 1,
      borderColor: Colors.borderColor,
      color: Colors.textMain,
      fontSize: 12.5,
      fontFamily: FONTS.bodyRegular,
      textAlignVertical: 'top',
    },
    templates: { gap: 6 },
    template: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.subtleBorder },
    templateText: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    editorActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 14 },
    sendBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: Colors.primary },
    sendOff: { opacity: 0.45 },
    sendText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#fff' },
  })
);
