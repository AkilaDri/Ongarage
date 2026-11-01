import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, FONTS, getThemeMode, softEdge, themedStyles } from '@ongarage/shared';
import { ago } from '../utils/format';

const AVATAR_COLORS = ['#2457e6', '#0e9f6e', '#e5483d', '#8b5cf6', '#f59e0b', '#0891b2', '#db2777'];
const avatarColor = (id: string) => AVATAR_COLORS[[...id].reduce((n, ch) => n + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];

export type ReviewView = {
  id: string;
  name: string;
  rating: number;
  at: number;
  text?: string;
  /** A line under the name, e.g. "✓ කේතයෙන් අවසන් කළ රැකියාවක්" (Google shows "Local Guide · 12 reviews" here). */
  meta?: string;
  /** The owner's public reply. */
  reply?: { by: string; text: string; at?: number };
};

/** Five stars, the first `rating` of them filled (the Google gold). */
export const Stars: React.FC<{ rating: number; size?: number }> = ({ rating, size = 13 }) => (
  <Text style={[styles.stars, { fontSize: size, letterSpacing: 1 }]}>
    {'★'.repeat(Math.round(rating))}
    <Text style={styles.starsOff}>{'★'.repeat(5 - Math.round(rating))}</Text>
  </Text>
);

/**
 * The rating summary the way Google Maps shows it: the big average with its stars and the review count on the left, a bar for every star level on the right.
 */
export const RatingSummary: React.FC<{ avg: number; count: number; ratings: number[] }> = ({ avg, count, ratings }) => (
  <View style={styles.summary}>
    <View style={styles.summaryBig}>
      <Text style={styles.summaryNum}>{count ? avg.toFixed(1) : '–'}</Text>
      <Stars rating={avg} size={14} />
      <Text style={styles.muted}>සමාලෝචන {count}</Text>
    </View>
    <View style={styles.flex1}>
      {[5, 4, 3, 2, 1].map((n) => {
        const c = ratings.filter((r) => Math.round(r) === n).length;
        return (
          <View key={n} style={styles.spreadRow}>
            <Text style={styles.spreadLabel}>{n}</Text>
            <View style={styles.spreadTrack}>
              <View style={[styles.spreadFill, { width: `${ratings.length ? (c / ratings.length) * 100 : 0}%` }]} />
            </View>
          </View>
        );
      })}
    </View>
  </View>
);

/**
 * One review as a Google Maps review card (on its own shadowed card): the reviewer's round avatar and name (with a line under it), the stars and how long ago, the text, a "Helpful"
 * button and the owner's response indented underneath. Every profile (garage, fuel station, charger, tow operator) shows its reviews with this card.
 */
export const ReviewCard: React.FC<{ review: ReviewView; /** A narrow card for a sideways row (the text is cut after a few lines). */ compact?: boolean }> = ({ review: r, compact }) => {
  const [helpful, setHelpful] = useState(false);
  return (
    <View style={[styles.card, compact && styles.cardCompact]} accessibilityLabel={`Review by ${r.name}`}>
      <View style={styles.head}>
        <View style={[styles.avatar, { backgroundColor: avatarColor(r.id + r.name) }]}>
          <Text style={styles.avatarText}>{r.name.trim().slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.name} numberOfLines={1}>
            {r.name}
          </Text>
          {!!r.meta && (
            <Text style={styles.muted} numberOfLines={1}>
              {r.meta}
            </Text>
          )}
        </View>
        <Text style={styles.dots}>⋮</Text>
      </View>
      <View style={styles.when}>
        <Stars rating={r.rating} />
        <Text style={styles.muted}>{ago(Date.now() - r.at)}</Text>
      </View>
      {!!r.text && (
        <Text style={styles.text} numberOfLines={compact ? 4 : undefined}>
          {r.text}
        </Text>
      )}
      <View style={styles.actions}>
        <Pressable style={[styles.helpful, helpful && styles.helpfulOn]} onPress={() => setHelpful((v) => !v)} accessibilityLabel="Helpful review">
          <Text style={[styles.helpfulText, helpful && styles.helpfulTextOn]}>👍 {helpful ? 'ප්‍රයෝජනවත් ✓' : 'ප්‍රයෝජනවත්'}</Text>
        </Pressable>
      </View>
      {!!r.reply && (
        <View style={styles.reply}>
          <Text style={styles.replyHead}>
            {r.reply.by} ගෙන් පිළිතුර{r.reply.at ? ` · ${ago(Date.now() - r.reply.at)}` : ''}
          </Text>
          <Text style={styles.replyText}>{r.reply.text}</Text>
        </View>
      )}
    </View>
  );
};

const dark = () => getThemeMode() === 'dark';
// A stronger shadow than softShadow (the app shape rule softens every style that uses shadow keys, so this one is a boxShadow): a wide soft one and a tight one under the edge.
const cardShadow = () => ({ boxShadow: dark() ? '0 6px 18px rgba(0, 0, 0, 0.55), 0 1px 3px rgba(0, 0, 0, 0.5)' : '0 2px 12px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)' }) as object;

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    muted: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    stars: { color: '#fbbc04' },
    starsOff: { color: Colors.subtleBorder },
    summary: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingVertical: 14 },
    summaryBig: { alignItems: 'center', gap: 2, minWidth: 90 },
    summaryNum: { fontSize: 40, lineHeight: 46, fontFamily: FONTS.titleBold, color: Colors.textMain },
    spreadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
    spreadLabel: { width: 10, fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    spreadTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: dark() ? 'rgba(255, 255, 255, 0.12)' : '#e3e8ef' },
    spreadFill: { height: 8, backgroundColor: '#fbbc04' },
    // Every review is its own card with a soft shadow, so one can be told from the next.
    card: { padding: 14, gap: 8, marginHorizontal: 2, marginVertical: 7, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), ...cardShadow() },
    cardCompact: { width: 270 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 16, fontFamily: FONTS.titleBold, color: '#ffffff' },
    name: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    dots: { fontSize: 20, color: Colors.textMuted, paddingHorizontal: 4 },
    when: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    text: { fontSize: 13.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 20 },
    actions: { flexDirection: 'row' },
    helpful: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: dark() ? Colors.borderColor : '#dadce0' },
    helpfulOn: { backgroundColor: dark() ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: 'transparent' },
    helpfulText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    helpfulTextOn: { color: '#1a73e8' },
    reply: { marginLeft: 20, padding: 12, borderRadius: 12, gap: 3, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.06)' : '#f1f3f4' },
    replyHead: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    replyText: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 19 },
  })
);

/**
 * The reviews part of a profile's overview, under the details: the rating summary, then the latest reviews as narrow cards that scroll sideways, "all reviews"
 * (opens the reviews tab) and, when the profile lets visitors review, the form to write one.
 */
export const ReviewsSection: React.FC<{ avg: number; count: number; reviews: ReviewView[]; onSeeAll?: () => void; write?: React.ReactNode }> = ({ avg, count, reviews, onSeeAll, write }) => (
  <View>
    <View style={sectionStyles.head}>
      <Text style={sectionStyles.title}>⭐ සමාලෝචන</Text>
      {!!onSeeAll && reviews.length > 0 && (
        <Pressable onPress={onSeeAll} accessibilityLabel="See all reviews">
          <Text style={sectionStyles.link}>සියල්ල බලන්න ›</Text>
        </Pressable>
      )}
    </View>
    <RatingSummary avg={avg} count={count} ratings={reviews.map((r) => r.rating)} />
    {reviews.length > 0 && (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sectionStyles.row} accessibilityLabel="Latest reviews">
        {reviews.slice(0, 8).map((r) => (
          <ReviewCard key={r.id} review={r} compact />
        ))}
      </ScrollView>
    )}
    {write}
  </View>
);

/** Stars and a short note: the form for giving a review. onSubmit returns a reason when the note cannot be published. */
export const WriteReview: React.FC<{ done?: boolean; doneText?: string; onSubmit: (stars: number, text: string) => Promise<{ ok: true } | { ok: false; reason: string }> }> = ({ done, doneText, onSubmit }) => {
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  if (done) return <Text style={sectionStyles.done}>{doneText ?? '✓ ඔබ සමාලෝචනයක් දැම්මා.'}</Text>;
  const send = async () => {
    if (stars < 1) return;
    const r = await onSubmit(stars, text);
    if (r.ok) {
      setStars(0);
      setText('');
      setProblem(null);
    } else setProblem(r.reason);
  };
  return (
    <View style={sectionStyles.write}>
      <Text style={sectionStyles.writeTitle}>ඔබේ සමාලෝචනය ලියන්න</Text>
      <View style={sectionStyles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setStars(n)} hitSlop={6} accessibilityLabel={`Rate place ${n}`}>
            <Text style={[sectionStyles.star, stars >= n && sectionStyles.starOn]}>★</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={sectionStyles.input} value={text} onChangeText={(t) => { setText(t); setProblem(null); }} placeholder="කෙටි සටහනක් (විකල්ප)" placeholderTextColor={Colors.textMuted} multiline maxLength={200} accessibilityLabel="Place review text" />
      {!!problem && <Text style={sectionStyles.problem}>⚠️ {problem}</Text>}
      <ActionButton label="සමාලෝචනය යවන්න" icon="⭐" variant="primary" compact disabled={stars < 1} onPress={send} />
    </View>
  );
};

const sectionStyles = themedStyles(() =>
  StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 2 },
    title: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary, letterSpacing: 0.2 },
    link: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: '#1a73e8' },
    row: { gap: 10, paddingVertical: 14, paddingRight: 10 },
    write: { gap: 8, marginTop: 14 },
    writeTitle: { fontSize: 13.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    stars: { flexDirection: 'row', gap: 6 },
    star: { fontSize: 30, color: Colors.subtleBorder },
    starOn: { color: Colors.warning },
    input: { minHeight: 60, padding: 12, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#ffffff', borderWidth: 1, borderColor: Colors.borderColor, color: Colors.textMain, fontSize: 13, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top' },
    problem: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#f28b82' : '#b3261e' },
    done: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 10 },
  })
);
