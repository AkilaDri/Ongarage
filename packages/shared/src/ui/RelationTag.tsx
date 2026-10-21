import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Colors, getThemeMode, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { RELATION_LABEL, type RelationLevel } from '../marketplace/relationship';
import { formatDate, money } from '../utils/format';

const dark = () => getThemeMode() === 'dark';

/** Each standing has its own colour and icon, so they can be told apart at a glance (not only by the word). */
const LOOK = (level: RelationLevel) => {
  switch (level) {
    case 'old':
      return { bg: dark() ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', border: dark() ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc', ink: dark() ? '#8db1ff' : '#1a73e8' };
    default:
      return { bg: Colors.subtleFill, border: dark() ? Colors.borderColor : '#dadce0', ink: Colors.textMuted };
  }
};

/** A drawn icon for each standing: a sparkle (new), a clock (old: it has been before). */
const RelationIcon: React.FC<{ level: RelationLevel; color: string }> = ({ level, color }) => (
  <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {level === 'new' && (
      <>
        <Path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" fill="#f5b301" stroke="#f5b301" />
        <Path d="M19 3v4M17 5h4" stroke="#f5b301" />
      </>
    )}
    {level === 'old' && (
      <>
        <Circle cx={12} cy={12} r={9} />
        <Path d="M12 7v5l3 2" />
      </>
    )}
  </Svg>
);

/**
 * Where a customer and a garage stand with each other (new or old): a small pill (20px tall) with an icon and a colour of its
 * own. With `onPress` it opens their record (the pill then ends in a ›).
 */
export const RelationTag: React.FC<{ level: RelationLevel; count?: number; onPress?: () => void; accessibilityLabel?: string }> = ({ level, count, onPress, accessibilityLabel }) => {
  const look = LOOK(level);
  return (
    <Pressable
      style={[styles.tag, { backgroundColor: look.bg, borderColor: look.border }]}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={8}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? RELATION_LABEL[level]}
    >
      <RelationIcon level={level} color={look.ink} />
      <Text style={[styles.text, { color: look.ink, fontSize: 10, lineHeight: 12 }]} numberOfLines={1}>
        {RELATION_LABEL[level]}
        {count ? ` · ${count}` : ''}
        {onPress ? '  ›' : ''}
      </Text>
    </Pressable>
  );
};

/** The numbers of a record at a glance: jobs together, since when, the last one, what they came to and the average rating. */
export const RelationSummary: React.FC<{ jobs: number; since?: number; last?: number; total: number; avgRating?: number }> = ({ jobs, since, last, total, avgRating }) => (
  <View style={styles.summary}>
    <Stat label="එකට කළ රැකියා" value={String(jobs)} />
    <Stat label="මුළු වටිනාකම" value={money(total)} />
    <Stat label="පළමු වතාව" value={since ? formatDate(since) : '—'} />
    <Stat label="අවසන් වතාව" value={last ? formatDate(last) : '—'} />
    {avgRating !== undefined && <Stat label="සාමාන්‍ය ශ්‍රේණිගත කිරීම" value={`★ ${avgRating.toFixed(1)}`} />}
  </View>
);

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.statLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    tag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, height: 20, borderRadius: 10, borderWidth: 1, maxWidth: '100%' },
    mark: { fontSize: 13, fontFamily: FONTS.bodyBold },
    text: { fontSize: 12, fontFamily: FONTS.bodySemiBold },
    summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    stat: { flexGrow: 1, flexBasis: '30%', minWidth: 104, gap: 4, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: Colors.subtleFill },
    statValue: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    statLabel: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
  })
);
