import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, themedStyles, softEdge, softShadow } from '@ongarage/shared';
import { useShop } from '../context/ShopContext';

export const ShopDashboardTiles: React.FC<{ onReviews: () => void }> = ({ onReviews }) => {
  const { profile, rating, reviews, stock } = useShop();
  const unanswered = reviews.filter((r) => !r.reply).length;
  return (
    <View style={styles.grid}>
      <Tile icon="★" iconColor={Colors.warning} value={String(rating.average)} label={`ගරාජ සමාලෝචන ${rating.count}`} note={unanswered ? `පිළිතුරු නැති ${unanswered}` : undefined} onPress={onReviews} />
      <Tile icon="📡" value={`${profile.deliveryRadiusKm}km`} label="බෙදාහරින ප්‍රදේශය" />
      <Tile icon="📦" value={String(stock.length)} label="සටහන් ඇති අයිතම" />
      <Tile icon="🛵" value={profile.courierEnabled && profile.ownDelivery ? '2' : profile.courierEnabled || profile.ownDelivery ? '1' : '0'} label="බෙදාහැරීමේ ක්‍රම" />
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
