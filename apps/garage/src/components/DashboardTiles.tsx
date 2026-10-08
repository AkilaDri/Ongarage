import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, themedStyles, softEdge, softShadow } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';

// A small dashboard for the Garage tab: the numbers a garage owner glances at to see how the garage is doing.
export const DashboardTiles: React.FC<{ onReviews: () => void; onLevel: () => void }> = ({ onReviews, onLevel }) => {
  const { rating, trust, level, bookings, directs, activeJobs, reviews } = useGarage();
  const upcoming = bookings.filter((b) => b.status !== 'completed').length;
  const waiting = directs.filter((d) => d.status === 'new').length;
  const unanswered = reviews.filter((r) => !r.reply).length;
  return (
    <View style={styles.grid}>
      <Tile icon="★" iconColor={Colors.warning} value={String(rating.average)} label={`සමාලෝචන ${rating.count}`} note={unanswered ? `පිළිතුරු නැති ${unanswered}` : undefined} onPress={onReviews} />
      <Tile icon="🛡️" value={trust.score.toFixed(1)} label="විශ්වාස ලකුණු" note={`${level.icon} ${level.name}`} onPress={onLevel} />
      <Tile icon="📅" value={String(upcoming)} label="ඉදිරි රැකියා" />
      <Tile icon="🚨" value={String(activeJobs.length)} label="සක්‍රීය SOS" note={waiting ? `නව ඉල්ලීම් ${waiting}` : undefined} />
    </View>
  );
};

const Tile: React.FC<{ icon: string; iconColor?: string; value: string; label: string; note?: string; onPress?: () => void }> = ({ icon, iconColor, value, label, note, onPress }) => (
  <Pressable style={({ pressed }) => [styles.tile, pressed && !!onPress && { opacity: 0.75 }]} onPress={onPress} disabled={!onPress}>
    <View style={styles.valueRow}>
      <Text style={[styles.icon, iconColor ? { color: iconColor } : null]}>{icon}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
    <Text style={styles.label} numberOfLines={1}>
      {label}
    </Text>
    {!!note && (
      <Text style={styles.note} numberOfLines={1}>
        {note}
      </Text>
    )}
  </Pressable>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tile: { width: '48.5%', flexGrow: 1, borderRadius: 20, padding: 14, gap: 2, borderWidth: 1, borderColor: softEdge(), backgroundColor: Colors.bgCard, ...softShadow() },
    valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    icon: { fontSize: 18 },
    value: { fontSize: 22, fontFamily: FONTS.titleBold, color: Colors.textMain },
    label: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    note: { fontSize: 10, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  })
);
