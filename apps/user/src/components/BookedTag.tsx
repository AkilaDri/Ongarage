import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONTS, getThemeMode, themedStyles } from '@ongarage/shared';
import { useBookings } from '../context/BookingsContext';
import type { DirectBooking } from '../types';

/** The booking of this garage that is still going on (asked, answered with another time, or confirmed), the latest first. */
export const useActiveBooking = (garageId: string | undefined): DirectBooking | undefined => {
  const { bookings } = useBookings();
  if (!garageId) return undefined;
  return bookings
    .filter((b) => b.garage.id === garageId && (b.status === 'requested' || b.status === 'proposed' || b.status === 'confirmed'))
    .sort((a, b) => b.requestedAt - a.requestedAt)[0];
};

const TEXT = {
  requested: { label: '📨 වෙන් කළා · පිළිතුරු බලයි', tone: 'wait' },
  proposed: { label: '🕒 වෙන් කළා · වෙනත් වේලාවක්', tone: 'wait' },
  confirmed: { label: '✓ වෙන් කළා · තහවුරුයි', tone: 'ok' },
} as const;

/**
 * A tag that says the owner has booked this garage (and where the booking stands), for the garage's card and its profile. It shows nothing when there is no
 * booking going on with that garage.
 */
export const BookedTag: React.FC<{ garageId: string | undefined; style?: object }> = ({ garageId, style }) => {
  const b = useActiveBooking(garageId);
  if (!b || (b.status !== 'requested' && b.status !== 'proposed' && b.status !== 'confirmed')) return null;
  const t = TEXT[b.status];
  return (
    <View style={[styles.tag, t.tone === 'ok' ? styles.ok : styles.wait, style]} accessibilityLabel="Booked">
      <Text style={[styles.text, t.tone === 'ok' ? styles.okText : styles.waitText]} numberOfLines={1}>
        {t.label}
      </Text>
    </View>
  );
};

const dark = () => getThemeMode() === 'dark';

const styles = themedStyles(() =>
  StyleSheet.create({
    tag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    ok: { backgroundColor: dark() ? 'rgba(129, 201, 149, 0.2)' : '#e6f4ea' },
    wait: { backgroundColor: dark() ? 'rgba(251, 188, 4, 0.18)' : '#fef7e0' },
    text: { fontSize: 11.5, fontFamily: FONTS.bodyBold },
    okText: { color: dark() ? '#81c995' : '#137333' },
    waitText: { color: dark() ? '#fdd663' : '#b06000' },
  })
);
