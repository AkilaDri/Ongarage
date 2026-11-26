import { elevation1, outline } from '../../utils/material';
import React, { useEffect } from 'react';
import { markShopHintSeen, toggleSavedShop, useSavedShops } from '../../utils/savedShops';
import { useNotice } from '../../context/NoticeContext';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, Gradient, money, themedStyles, softEdge, softShadow, type ShopListing } from '@ongarage/shared';

// Cover colours for shops (a photo per shop replaces these later); chosen from the shop's id so a shop keeps its colour.
const COVERS: { offset: string; color: string }[][] = [
  [{ offset: '0', color: '#1e3a8a' }, { offset: '1', color: '#2a4690' }],
  [{ offset: '0', color: '#0ea5e9' }, { offset: '1', color: '#22d3ee' }],
  [{ offset: '0', color: '#f97316' }, { offset: '1', color: '#f59e0b' }],
  [{ offset: '0', color: '#10b981' }, { offset: '1', color: '#84cc16' }],
  [{ offset: '0', color: '#8b5cf6' }, { offset: '1', color: '#d946ef' }],
  [{ offset: '0', color: '#ef4444' }, { offset: '1', color: '#f43f5e' }],
];
const coverFor = (id: string) => COVERS[(Number(id.replace(/\D/g, '')) || 0) % COVERS.length];

/** A shop as a card with a coloured cover: its name, rating, distance, how fast it replies, and what it offers. */
export const ShopTile: React.FC<{ shop: ShopListing; ad?: boolean; tagline?: string; freeDeliveryOver?: number; /** The owner's own fact about this shop (the last part bought there). */ note?: string; /** This card may carry the one-time tip about the heart. */ hint?: boolean; onPress: () => void }> = ({ shop, ad, tagline, freeDeliveryOver, note, hint, onPress }) => {
  const saves = useSavedShops();
  const { notify } = useNotice();
  const saved = saves.ids.includes(shop.id);
  const showHint = !!hint && !saves.hintSeen;
  // The tip stays a few seconds, once, then never again.
  useEffect(() => {
    if (!showHint) return;
    const id = setTimeout(markShopHintSeen, 9000);
    return () => clearTimeout(id);
  }, [showHint]);
  const toggle = () => {
    const now = toggleSavedShop(shop.id);
    notify({ icon: now ? '♥' : '♡', title: now ? 'සුරැකි වෙළඳසැල් වලට එක් කළා' : 'සුරැකි ලැයිස්තුවෙන් ඉවත් කළා', body: shop.name, tone: 'primary' });
  };
  return (
  <Pressable style={({ pressed }) => [styles.tile, pressed && styles.pressed]} onPress={onPress} accessibilityLabel={`Shop tile ${shop.name}`}>
    <View style={styles.cover}>
      <Gradient stops={coverFor(shop.id)} />
      <Text style={styles.watermark}>🏪</Text>
      <Text style={styles.initials}>{shop.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()}</Text>
      {ad && (
        <View style={styles.adPill}>
          <Text style={styles.adText}>දැන්වීම</Text>
        </View>
      )}
      <View style={[styles.state, !shop.isOpen && styles.stateClosed]}>
        <Text style={styles.stateText}>{shop.isOpen ? '● විවෘතයි' : '● වසා ඇත'}</Text>
      </View>
      <Pressable style={styles.heart} onPress={toggle} hitSlop={7} accessibilityLabel={`${saved ? 'Unsave' : 'Save'} ${shop.name}`} accessibilityState={{ checked: saved }}>
        <Text style={[styles.heartText, saved && styles.heartOn]}>{saved ? '♥' : '♡'}</Text>
      </Pressable>
      {showHint && (
        <View style={styles.hintBubble} pointerEvents="none">
          <Text style={styles.hintText}>♡ වෙළඳසැල් සුරකින්න</Text>
        </View>
      )}
    </View>
    <View style={styles.body}>
      <Text style={styles.name} numberOfLines={1}>
        {shop.name}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        ★ {shop.rating.toFixed(1)} ({shop.ratingCount}) · {shop.distanceKm < 10 ? shop.distanceKm.toFixed(1) : Math.round(shop.distanceKm)} km · ⏱ {shop.stats.avgResponseMin}මි.
      </Text>
      {!!note && (
        <Text style={styles.note} numberOfLines={1}>
          {note}
        </Text>
      )}
      <View style={styles.chips}>
        {shop.liveStock && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>සජීවී තොගය</Text>
          </View>
        )}
        {freeDeliveryOver !== undefined && (
          <View style={[styles.chip, styles.chipOffer]}>
            <Text style={[styles.chipText, { color: Colors.warning }]} numberOfLines={1}>
              🚚 {money(freeDeliveryOver)}+ නොමිලේ
            </Text>
          </View>
        )}
        {!shop.liveStock && freeDeliveryOver === undefined && !!tagline && (
          <View style={styles.chip}>
            <Text style={styles.chipText} numberOfLines={1}>
              {tagline}
            </Text>
          </View>
        )}
      </View>
    </View>
  </Pressable>
  );
};

/** A titled row of shop cards that scrolls sideways; `ad` marks a paid row. */
export const ShopRow: React.FC<{
  title: string;
  shops: ShopListing[];
  info: Record<string, { tagline?: string; freeDeliveryOver?: number }>;
  ad?: boolean;
  onOpen: (shop: ShopListing) => void;
  onSeeAll?: () => void;
  /** Ways to order this row, one chosen. */
  choices?: { id: string; label: string }[];
  choice?: string;
  onChoice?: (id: string) => void;
  /** The owner's own fact for a shop, by shop id. */
  notes?: Record<string, string>;
  hint?: boolean;
}> = ({ title, shops, info, ad, onOpen, onSeeAll, choices, choice, onChoice, notes, hint }) => {
  if (shops.length === 0) return null;
  return (
    <View style={styles.row}>
      {/* As on Home: the whole title is the "see all" button, with its arrow beside it, so nothing tappable sits where the OnChat button floats. */}
      <Pressable style={styles.head} onPress={onSeeAll} disabled={!onSeeAll} hitSlop={8} accessibilityRole={onSeeAll ? 'button' : 'header'} accessibilityLabel={onSeeAll ? `See all ${title}` : title}>
        <Text style={styles.title}>{title}</Text>
        {ad && (
          <View style={styles.rowAd}>
            <Text style={styles.rowAdText}>දැන්වීම</Text>
          </View>
        )}
        {!!onSeeAll && <Text style={styles.seeAll}>›</Text>}
      </Pressable>
      {!!choices && (
        <View style={styles.choices}>
          {choices.map((c) => {
            const on = c.id === choice;
            return (
              <Pressable key={c.id} style={[styles.choice, on && styles.choiceOn]} onPress={() => onChoice?.(c.id)} hitSlop={6} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={c.label}>
                <Text style={[styles.choiceText, on && styles.choiceTextOn]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {shops.map((s, i) => (
          <ShopTile key={s.id} shop={s} note={notes?.[s.id]} hint={hint && i === 0} ad={ad} tagline={info[s.id]?.tagline} freeDeliveryOver={info[s.id]?.freeDeliveryOver} onPress={() => onOpen(s)} />
        ))}
      </ScrollView>
    </View>
  );
};

// White text sits on the fixed-colour covers (the intended exception to theme colours).
const styles = themedStyles(() =>
  StyleSheet.create({
    row: { gap: 10 },
    head: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, minHeight: 32 },
    title: { flexShrink: 1, fontSize: 16, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    rowAd: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(245, 158, 11, 0.18)' },
    rowAdText: { fontSize: 9.5, fontWeight: '800', color: Colors.warning },
    seeAll: { fontSize: 22, lineHeight: 26, fontFamily: FONTS.bodyBold, color: Colors.primary },
    scroll: { gap: 12, paddingRight: 8, paddingBottom: 4 },
    tile: { width: 224, borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
    cover: { height: 92, justifyContent: 'flex-end', padding: 10 },
    watermark: { position: 'absolute', right: -6, top: -4, fontSize: 70, opacity: 0.22 },
    initials: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 1 },
    adPill: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(255, 255, 255, 0.88)' },
    adText: { fontSize: 9, fontWeight: '800', color: '#0f172a' },
    heart: { position: 'absolute', right: 8, top: 8, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)' },
    heartText: { fontSize: 18, color: '#6b7280' },
    heartOn: { color: '#e5283c' },
    hintBubble: { position: 'absolute', right: 8, top: 54, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: '#0f172a' },
    hintText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: '#ffffff' },
    note: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    // Home's row choices.
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choice: { height: 32, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.subtleFill },
    choiceOn: { backgroundColor: '#1e3a8a' },
    choiceText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    choiceTextOn: { color: '#ffffff' },
    // The open / closed tag sits at the cover's foot, clear of the heart.
    state: { position: 'absolute', bottom: 8, right: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(16, 185, 129, 0.9)' },
    stateClosed: { backgroundColor: 'rgba(15, 23, 42, 0.6)' },
    stateText: { fontSize: 9, fontFamily: FONTS.bodyBold, color: '#fff' },
    body: { padding: 12, gap: 4 },
    name: { fontSize: 14.5, lineHeight: 19, fontFamily: FONTS.titleBold, color: Colors.textMain },
    meta: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, minHeight: 20 },
    chip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(2, 132, 199, 0.1)' },
    chipOffer: { backgroundColor: 'rgba(245, 158, 11, 0.14)' },
    chipText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  })
);
