import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONTS, getThemeMode, themedStyles } from '@ongarage/shared';
import { useUserLocation } from '../../context/LocationContext';
import { HEADER_BAND_H } from '../Header';
import WeatherAnimation, { periodOf, skyInk, useHour } from '../WeatherAnimation';

/**
 * OnMart's top band, in the owner Home's style: a round shop badge, the marketplace name with where the owner is,
 * with no vehicle picker (the other tabs have none either; parts are matched to the active vehicle chosen on Home).
 */
export const MartHeader: React.FC = () => {
  const { locality } = useUserLocation();

  const hour = useHour();
  const ink = skyInk(periodOf(hour));

  return (
    <View style={styles.header}>
      <WeatherAnimation hour={hour} />
      <View style={styles.left}>
        <View style={styles.badge}>
          <Text style={styles.badgeEmoji}>🛍️</Text>
        </View>
        <View style={styles.texts}>
          <Text style={[styles.title, { color: ink.main }]} numberOfLines={1}>
            OnMart
          </Text>
          <Text style={[styles.sub, { color: ink.sub }]} numberOfLines={1}>
            📍 {locality}
          </Text>
        </View>
      </View>

    </View>
  );
};

const dark = () => getThemeMode() === 'dark';

const styles = themedStyles(() =>
  StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 34, minHeight: HEADER_BAND_H, overflow: 'hidden', backgroundColor: dark() ? '#0e2a3f' : '#bfe4fa' },
    left: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
    badge: { width: 44, height: 44, borderRadius: 22, backgroundColor: dark() ? '#16415f' : '#ffffff', alignItems: 'center', justifyContent: 'center' },
    badgeEmoji: { fontSize: 22 },
    texts: { flexShrink: 1, gap: 1 },
    title: { fontSize: 18, fontFamily: FONTS.titleBold, color: dark() ? '#d6eefc' : '#0f2a3d' },
    sub: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: dark() ? '#8fc3e3' : '#2b4a63' },
  })
);
