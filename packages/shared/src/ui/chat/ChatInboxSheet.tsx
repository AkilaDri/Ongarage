import { OnChatIcon } from '../OnChatIcon';
import { VehicleLabel } from '../VehicleIcon3D';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { formatTime } from '../../utils/format';
import { initialsOf } from '../../utils/initials';
import { EmptyState } from '../Glass';
import { Icon } from '../Icons';
import { vehicleIcon } from '../../constants/vehicles';
import { Sheet } from '../Sheet';
import type { ChatMessage, ChatSide } from '../../types';
import { inInboxFilter } from '../../marketplace/chat';

/** One row of the inbox: a conversation, what it is about and its last message. */
export type InboxThread = {
  id: string;
  title: string;
  subtitle?: string;
  phone?: string;
  /** What the conversation is about: the owner and garage apps use direct / job / sos / mart; a parts shop garage / customer / order; a technician customer / garage / sos / job. */
  kind: 'direct' | 'job' | 'sos' | 'mart' | 'garage' | 'customer' | 'order' | 'inquiry';
  icon: string;
  last?: ChatMessage;
  unread: number;
  /** A conversation that has just begun (a job just taken) and has not been opened yet: it blinks "new" until it is. */
  isNew?: boolean;
  vehicle?: { name: string; plate: string; type: string; registrationNo?: string };
  /** The job's record, put in the chat when it first appears. */
  record?: string;
  /** The job this conversation is about is over (closed, completed or cancelled): it is kept under the "අවසන්" chip and left out of every other chip, "සියල්ල" too. */
  done?: boolean;
};

const KIND: Record<InboxThread['kind'], { label: string; color: () => string; bg: () => string }> = {
  garage: { label: 'ගරාජ', color: () => (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8'), bg: () => (getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe') },
  customer: { label: 'පාරිභෝගික', color: () => Colors.successText, bg: () => (getThemeMode() === 'dark' ? 'rgba(16, 185, 129, 0.14)' : '#e6f4ea') },
  order: { label: 'ඇණවුම', color: () => (getThemeMode() === 'dark' ? '#fdd663' : '#8a4b00'), bg: () => (getThemeMode() === 'dark' ? 'rgba(253, 214, 99, 0.16)' : '#fef7e0') },
  inquiry: { label: 'විමසීම', color: () => (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8'), bg: () => (getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe') },
  direct: { label: 'ඍජු', color: () => Colors.successText, bg: () => (getThemeMode() === 'dark' ? 'rgba(16, 185, 129, 0.14)' : '#e6f4ea') },
  job: { label: 'වැඩ', color: () => (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8'), bg: () => (getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe') },
  sos: { label: 'SOS', color: () => Colors.errorText, bg: () => (getThemeMode() === 'dark' ? 'rgba(239, 68, 68, 0.14)' : '#fce8e6') },
  mart: { label: 'OnMart', color: () => (getThemeMode() === 'dark' ? '#fdd663' : '#8a4b00'), bg: () => (getThemeMode() === 'dark' ? 'rgba(253, 214, 99, 0.16)' : '#fef7e0') },
};

type Filter = 'all' | 'done' | InboxThread['kind'];
/** A small "new" tag that blinks until the conversation is opened. */
const NewBadge: React.FC = () => {
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.25, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [blink]);
  return (
    <Animated.View style={[styles.newTag, { opacity: blink }]} accessibilityLabel="New chat">
      <Text style={styles.newTagText}>NEW</Text>
    </Animated.View>
  );
};

/** The filter chips an app shows (the owner and garage apps' by default; a parts shop and a technician pass their own). */
export type InboxFilter = { id: Filter; label: string };
export const DEFAULT_INBOX_FILTERS: InboxFilter[] = [
  { id: 'all', label: 'සියල්ල' },
  { id: 'direct', label: 'ඍජු' },
  { id: 'inquiry', label: 'විමසීම්' },
  { id: 'job', label: 'ලංසු' },
  { id: 'mart', label: 'OnMart' },
  { id: 'sos', label: 'SOS' },
  { id: 'done', label: 'අවසන්' },
];

/**
 * Every conversation one side has, in one list with a search box and filters (direct, bids, OnMart, SOS). The newest and the
 * unread first; tap one to chat. The same list serves the garage app and the owner app.
 * `me` is who is reading: a last message from them gets the sent tick.
 */
export function ChatInboxSheet<T extends InboxThread>({ visible, onClose, overlay, me, threads: all, onOpen, filters = DEFAULT_INBOX_FILTERS }: { visible: boolean; onClose: () => void; overlay?: React.ReactNode; me: ChatSide; filters?: InboxFilter[]; threads: T[]; onOpen: (thread: T) => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const threads = all.filter((t) => inInboxFilter(t, filter) && (!q || t.title.toLowerCase().includes(q) || (t.last?.text ?? '').toLowerCase().includes(q)));
  return (
    <Sheet visible={visible} title="OnChat" titleIcon={<View style={styles.mark}><OnChatIcon width={28} color="#ffffff" /></View>} onClose={onClose} overlay={overlay} fullScreen>
      <View style={styles.search}>
        <Icon name="search" size={17} color={Colors.textMuted} />
        <TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="සොයන්න" placeholderTextColor={Colors.textMuted} accessibilityLabel="Search chats" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map((f) => {
          const on = filter === f.id;
          const unread = all.filter((t) => inInboxFilter(t, f.id) && t.unread > 0).length;
          return (
            <Pressable key={f.id} style={[styles.filter, on && styles.filterOn]} onPress={() => setFilter(f.id)} accessibilityLabel={`Show ${f.label}`} accessibilityState={{ selected: on }}>
              {on && <Text style={styles.filterTextOn}>✓</Text>}
              <Text style={[styles.filterText, on && styles.filterTextOn]}>{f.label}</Text>
              {unread > 0 && (
                <View style={[styles.filterBadge, on && styles.filterBadgeOn]}>
                  <Text style={[styles.filterBadgeText, on && styles.filterBadgeTextOn]}>{unread}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      {threads.length === 0 && filter === 'done' ? (
        <EmptyState icon="✅" title="අවසන් වූ රැකියා නැත" text="රැකියාවක් අවසන් වූ පසු (වසා දැමූ, සම්පූර්ණ කළ හෝ අවලංගු කළ) එහි කතාබහ මෙහි තබා ගනී. එය 'සියල්ල' හි නොපෙන්වයි." />
      ) : threads.length === 0 ? (
        <EmptyState icon="💬" title="පණිවිඩ නැත" text="ඍජු ඉල්ලීමක්, දිනූ ලංසුවක් හෝ පිළිගත් SOS එකක් ඇති විට එහි පාරිභෝගිකයා සමඟත්, OnMart හි ඔබගේ ඉල්ලීම්වලට පිළිතුරු දුන් වෙළඳසැල් සමඟත් මෙහි කතා කළ හැක." />
      ) : (
        threads.map((t) => {
          const kind = KIND[t.kind];
          return (
            <Pressable key={t.id} style={({ pressed }) => [styles.row, t.unread > 0 && styles.rowUnread, pressed && styles.rowPressed]} onPress={() => onOpen(t)} accessibilityLabel={`Chat with ${t.title}`}>
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>{initialsOf(t.title)}</Text>
              </View>
              <View style={styles.body}>
                <View style={styles.line}>
                  <Text style={[styles.name, t.unread > 0 && styles.nameUnread]} numberOfLines={1}>
                    {t.title}
                  </Text>
                  {t.isNew && <NewBadge />}
                  {!!t.last && <Text style={[styles.time, t.unread > 0 && styles.timeUnread]}>{formatTime(t.last.at)}</Text>}
                </View>
                {!!t.vehicle && (
                  <VehicleLabel type={t.vehicle.type} style={styles.vehicle} numberOfLines={1}>
                    {t.vehicle.name} · {t.vehicle.registrationNo || t.vehicle.plate}
                  </VehicleLabel>
                )}
                <View style={styles.line}>
                  <View style={styles.previewRow}>
                    {t.last?.from === me && <Icon name="check-check" size={15} color={GREEN} />}
                    <Text style={[styles.preview, t.unread > 0 && styles.previewUnread]} numberOfLines={1}>
                      {t.last ? (t.last.deleted ? '🚫 පණිවිඩය මකා දමන ලදී' : (t.last.text ?? '📷 ඡායාරූපයක්')) : 'තවම පණිවිඩ නැත — කතා කරන්න'}
                    </Text>
                  </View>
                  <View style={[styles.kind, { backgroundColor: kind.bg() }]}>
                    <Text style={[styles.kindText, { color: kind.color() }]}>{kind.label}</Text>
                  </View>
                  {t.unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{t.unread > 99 ? '99+' : t.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          );
        })
      )}
    </Sheet>
  );
}

const dark = () => getThemeMode() === 'dark';
const GREEN = '#1a73e8';

const styles = themedStyles(() =>
  StyleSheet.create({
    newTag: { paddingHorizontal: 8, height: 18, borderRadius: 9, justifyContent: 'center', backgroundColor: '#d93025' },
    newTagText: { fontSize: 10.5, fontWeight: '800', color: '#ffffff' },
    mark: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: dark() ? '#3b6fd4' : '#1a73e8' },
    search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, paddingHorizontal: 16, borderRadius: 23, backgroundColor: dark() ? '#2a2f3a' : '#f1f3f4' },
    searchIcon: { fontSize: 15 },
    searchInput: { flex: 1, height: 46, color: Colors.textMain, fontSize: 15.5, fontFamily: FONTS.bodyRegular },
    filters: { gap: 10, paddingTop: 14, paddingBottom: 8, paddingRight: 8 },
    filter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, height: 32, borderRadius: 8, borderWidth: 1, borderColor: dark() ? '#3c4043' : '#dadce0', backgroundColor: 'transparent' },
    filterOn: { backgroundColor: dark() ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: dark() ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    filterText: { fontSize: 14.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    filterTextOn: { color: dark() ? '#8db1ff' : GREEN },
    filterBadge: { position: 'absolute', top: -8, right: -6, minWidth: 19, height: 19, paddingHorizontal: 5, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: dark() ? '#12161c' : '#ffffff', backgroundColor: dark() ? 'rgba(141, 177, 255, 0.34)' : '#d2e3fc' },
    filterBadgeOn: { backgroundColor: dark() ? 'rgba(141, 177, 255, 0.5)' : '#aecbfa' },
    filterBadgeText: { fontSize: 10, fontWeight: '800', color: dark() ? '#8db1ff' : '#1a73e8' },
    filterBadgeTextOn: {},
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
    // A conversation with unread messages sits on a soft blue tint, so it stands out from the read ones.
    rowUnread: { paddingHorizontal: 10, marginHorizontal: -4, borderRadius: 12, backgroundColor: dark() ? 'rgba(141, 177, 255, 0.12)' : '#e8f0fe' },
    rowPressed: { backgroundColor: dark() ? '#2a2f3a' : '#f1f3f4' },
    avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: dark() ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    avatarEmoji: { fontSize: 15, letterSpacing: 0.5, fontFamily: FONTS.titleBold, color: dark() ? '#8db1ff' : '#1a73e8' },
    body: { flex: 1, gap: 3 },
    line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { flex: 1, fontSize: 14.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    nameUnread: { fontWeight: '800' },
    time: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    timeUnread: { color: dark() ? '#8db1ff' : GREEN, fontFamily: FONTS.bodySemiBold },
    vehicle: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: dark() ? '#8db1ff' : '#1a73e8' },
    previewRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
    tick: { fontSize: 11.5, color: GREEN, fontWeight: '700' },
    preview: { flexShrink: 1, marginLeft: 0, fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    previewUnread: { color: Colors.textMain },
    kind: { paddingHorizontal: 5, height: 16, justifyContent: 'center', borderRadius: 4 },
    kindText: { fontSize: 9, fontWeight: '800' },
    badge: { minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: dark() ? '#8db1ff' : GREEN, alignItems: 'center', justifyContent: 'center' },
    badgeText: { fontSize: 10.5, fontWeight: '800', color: dark() ? '#0b1b3a' : '#ffffff' },
  })
);
