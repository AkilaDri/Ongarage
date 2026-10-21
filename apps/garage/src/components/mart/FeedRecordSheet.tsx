import { EmptyState } from '@ongarage/shared';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';
import { Sheet } from '../Sheet';
import { useWall } from '../../context/WallContext';
import { onOpenFeedRecord } from '../../utils/feedRecord';

type Kind = 'liked' | 'commented' | 'shared' | 'messaged' | 'saved';
const KINDS: { id: Kind; label: string; icon: string; empty: string }[] = [
  { id: 'liked', label: 'Liked', icon: '👍', empty: 'You have not liked any post yet.' },
  { id: 'commented', label: 'Commented', icon: '💬', empty: 'You have not commented on any post yet.' },
  { id: 'shared', label: 'Shared', icon: '↗️', empty: 'You have not shared any post yet.' },
  { id: 'messaged', label: 'Messaged', icon: '✉️', empty: 'You have not messaged anyone about a post yet.' },
  { id: 'saved', label: 'Saved', icon: '🔖', empty: 'You have not saved any post yet.' },
];

const ago = (at: number) => {
  const m = Math.max(1, Math.round((Date.now() - at) / 60000));
  return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

/**
 * Everything the owner did on the On Feed, as a record: the posts they liked, commented on, shared, wrote to (OnChat) and saved. It opens from the
 * hamburger button in the top bar.
 */
export const FeedRecordSheet: React.FC = () => {
  const wall = useWall();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>('liked');
  useEffect(() => onOpenFeedRecord(() => setOpen(true)), []);

  const rec = wall.record();
  const ids = rec[kind];
  const rows = ids
    .map((id) => wall.posts.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => {
      const mine = wall.commentsFor(p.id).filter((c) => c.author === 'ඔබ');
      const reply = wall.replyFor(p.id);
      const when = kind === 'messaged' ? reply?.at : kind === 'commented' ? mine[mine.length - 1]?.at : kind === 'shared' ? rec.sharedAt[p.id] : p.at;
      const detail = kind === 'commented' ? `“${mine[mine.length - 1]?.text ?? ''}”` : kind === 'messaged' ? reply?.message || 'Told them you have this part' : p.description;
      return { p, when: when ?? p.at, detail };
    });

  return (
    <Sheet visible={open} title="My On Feed record" subtitle="Posts you liked, commented on, shared and messaged" onClose={() => setOpen(false)}>
      <View style={styles.tabs}>
        {KINDS.map((k) => {
          const on = kind === k.id;
          return (
            <Pressable key={k.id} style={[styles.tab, on && styles.tabOn]} onPress={() => setKind(k.id)} accessibilityLabel={`Record ${k.label}`}>
              <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>
                {k.icon} {k.label} {rec[k.id].length}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {rows.length === 0 ? (
        <EmptyState icon={KINDS.find((k) => k.id === kind)?.icon ?? '📭'} title="වාර්තා නැත" text={KINDS.find((k) => k.id === kind)?.empty ?? ''} />
      ) : (
        rows.map(({ p, when, detail }) => (
          <View key={p.id} style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {p.part}
              </Text>
              <Text style={styles.rowTime}>{ago(when)}</Text>
            </View>
            <Text style={styles.rowSub} numberOfLines={1}>
              {p.author} · {p.place}
            </Text>
            <Text style={styles.rowDetail} numberOfLines={2}>
              {detail}
            </Text>
          </View>
        ))
      )}
    </Sheet>
  );
};

const blue = () => (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8');

const styles = themedStyles(() =>
  StyleSheet.create({
    tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tab: { paddingHorizontal: 12, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: Colors.subtleFill },
    tabOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.2)' : '#e8f0fe' },
    tabText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    tabTextOn: { color: blue() },
    empty: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, paddingVertical: 20, textAlign: 'center' },
    row: { gap: 3, padding: 14, borderRadius: 16, backgroundColor: Colors.subtleFill },
    rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    rowTitle: { flex: 1, fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textSoft },
    rowTime: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    rowSub: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    rowDetail: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 18 },
  })
);
