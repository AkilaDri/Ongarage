import React from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet, Alert, Linking } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors, themedStyles } from '@ongarage/shared';
import { FONTS } from '@ongarage/shared';
import { MOCK_GARAGES } from '../constants/mockData';
import { SERVICE_CATEGORIES } from '@ongarage/shared';
import { Header } from '../components/Header';
import { ServiceCard } from '../components/ServiceCard';
import { GarageCard } from '../components/GarageCard';
import { Gradient, GRADIENTS, Pulse } from '@ongarage/shared';
import { useUserLocation } from '../context/LocationContext';
import { directionsUrl, distanceKm } from '@ongarage/shared';
import type { ServiceCategory } from '@ongarage/shared';

interface HomeScreenProps {
  onSOSPress: () => void;
  onPostJob: (withBuddy: boolean) => void;
  onServicePress: (service: ServiceCategory) => void;
  activeVehicle: string;
  onVehicleChange: (vehicleId: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSOSPress, onPostJob, onServicePress, activeVehicle, onVehicleChange }) => {
  const user = useUserLocation();
  const featured = MOCK_GARAGES.map((g) => ({ ...g, distance: Number(distanceKm(user.coords, g.coords).toFixed(1)) })).sort(
    (a, b) => a.distance - b.distance
  )[0];

  return (
    <View style={styles.container}>
      <Header activeVehicle={activeVehicle} onVehicleChange={onVehicleChange} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* SOS Banner */}
        <Pressable style={[styles.banner, styles.sosBanner]} onPress={onSOSPress}>
          <Gradient stops={GRADIENTS.sos} />
          <View style={styles.sosLeft}>
            <View style={styles.sosBadge}>
              <Pulse style={styles.pulseDot} />
              <Text style={styles.badgeText}>24/7 මාවත් උදව්</Text>
            </View>
            <Text style={styles.sosTitle}>වාහනය අඩපණ වුණාද?</Text>
            <Text style={styles.sosDesc}>ක්ෂණිකව ළඟම ඇති යාන්ත්‍රිකයෙකු වෙත දන්වන්න.</Text>
          </View>
          <Pressable style={styles.sosSquareBtn} onPress={onSOSPress}>
            <Text style={styles.sosBtnEmoji}>🚨</Text>
            <Text style={styles.sosBtnText}>SOS</Text>
          </Pressable>
        </Pressable>

        {/* Problem Card */}
        <Pressable
          style={[styles.banner, styles.issueBanner]}
          onPress={() => onPostJob(true)}
        >
          <Gradient stops={GRADIENTS.issue} />
          <View style={styles.flex1}>
            <Text style={styles.issueTitle}>ඔබගේ ගැටළුව අපට කියන්න</Text>
            <Text style={styles.issueDesc}>වාහනයේ දෝෂය සටහන් කර විශේෂඥ උපදෙස් සහ ඇස්තමේන්තු ලබා ගන්න.</Text>
          </View>
          <View style={styles.issueIconBox}>
            <Svg width={22} height={22} viewBox="0 0 24 24">
              <Path
                d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z"
                fill="#ffffff"
              />
            </Svg>
          </View>
        </Pressable>

        {/* Post Repair Bid Card */}
        <View style={styles.bidCard}>
          <Gradient stops={GRADIENTS.bid} />
          <View>
            <Text style={styles.bidTitle}>අලුත්වැඩියා ලංසුවක් (Bid) පළ කරන්න</Text>
            <Text style={styles.bidDesc}>
              ඔබේ වාහන දෝෂය සටහන් කර පිළිගත් ගරාජ කිහිපයකින් තරගකාරී මිල ගණන් ලබා ගන්න.
            </Text>
          </View>
          <Pressable style={styles.bidBtn} onPress={() => onPostJob(false)}>
            <Gradient stops={GRADIENTS.cta} />
            <Text style={styles.bidBtnText}>＋</Text>
            <Text style={styles.bidBtnText}>නව අලුත්වැඩියා ඉල්ලීමක් කරන්න</Text>
          </Pressable>
        </View>

        {/* Services */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>වාහන සේවා අංශ (Categories)</Text>
          <Pressable onPress={() => Alert.alert('සියලු සේවා')}>
            <Text style={styles.viewAllLink}>සියල්ල බලන්න</Text>
          </Pressable>
        </View>

        <View style={styles.servicesGrid}>
          {SERVICE_CATEGORIES.map((service) => (
            <ServiceCard
              key={service.id}
              icon={service.icon}
              name={service.name}
              iconColor={service.color}
              onPress={() => onServicePress(service)}
            />
          ))}
        </View>

        {/* Garages Near You */}
        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <Text style={styles.sectionLabel}>ඔබට ආසන්න ගරාජයන්</Text>
          <Text style={styles.listLabel}>ප්‍රධාන ලැයිස්තුව</Text>
        </View>

        <GarageCard
          garage={featured}
          variant="home"
          thumbColor="#10b981"
          onCall={() => Alert.alert(`ඇමතුමක් ලබා දෙයි: ${featured.phone}`)}
          onDirections={() => Linking.openURL(directionsUrl(featured.coords, user.coords))}
          onBook={() => Alert.alert('බුක් කිරීමේ පෝරමය විවෘත විය!')}
        />
      </ScrollView>
    </View>
  );
};

const styles = themedStyles(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBody },
  scroll: { flex: 1 },
  content: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 90, gap: 16 },
  flex1: { flex: 1 },
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sosBanner: {
    backgroundColor: '#dc2626',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 8,
  },
  sosLeft: { flex: 1, gap: 4 },
  sosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
  },
  pulseDot: { width: 6, height: 6, backgroundColor: '#fff', borderRadius: 3 },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  sosTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: '#fff', lineHeight: 20 },
  sosDesc: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: '#fee2e2', lineHeight: 14.3 },
  sosSquareBtn: {
    width: 52,
    height: 52,
    backgroundColor: '#fff',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  sosBtnEmoji: { fontSize: 16 },
  sosBtnText: { fontSize: 9.5, fontWeight: '900', color: '#dc2626', letterSpacing: 0.5 },
  issueBanner: {
    backgroundColor: '#0ea5e9',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
  issueTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: '#fff', marginBottom: 3 },
  issueDesc: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: '#e0f2fe', lineHeight: 14.85 },
  issueIconBox: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: 'rgba(255, 255, 255, 0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  issueIcon: { fontSize: 22 },
  bidCard: {
    backgroundColor: '#1e3a8a',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    overflow: 'hidden',
  },
  bidTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: '#fff' },
  bidDesc: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: '#cbd5e1', lineHeight: 16.1 },
  bidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bidBtnText: { fontSize: 12.5, fontWeight: '800', color: '#fff' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  viewAllLink: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  listLabel: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
}));
