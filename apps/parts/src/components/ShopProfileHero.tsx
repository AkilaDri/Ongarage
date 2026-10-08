import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, softShadow, softEdge, themedStyles } from '@ongarage/shared';
import { useShop } from '../context/ShopContext';

export const ShopProfileHero: React.FC<{ onOpenCard: () => void }> = ({ onOpenCard }) => {
  const { profile, rating } = useShop();
  const initials = profile.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
  return (
    <View style={styles.wrap}>
      <Pressable style={styles.top} onPress={onOpenCard} accessibilityLabel="Open shop profile card">
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
        </View>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {profile.name}
          </Text>
          <Text style={styles.arrow}>›</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.rating}>★ {rating.average}</Text>
        </View>
        <Text style={styles.address} numberOfLines={1}>
          📍 {profile.address}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { alignItems: 'center', gap: 12, paddingTop: 6 },
    top: { alignItems: 'center', gap: 6, width: '100%' },
    avatarWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
    avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: softEdge(), ...softShadow() },
    initials: { fontSize: 22, fontWeight: '900', color: Colors.primary, letterSpacing: 0.5 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '92%' },
    name: { fontSize: 20, fontFamily: FONTS.titleBold, color: Colors.textMain, flexShrink: 1 },
    arrow: { fontSize: 22, color: Colors.textMuted },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rating: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.warning },
    address: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, maxWidth: '92%' },
  })
);
