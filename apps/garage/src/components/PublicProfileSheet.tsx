import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, GarageCard, themedStyles, type Garage } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { Sheet } from './Sheet';

const PREVIEW_DISTANCE_KM = 1.2;

/** Exactly what owners see in their category browse list, plus the details behind it. */
export const PublicProfileSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { profile, isOpen, rating, reviews } = useGarage();
  const asSeenByOwners: Garage = {
    id: profile.id,
    name: profile.name,
    specialization: profile.specialization,
    rating: rating.average,
    reviews: rating.count,
    distance: PREVIEW_DISTANCE_KM,
    status: isOpen ? 'open' : 'closed',
    phone: profile.phone,
    address: profile.address,
    coords: profile.coords,
    reviews_text: reviews[0]?.text,
    // The latest review with your public reply, as owners see it on your card.
    recentReviews: reviews.slice(0, 3),
    photos: profile.photos,
  };

  return (
    <Sheet visible={visible} title="පාරිභෝගිකයන්ට පෙනෙන ආකාරය" subtitle={`උදාහරණය: කි.මී. ${PREVIEW_DISTANCE_KM} ක් දුරින් සිටින වාහන හිමියෙකුට`} onClose={onClose}>
      <GarageCard garage={asSeenByOwners} variant="map" thumbColor="#10b981" onCall={() => {}} onDirections={() => {}} onBook={() => {}} />
      <Text style={styles.section}>ගරාජ තොරතුරු</Text>
      <View style={styles.card}>
        <InfoRow icon="🕗" label="විවෘත වේලාවන්" value={profile.openHours} />
        <InfoRow icon="📞" label="දුරකථනය" value={profile.phone} />
        <InfoRow icon="📍" label="ලිපිනය" value={profile.address} />
        <InfoRow icon="⚙️" label="විශේෂඥතාව" value={profile.specialization} />
      </View>
    </Sheet>
  );
};

const InfoRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <View style={styles.flex1}>
      <Text style={styles.sub}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    section: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4, marginTop: 4 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 16, padding: 14, gap: 10 },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    infoIcon: { fontSize: 16, width: 22, textAlign: 'center' },
    infoValue: { fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textMain },
  })
);
