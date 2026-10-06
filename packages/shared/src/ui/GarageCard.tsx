import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '../theme/colors';
import { type Garage } from '../types';
import { Gradient, GRADIENTS } from './Visuals';

interface GarageCardProps {
  garage: Garage;
  variant: 'home' | 'map';
  thumbColor: string;
  onCall: () => void;
  onDirections: () => void;
  onBook: () => void;
}

export const GarageCard: React.FC<GarageCardProps> = ({ garage, variant, thumbColor, onCall, onDirections, onBook }) => {
  const [isSaved, setIsSaved] = useState(false);
  const isHome = variant === 'home';

  const toggleSave = () => {
    const next = !isSaved;
    setIsSaved(next);
    Alert.alert(next ? 'ගරාජය ඔබගේ සුරැකි ලැයිස්තුවට එකතු කරන ලදී!' : 'සුරැකි ලැයිස්තුවෙන් ඉවත් කරන ලදී.');
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.mainInfo}>
          <View style={styles.thumb}>
            <Text style={[styles.thumbText, { color: thumbColor }]}>{garage.name.substring(0, 3).toUpperCase()}</Text>
          </View>
          <View style={styles.detailsBox}>
            <Text style={styles.garageName}>{garage.name}</Text>
            <Text style={styles.specialization}>
              {isHome ? `⚙️ විශේෂඥතාව: ${garage.specialization}` : `⚙ ${garage.specialization}`}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.ratingBadge}>
                ★ {garage.rating.toFixed(1)} ({garage.reviews})
              </Text>
              <Text style={styles.openBadge}>{isHome ? '● දැන් විවෘතයි' : '● විවෘතයි'}</Text>
              <Text style={styles.distanceLabel}>
                {isHome ? `📍 කි.මී. ${garage.distance} යි` : `📍 ${garage.distance} කි.මී.`}
              </Text>
            </View>
          </View>
        </View>
        <Pressable
          style={[styles.saveBtn, isSaved && { borderColor: 'rgba(244, 63, 94, 0.3)' }]}
          onPress={toggleSave}
        >
          <Text style={[styles.saveBtnText, isSaved && { color: '#f43f5e' }]}>{isSaved ? '♥' : '♡'}</Text>
        </Pressable>
      </View>

      {garage.photos && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
          {garage.photos.map((uri) => (
            <View key={uri} style={styles.photoFrame}>
              <Text style={styles.photoPlaceholder}>📷</Text>
              <Image source={{ uri }} style={styles.photo} />
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.reviewBox}>
        <Text style={styles.reviewText}>
          <Text style={styles.reviewLabel}>පාරිභෝගික සටහන:</Text> "{garage.reviews_text}"
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={({ pressed }) => [styles.actionBtn, styles.callBtn, pressed && styles.pressed]} onPress={onCall}>
          <Text style={styles.actionIcon}>📞</Text>
          <Text style={[styles.actionLabel, { color: Colors.primary }]}>අමතන්න</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.actionBtn, styles.directionsBtn, pressed && styles.pressed]} onPress={onDirections}>
          <Text style={styles.actionIcon}>🗺️</Text>
          <Text style={[styles.actionLabel, { color: Colors.warning }]}>දිශාවන්</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.actionBtn, styles.bookBtn, pressed && styles.pressed]} onPress={onBook}>
          <Gradient stops={GRADIENTS.cta} />
          <Text style={styles.actionIcon}>📅</Text>
          <Text style={[styles.actionLabel, { color: '#fff' }]}>බුක් කරන්න</Text>
        </Pressable>
      </View>
    </View>
  );
};

// A heavy black shadow reads as depth on dark backgrounds but smudges grey on light
// ones, where neighbouring cards' shadows overlap; light mode uses a soft tinted lift.
const cardShadow = () =>
  getThemeMode() === 'dark'
    ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 6 }
    : { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 };

const styles = themedStyles(() => StyleSheet.create({
  card: {
    backgroundColor: Colors.cardGlass,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    borderRadius: 20,
    padding: 14,
    gap: 12,
    ...cardShadow(),
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  mainInfo: { flexDirection: 'row', gap: 10, flex: 1, alignItems: 'flex-start' },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.glassBg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: getThemeMode() === 'dark' ? 0.2 : 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  thumbText: { fontSize: 12, fontWeight: '800' },
  detailsBox: { flex: 1 },
  garageName: { fontSize: 14, fontWeight: '800', color: Colors.textMain, lineHeight: 18 },
  specialization: { fontSize: 10.5, fontWeight: '700', color: Colors.primary, marginTop: 2, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  ratingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: Colors.warning,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    fontSize: 9.5,
    fontWeight: '800',
  },
  openBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: Colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    fontSize: 9.5,
    fontWeight: '800',
  },
  distanceLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
  saveBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.subtleFill,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  saveBtnText: { fontSize: 14, color: Colors.textMuted },
  photosRow: { gap: 8, paddingBottom: 2 },
  photoFrame: {
    width: 90,
    height: 65,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholder: { fontSize: 18, opacity: 0.5 },
  photo: { ...StyleSheet.absoluteFill },
  reviewBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  reviewText: { fontSize: 11, fontWeight: '500', color: Colors.textSoft, lineHeight: 15.4 },
  reviewLabel: { fontWeight: '700', color: Colors.textMain },
  actionsRow: { flexDirection: 'row', gap: 8, paddingTop: 2 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  callBtn: { flex: 1, backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.3)' },
  directionsBtn: { flex: 1, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' },
  bookBtn: { flex: 1.2, borderWidth: 0, overflow: 'hidden' },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.85 },
  actionIcon: { fontSize: 12 },
  actionLabel: { fontSize: 11, fontWeight: '700' },
}));
