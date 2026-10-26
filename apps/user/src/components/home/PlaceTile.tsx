import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, directionsUrl, effectiveState, effectiveStock, FONTS, freePlugs, getThemeMode, minutesAgo, themedStyles, type ChargerState, type Place } from '@ongarage/shared';
import { usePlaceCommunity } from '../../context/PlaceCommunityContext';
import { cardGlow, outline } from '../../utils/material';
import { AMENITY_ICON, AMENITY_LABEL, BRAND_BADGE } from '../../constants/places';

const STOCK_TEXT = { available: 'ඇත', low: 'අඩුයි', out: 'අවසන්' } as const;
const QUEUE_TEXT = { none: 'නැහැ', short: 'කෙටියි', long: 'දිගයි' } as const;
const STATE_COLOR: Record<ChargerState, string> = { free: '#16a34a', busy: '#f59e0b', offline: '#dc2626' };

/** A row of small dots, one per physical plug, coloured by its state (green free, amber in use, red out of order). */
export const PlugDots: React.FC<{ states: ChargerState[] }> = ({ states }) => (
  <View style={styles.dots}>
    {states.map((s, i) => (
      <View key={i} style={[styles.dot, { backgroundColor: STATE_COLOR[s] }]} />
    ))}
  </View>
);

/**
 * A fuel station or an EV charging point in the list (service mode 'place'): its brand badge, name, distance and whether it is open; for a station each fuel with its
 * price per litre and how much is left, for a charger each connector with its power, price per kWh and a dot per plug; the facilities; and two actions only: the
 * way there (Google Maps) and a call. Touching the card opens its details. Nothing here is bid for or booked.
 */
export const PlaceTile: React.FC<{ place: Place; distance: number; from?: { latitude: number; longitude: number }; picked?: boolean; onPress?: () => void }> = ({ place: p, distance, from, picked, onPress }) => {
  const badge = BRAND_BADGE[p.brand] ?? { color: '#64748b', mark: p.brand.slice(0, 3).toUpperCase() };
  // What other owners have reported (fresh reports win over the listed stock), their ratings and the queue.
  const community = usePlaceCommunity();
  const rate = community.rating(p.id);
  const queue = community.queueOf(p.id);
  const now = Date.now();
  return (
    <Pressable style={[styles.tile, picked && styles.tilePicked]} onPress={onPress} accessibilityLabel={`Place ${p.name}`}>
      <View style={styles.top}>
        <View style={[styles.badge, { backgroundColor: badge.color }]}>
          <Text style={styles.badgeText}>{badge.mark}</Text>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.name} numberOfLines={1}>
            {p.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {p.address} · කි.මී. {distance}
          </Text>
        </View>
        <View style={[styles.state, p.open ? styles.stateOpen : styles.stateClosed]}>
          <View style={[styles.stateDot, p.open ? styles.dotOpen : styles.dotClosed]} />
          <Text style={[styles.stateText, p.open ? styles.textOpen : styles.textClosed]}>{p.open ? (p.open24 ? '24/7' : 'විවෘත') : 'වසා ඇත'}</Text>
        </View>
      </View>

      {!!p.hours && <Text style={styles.hours}>🕒 {p.hours}</Text>}
      {(rate.count > 0 || !!queue) && (
        <Text style={styles.hours}>
          {rate.count > 0 ? `★ ${rate.avg} (${rate.count})` : ''}
          {rate.count > 0 && queue ? ' · ' : ''}
          {queue ? `👥 පෝලිම: ${QUEUE_TEXT[queue.value]} · මිනි. ${minutesAgo(queue.latestAt, now)}කට පෙර` : ''}
        </Text>
      )}

      {/* Fuel stations: each fuel with its price per litre and what is left (the thing an owner needs to know before driving there). */}
      {!!p.fuels && (
        <View style={styles.chips}>
          {p.fuels.map((f) => {
            const crowd = community.stockOf(p.id, f.name);
            const stock = effectiveStock(f.stock, crowd);
            return (
              <View key={f.name} style={[styles.chip, stock === 'out' && styles.chipOut, stock === 'low' && styles.chipLow]}>
                <Text style={[styles.chipText, stock === 'out' && styles.chipTextOut, stock === 'low' && styles.chipTextLow]}>
                  {f.name} · රු. {f.price} · {STOCK_TEXT[stock]}
                  {crowd ? (crowd.byOwner ? ' ✔' : ` 👥${crowd.count}`) : ''}
                </Text>
              </View>
            );
          })}
        </View>
      )}
      {/* Chargers: connector, power, price per kWh and one dot per plug. */}
      {!!p.connectors && (
        <View style={styles.connectors}>
          {p.connectors.map((raw) => {
            const crowd = community.chargerOf(p.id, raw.type);
            const c = { ...raw, states: raw.states.map((st) => effectiveState(st, crowd)) };
            return (
              <View key={c.type + c.kw} style={styles.connRow}>
                <Text style={styles.connText} numberOfLines={1}>
                  {c.type} · {c.kw} kW · රු. {c.price}/kWh{crowd && !crowd.value ? ' · 👥 නරකයි' : ''}
                </Text>
                <PlugDots states={c.states} />
                <Text style={[styles.connFree, freePlugs(c) === 0 && styles.connFreeNone]}>{freePlugs(c)}/{c.states.length}</Text>
              </View>
            );
          })}
        </View>
      )}

      {p.amenities.length > 0 && (
        <View style={styles.amenities}>
          {p.amenities.map((a) => (
            <Text key={a} style={styles.amenity}>
              {AMENITY_ICON[a]} {AMENITY_LABEL[a]}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <Pressable style={[styles.action, styles.actionMain]} onPress={() => Linking.openURL(directionsUrl(p.coords, from))} accessibilityLabel={`Directions to ${p.name}`}>
          <Text style={styles.actionMainText}>🧭 මාර්ගය බලන්න</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={() => Linking.openURL(`tel:${p.phone.replace(/\s/g, '')}`)} accessibilityLabel={`Call ${p.name}`}>
          <Text style={styles.actionText}>📞 අමතන්න</Text>
        </Pressable>
      </View>
    </Pressable>
  );
};

const dark = () => getThemeMode() === 'dark';

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    tile: { padding: 14, borderRadius: 14, gap: 10, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...cardGlow() },
    tilePicked: { borderColor: '#1a73e8', borderWidth: 2 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    badge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    badgeText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: '#ffffff', letterSpacing: 0.3 },
    name: { fontSize: 14.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    meta: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    state: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 11 },
    stateOpen: { backgroundColor: dark() ? 'rgba(129, 201, 149, 0.18)' : '#e6f4ea' },
    stateClosed: { backgroundColor: dark() ? 'rgba(239, 68, 68, 0.16)' : '#fde8e8' },
    stateDot: { width: 7, height: 7, borderRadius: 4 },
    dotOpen: { backgroundColor: '#16a34a' },
    dotClosed: { backgroundColor: '#dc2626' },
    stateText: { fontSize: 11, fontFamily: FONTS.bodyBold },
    textOpen: { color: dark() ? '#81c995' : '#137333' },
    textClosed: { color: dark() ? '#f28b82' : '#b3261e' },
    hours: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: dark() ? 'rgba(129, 201, 149, 0.14)' : '#e6f4ea' },
    chipLow: { backgroundColor: dark() ? 'rgba(251, 188, 4, 0.16)' : '#fef7e0' },
    chipOut: { backgroundColor: dark() ? 'rgba(239, 68, 68, 0.14)' : '#fde8e8' },
    chipText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: dark() ? '#81c995' : '#137333' },
    chipTextLow: { color: dark() ? '#fdd663' : '#b06000' },
    chipTextOut: { color: dark() ? '#f28b82' : '#b3261e' },
    connectors: { gap: 6 },
    connRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.06)' : '#f1f4f9' },
    connText: { flex: 1, fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    connFree: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: '#16a34a', minWidth: 26, textAlign: 'right' },
    connFreeNone: { color: '#dc2626' },
    dots: { flexDirection: 'row', gap: 4 },
    dot: { width: 9, height: 9, borderRadius: 5 },
    amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    amenity: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    actions: { flexDirection: 'row', gap: 8 },
    action: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.08)' : '#eef2f7' },
    actionMain: { backgroundColor: '#1a73e8' },
    actionText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    actionMainText: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  })
);
