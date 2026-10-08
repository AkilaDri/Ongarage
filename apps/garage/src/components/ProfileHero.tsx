import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, LevelBadge, Pulse, themedStyles, softShadow, softEdge } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';

// The Garage tab's profile card (like the owner app's Account page): who the garage is, its level,
// and the online switch. Tapping it opens the card owners see.
export const ProfileHero: React.FC<{ onOpenCard: () => void }> = ({ onOpenCard }) => {
  const { profile, isOpen, setOpen, level, rating } = useGarage();
  const initials = profile.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
  return (
    <View style={styles.wrap}>
      <Pressable style={styles.top} onPress={onOpenCard} accessibilityLabel="Open garage profile card">
        <View style={styles.avatarWrap}>
          {isOpen && <Pulse style={styles.pulse} maxScale={1.18} />}
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          <View style={[styles.dot, { backgroundColor: isOpen ? '#22c55e' : Colors.textMuted }]} />
        </View>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {profile.name}
          </Text>
          <Text style={styles.arrow}>›</Text>
        </View>
        <View style={styles.metaRow}>
          <LevelBadge level={level.id} compact />
          <Text style={styles.rating}>★ {rating.average}</Text>
        </View>
        <Text style={styles.address} numberOfLines={1}>
          📍 {profile.address}
        </Text>
      </Pressable>
      <Pressable
        style={styles.pill}
        onPress={() => setOpen(!isOpen)}
        accessibilityRole="switch"
        accessibilityState={{ checked: isOpen }}
        accessibilityLabel="Toggle online"
      >
        <View style={[styles.pillDot, { backgroundColor: isOpen ? '#22c55e' : Colors.textMuted }]} />
        <Text style={[styles.pillText, { color: isOpen ? Colors.successText : Colors.textMuted }]}>{isOpen ? 'සබැඳියි · SOS ලබා ගනිමින්' : 'නොබැඳියි'}</Text>
      </Pressable>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { alignItems: 'center', gap: 12, paddingTop: 6 },
    top: { alignItems: 'center', gap: 6 },
    avatarWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
    pulse: { position: 'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: 'rgba(34, 197, 94, 0.5)' },
    avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: softEdge(), ...softShadow() },
    initials: { fontSize: 22, fontWeight: '900', color: Colors.success, letterSpacing: 0.5 },
    dot: { position: 'absolute', right: 8, bottom: 8, width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: Colors.bgBody },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '92%' },
    name: { fontSize: 20, fontFamily: FONTS.titleBold, color: Colors.textMain, flexShrink: 1 },
    arrow: { fontSize: 22, color: Colors.textMuted },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rating: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.warning },
    address: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, maxWidth: '92%' },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: Colors.bgCard, ...softShadow() },
    pillDot: { width: 9, height: 9, borderRadius: 5 },
    pillText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold },
  })
);
