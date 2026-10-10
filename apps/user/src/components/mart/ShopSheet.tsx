import React from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, FONTS, categoryInfo, directionsUrl, getThemeMode, GoogleMap, martDeals, MART_STOCK, money, shopServiceScore, themedStyles, type ShopListing } from '@ongarage/shared';
import { GARAGE_COVERS } from '../../constants/home';
import { useUserLocation } from '../../context/LocationContext';
import { Sheet } from '../Sheet';

const AVATAR_COLORS = ['#2457e6', '#0e9f6e', '#e5483d', '#8b5cf6', '#f59e0b', '#0891b2', '#db2777'];
const hash = (id: string) => [...id].reduce((n, ch) => n + ch.charCodeAt(0), 0);
const initialsOf = (name: string) => (name.match(/[A-Za-z0-9]+/g) ?? [name]).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '🔩';

type Tab = 'menu' | 'info';

/** The part categories of OnMart's filter bar, with the words that put a stock line in each (and the look of its tile). */
const CATEGORIES: { id: string; emoji: string; name: string; tint: string; match: RegExp }[] = [
  { id: 'brakes', emoji: '🛑', name: 'බ්‍රේක්', tint: '#fde2e0', match: /brake|pad|disc|rotor|caliper/i },
  { id: 'battery', emoji: '🔋', name: 'බැටරි', tint: '#dff5e6', match: /batter/i },
  { id: 'oil', emoji: '🛢️', name: 'ඔයිල් / ෆිල්ටර්', tint: '#fdf0d2', match: /oil|filter|lubric|coolant|fluid/i },
  { id: 'electrical', emoji: '⚡', name: 'විදුලි', tint: '#fff2c6', match: /alternator|starter|plug|sensor|ignition|coil|wiring|fuse|relay/i },
  { id: 'ac', emoji: '❄️', name: 'A/C', tint: '#dff0fb', match: /\bac\b|a\/c|compressor|condenser|refrigerant|cabin|blower/i },
  { id: 'engine', emoji: '🔧', name: 'එන්ජින්', tint: '#e8e4f7', match: /timing|belt|piston|gasket|engine|clutch|gear|cam|turbo|radiator|hose|pump|chain/i },
  { id: 'suspension', emoji: '🚙', name: 'සස්පෙන්ෂන්', tint: '#e6ecf3', match: /shock|spring|suspension|arm|bush|strut|link|ball joint/i },
  { id: 'lights', emoji: '💡', name: 'ලයිට්', tint: '#fff7d6', match: /light|lamp|bulb|headlight|tail/i },
  { id: 'hybrid', emoji: '🔋', name: 'හයිබ්‍රිඩ්', tint: '#d9f3ea', match: /hybrid|inverter|ima\b/i },
];
const OTHER = { id: 'other', emoji: '🔩', name: 'වෙනත්', tint: '#e8eef6' };
const categoryOf = (name: string) => CATEGORIES.find((c) => c.match.test(name)) ?? OTHER;

/**
 * One parts shop, laid out like a food-delivery restaurant page: a cover photo with close / save buttons, a shop card on top of
 * it (logo, name, rating, how it delivers), then a "menu" of parts - category chips and a list of items with a photo tile and
 * a + button - and a bar at the bottom that collects what you picked into one request to the shop.
 */
export const ShopSheet: React.FC<{ shop: ShopListing | null; onClose: () => void; onAsk: (shop: ShopListing) => void }> = ({ shop, onClose, onAsk }) => {
  const [shown, setShown] = React.useState<ShopListing | null>(shop);
  const tab: Tab = 'menu';
  const [partQuery, setPartQuery] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const [showInfo, setShowInfo] = React.useState(false);
  // What the owner has picked from this shop, to ask about in one request: stock line -> how many.
  const [picked, setPicked] = React.useState<Record<string, number>>({});
  const user = useUserLocation();
  React.useEffect(() => {
    if (shop) setShown(shop);
  }, [shop]);
  const shopId = shop?.id;
  React.useEffect(() => {
    setPartQuery('');
    setCategory('');
    setSaved(false);
    setShowInfo(false);
    setPicked({});
  }, [shopId]);
  if (!shown) return null;
  const s = shown;

  const stock = (MART_STOCK[s.id] ?? []).filter((l) => l.qty > 0);
  const keyOf = (l: { name: string; partType: string }) => `${l.name}|${l.partType}`;
  const pq = partQuery.trim().toLowerCase();
  const present = CATEGORIES.map((c) => ({ ...c, count: stock.filter((l) => categoryOf(l.name).id === c.id).length })).filter((c) => c.count > 0);
  const matching = stock
    .filter((l) => !category || categoryOf(l.name).id === category)
    .filter((l) => !pq || `${l.name} ${l.partType} ${l.brand ?? ''}`.toLowerCase().includes(pq));
  // The menu is shown section by section, one heading per category.
  const sections = [...CATEGORIES, OTHER]
    .map((c) => ({ ...c, items: matching.filter((l) => categoryOf(l.name).id === c.id) }))
    .filter((c) => c.items.length > 0);
  const pickedCount = Object.values(picked).reduce((n, q) => n + q, 0);
  const pickedTotal = stock.reduce((sum, l) => sum + (picked[keyOf(l)] ?? 0) * l.price, 0);
  const change = (key: string, by: number, max: number) =>
    setPicked((cur) => {
      const next = Math.max(0, Math.min(max, (cur[key] ?? 0) + by));
      const { [key]: _drop, ...rest } = cur;
      return next ? { ...rest, [key]: next } : rest;
    });

  const delivery = [s.courier && '🛵 PickMe Flash', s.ownDelivery && '🚚 වෙළඳසැලේ රියදුරු', s.counterPickup && '🏪 කවුන්ටරයෙන් එකතු කිරීම'].filter(Boolean) as string[];
  const deals = martDeals(Date.now()).filter((d) => d.shopId === s.id);
  const daysLeft = (t: number) => Math.max(1, Math.ceil((t - Date.now()) / 86400000));
  const covers = Object.values(GARAGE_COVERS);
  const cover = covers[hash(s.id + s.name) % covers.length];
  const color = AVATAR_COLORS[hash(s.id) % AVATAR_COLORS.length];
  const badges = [
    s.liveStock && '📡 සජීවී තොගය',
    s.stats.avgResponseMin <= 15 && '⚡ ඉක්මන් පිළිතුර',
    s.rating >= 4.7 && '🏅 ඉහළම ශ්‍රේණිගත',
    s.stats.ordersDone >= 50 && `🛍️ ඇණවුම් ${s.stats.ordersDone}+`,
  ].filter(Boolean) as string[];

  const hero = (
    <View>
      <View style={styles.coverWrap}>
        <Image source={cover} style={styles.cover} resizeMode="cover" />
        <View style={styles.coverShade} />
        <Pressable style={[styles.roundBtn, { left: 14 }]} onPress={onClose} hitSlop={8} accessibilityLabel="Close sheet">
          <Text style={styles.roundBtnText}>✕</Text>
        </Pressable>
        <Pressable style={[styles.roundBtn, { right: 14 }]} onPress={() => setSaved((v) => !v)} hitSlop={8} accessibilityLabel="Save shop">
          <Text style={[styles.roundBtnText, saved && { color: '#ff5a6e' }]}>{saved ? '♥' : '♡'}</Text>
        </Pressable>
      </View>
      <Pressable style={styles.shopCard} onPress={() => setShowInfo(true)} accessibilityLabel="Open shop profile">
        <View style={styles.shopTop}>
          <View style={[styles.logo, { backgroundColor: color }]}>
            <Text style={styles.logoText}>{initialsOf(s.name)}</Text>
          </View>
          <View style={styles.flex1}>
            <Text style={styles.name} numberOfLines={2}>
              {s.name}
            </Text>
            <Text style={styles.cuisine} numberOfLines={1}>
              {s.categories.slice(0, 3).map((c) => categoryInfo(c).name).join(' · ')}
            </Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaStrong}>★ {s.rating.toFixed(1)}</Text>
          <Text style={styles.meta}>({s.ratingCount})</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.meta}>📍 {s.distanceKm < 10 ? s.distanceKm.toFixed(1) : Math.round(s.distanceKm)} km</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={[styles.meta, { color: s.isOpen ? Colors.success : Colors.textMuted, fontFamily: FONTS.bodyBold }]}>{s.isOpen ? 'දැන් විවෘතයි' : 'වසා ඇත'}</Text>
          <Text style={styles.moreLink}>වෙළඳසැල විස්තර ›</Text>
        </View>
      </Pressable>
    </View>
  );

  return (
    <>
    <Sheet
      visible={!!shop}
      title={s.name}
      subtitle={`${s.district} · ${s.address}`}
      onClose={onClose}
      hero={hero}
      footer={
        pickedCount > 0 ? (
          <Pressable style={styles.cartBar} onPress={() => onAsk(s)} accessibilityLabel="Ask the shop about the picked parts">
            <View style={styles.cartCount}>
              <Text style={styles.cartCountText}>{pickedCount}</Text>
            </View>
            <Text style={styles.cartLabel}>ඉල්ලීම් ලැයිස්තුව · මෙම වෙළඳසැලෙන් අසන්න</Text>
            <Text style={styles.cartTotal}>~{money(pickedTotal)}</Text>
          </Pressable>
        ) : (
          <ActionButton label="මෙම වෙළඳසැලෙන් කොටසක් ඉල්ලන්න" icon="📨" variant="primary" onPress={() => onAsk(s)} />
        )
      }
    >
      <View style={styles.quickWrap}>
        <View style={styles.quickRow}>
          {[
            { id: 'call', icon: '📞', label: 'අමතන්න', tone: '#0e9f6e', onPress: () => Linking.openURL(`tel:${s.phone.replace(/\s/g, '')}`) },
            { id: 'route', icon: '🧭', label: 'මාර්ගය', tone: '#2457e6', onPress: () => Linking.openURL(directionsUrl(s.coords, user.coords)) },
            { id: 'ask', icon: '💬', label: 'අසන්න', tone: '#8b5cf6', onPress: () => onAsk(s) },
          ].map((q) => (
            <Pressable key={q.id} style={[styles.quick, { backgroundColor: q.tone + '1f', borderColor: q.tone + '40' }]} onPress={q.onPress} accessibilityLabel={`Shop ${q.id}`}>
              <View style={[styles.quickIcon, { backgroundColor: q.tone }]}>
                <Text style={styles.quickEmoji}>{q.icon}</Text>
              </View>
              <Text style={[styles.quickLabel, { color: q.tone }]}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

      </View>

      <View style={styles.stockHead}>
        <Text style={styles.stockTitle}>🔩 තොගය</Text>
        <Text style={styles.stockCount}>{stock.length} කොටස්</Text>
      </View>
      {(
        <>
          {deals.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dealRow}>
              {deals.map((d) => (
                <View key={d.id} style={styles.deal}>
                  <Text style={styles.dealPct}>−{d.discountPercent}%</Text>
                  <View style={styles.flex1}>
                    <Text style={styles.dealName} numberOfLines={1}>
                      {d.partName}
                    </Text>
                    <Text style={styles.dealEnds}>තව දින {daysLeft(d.endsAt)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {s.liveStock ? (
            <>
              <TextInput
                style={styles.search}
                value={partQuery}
                onChangeText={setPartQuery}
                placeholder="🔍 මෙම වෙළඳසැලේ කොටසක් සොයන්න…"
                placeholderTextColor={Colors.textMuted}
                accessibilityLabel="Search this shop's parts"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <Pressable style={[styles.chip, !category && styles.chipOn]} onPress={() => setCategory('')} accessibilityLabel="Stock category all">
                  <Text style={[styles.chipText, !category && styles.chipTextOn]}>සියල්ල</Text>
                </Pressable>
                {present.map((c) => {
                  const on = category === c.id;
                  return (
                    <Pressable key={c.id} style={[styles.chip, on && styles.chipOn]} onPress={() => setCategory(on ? '' : c.id)} accessibilityLabel={`Stock category ${c.id}`}>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>
                        {c.emoji} {c.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {stock.length === 0 ? (
                <Text style={styles.sub}>දැනට තොග පෙන්වා නැත.</Text>
              ) : sections.length === 0 ? (
                <Text style={styles.sub}>මෙම වර්ගයේ / සෙවුමට ගැළපෙන කොටසක් නැත — වෙනත් වර්ගයක් තෝරන්න, නැතහොත් වෙළඳසැලෙන් අසන්න.</Text>
              ) : (
                sections.map((sec) => (
                  <View key={sec.id} style={styles.section}>
                    <Text style={styles.sectionHeading}>
                      {sec.emoji} {sec.name} <Text style={styles.sectionCount}>({sec.items.length})</Text>
                    </Text>
                    <View style={styles.grid}>
                      {sec.items.map((l) => {
                        const key = keyOf(l);
                        const qty = picked[key] ?? 0;
                        return (
                          <View key={key} style={[styles.item, qty > 0 && styles.itemOn]} accessibilityLabel={`Listing ${l.name}`}>
                            <View style={[styles.itemPhoto, { backgroundColor: sec.tint }]}>
                              <Text style={styles.itemIcon}>{sec.emoji}</Text>
                              {l.qty <= 2 && (
                                <View style={styles.lowTag}>
                                  <Text style={styles.lowTagText}>අවසන් {l.qty}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.itemName} numberOfLines={2}>
                              {l.name}
                            </Text>
                            <Text style={styles.itemMeta} numberOfLines={1}>
                              {l.partType}
                              {l.brand ? ` · ${l.brand}` : ''}
                            </Text>
                            <Text style={styles.itemPrice} numberOfLines={1}>
                              {money(l.price)}
                            </Text>
                            {qty === 0 ? (
                              <Pressable style={styles.addBtn} onPress={() => change(key, 1, l.qty)} accessibilityLabel={`Add ${l.name}`} hitSlop={4}>
                                <Text style={styles.addBtnText}>+ එක් කරන්න</Text>
                              </Pressable>
                            ) : (
                              <View style={styles.stepper}>
                                <Pressable onPress={() => change(key, -1, l.qty)} hitSlop={6} accessibilityLabel={`Remove ${l.name}`}>
                                  <Text style={styles.stepText}>−</Text>
                                </Pressable>
                                <Text style={styles.stepQty}>{qty}</Text>
                                <Pressable onPress={() => change(key, 1, l.qty)} hitSlop={6} accessibilityLabel={`Add more ${l.name}`}>
                                  <Text style={styles.stepText}>+</Text>
                                </Pressable>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}
            </>
          ) : (
            <View style={styles.infoList}>
              <Text style={styles.title}>තොගය</Text>
              <Text style={styles.sub}>මෙම වෙළඳසැල සජීවී තොගය පෙන්වන්නේ නැත — කොටසක් තිබේදැයි වෙළඳසැලෙන් අසන්න.</Text>
            </View>
          )}
        </>
      )}
    </Sheet>
    <Sheet visible={showInfo && !!shop} title={s.name} subtitle="වෙළඳසැල විස්තර" onClose={() => setShowInfo(false)}>
      {badges.length > 0 && (
        <View style={styles.badgeWrap}>
          {badges.map((b) => (
            <View key={b} style={styles.trustBadge}>
              <Text style={styles.trustBadgeText}>{b}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.quickWrap}>
        <Text style={styles.sectionTitle}>📍 වෙළඳසැල ඇති ස්ථානය</Text>
        <View style={styles.mapCard}>
          <View style={styles.mapBox}>
            <GoogleMap
              style={StyleSheet.absoluteFill}
              center={s.coords}
              zoom={15}
              renderOverlay={(project) => {
                const pt = project(s.coords);
                return pt ? (
                  <View style={[styles.mapPin, { left: pt.x, top: pt.y }]} pointerEvents="none">
                    <Text style={styles.mapPinEmoji}>📍</Text>
                  </View>
                ) : null;
              }}
            />
          </View>
          <View style={styles.mapFooter}>
            <View style={styles.flex1}>
              <Text style={styles.infoValue} numberOfLines={1}>
                {s.address}
              </Text>
            </View>
            <Pressable style={styles.dirBtn} onPress={() => Linking.openURL(directionsUrl(s.coords, user.coords))} accessibilityLabel="Directions to shop">
              <Text style={styles.dirBtnText}>🧭 මාර්ගය</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.infoList}>
        <Info icon="🕗" label="විවෘත වේලාවන්" value={s.openHours} />
        <Info icon="🧰" label="අලෙවි කරන වර්ග" value={s.types.join(' · ')} />
        <Info icon="🔧" label="කොටස් ඇති සේවා වර්ග" value={s.categories.map((c) => categoryInfo(c).name).join(' · ')} />
        <Info icon="✅" label="සේවා ලකුණු" value={`${shopServiceScore(s.stats).toFixed(1)} / 5 · ඇණවුම් ${s.stats.ordersDone}`} />
        <View style={styles.infoDivider} />
        <Text style={styles.sub}>🚚 ලබා ගැනීමේ ක්‍රම</Text>
        <View style={styles.badgeWrap}>
          {(delivery.length ? delivery : ['🏪 කවුන්ටරයෙන් එකතු කිරීම']).map((d) => (
            <View key={d} style={styles.deliveryChip}>
              <Text style={styles.deliveryChipText}>{d}</Text>
            </View>
          ))}
        </View>
      </View>

    </Sheet>
    </>
  );
};

const Info: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconBox}>
      <Text style={styles.infoIcon}>{icon}</Text>
    </View>
    <View style={styles.flex1}>
      <Text style={styles.sub}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const edge = () => (getThemeMode() === 'dark' ? Colors.borderColor : '#d6dce6');
const blue = () => (getThemeMode() === 'dark' ? '#8db1ff' : '#2457e6');

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    coverWrap: { height: 190, overflow: 'hidden', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
    cover: { width: '100%', height: '100%' },
    coverShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(6, 12, 30, 0.36)' },
    roundBtn: { position: 'absolute', top: 14, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.94)', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    roundBtnText: { fontSize: 16, fontWeight: '700', color: '#1b2a49' },
    shopCard: { marginHorizontal: 6, marginTop: -46, padding: 16, gap: 12, borderRadius: 28, backgroundColor: Colors.bgCard, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 10 },
    shopTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    logo: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 4 },
    logoText: { fontSize: 20, fontFamily: FONTS.titleBold, color: '#ffffff', letterSpacing: 0.5 },
    name: { fontSize: 21, fontFamily: FONTS.titleBold, color: Colors.textMain, letterSpacing: -0.2 },
    cuisine: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, marginTop: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingTop: 12, borderTopWidth: 1, borderTopColor: edge() },
    metaStrong: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.warning },
    meta: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    metaDot: { fontSize: 12, color: Colors.textMuted },
    quickWrap: { gap: 10 },
    tabs: { flexDirection: 'row', gap: 6, marginTop: 6 },
    tabBtn: { flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dbe4f3', backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff' },
    tabBtnOn: { backgroundColor: '#2457e6', borderColor: '#2457e6', shadowColor: '#2457e6', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    tabText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: blue() },
    tabTextOn: { color: '#ffffff' },
    dealRow: { gap: 10, paddingRight: 6 },
    deal: { width: 210, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 20, backgroundColor: '#f59e0b', shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
    dealPct: { fontSize: 20, fontFamily: FONTS.titleBold, color: '#ffffff' },
    dealName: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    dealEnds: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: 'rgba(255,255,255,0.9)' },
    search: { height: 46, paddingHorizontal: 16, borderRadius: 23, backgroundColor: Colors.subtleFill, color: Colors.textMain, fontSize: 13, fontFamily: FONTS.bodyRegular },
    chipRow: { gap: 8, paddingRight: 6 },
    chip: { paddingHorizontal: 15, height: 36, borderRadius: 18, justifyContent: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: edge() },
    chipOn: { backgroundColor: '#2457e6', borderColor: '#2457e6', shadowColor: '#2457e6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    chipText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: '#ffffff' },
    section: { gap: 4 },
    sectionHeading: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 14, marginBottom: 6, letterSpacing: -0.1 },
    sectionCount: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    item: { width: '31.6%', padding: 6, gap: 3, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: edge(), shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    itemOn: { borderColor: '#2457e6' },
    itemName: { fontSize: 11.5, fontFamily: FONTS.titleBold, color: Colors.textMain, lineHeight: 15, marginTop: 4 },
    itemMeta: { fontSize: 9.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    itemPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    itemPrice: { fontSize: 12, fontFamily: FONTS.titleBold, color: Colors.successText },
    lowTag: { position: 'absolute', left: 4, top: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: '#e5483d' },
    lowTagText: { fontSize: 8.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    itemPhoto: { width: '100%', aspectRatio: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    itemIcon: { fontSize: 34 },
    addBtn: { marginTop: 4, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8effe' },
    addBtnText: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: blue() },
    stepper: { marginTop: 4, height: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, borderRadius: 14, backgroundColor: '#2457e6' },
    stepText: { fontSize: 18, lineHeight: 20, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    stepQty: { fontSize: 13, fontFamily: FONTS.bodyBold, color: '#ffffff', minWidth: 12, textAlign: 'center' },
    cartBar: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 56, paddingHorizontal: 16, borderRadius: 28, backgroundColor: '#2457e6', shadowColor: '#2457e6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
    cartCount: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.25)' },
    cartCountText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    cartLabel: { flex: 1, fontSize: 12.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    cartTotal: { fontSize: 13, fontFamily: FONTS.titleBold, color: '#ffffff' },
    quickRow: { flexDirection: 'row', gap: 8 },
    quick: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 50, paddingHorizontal: 6, borderRadius: 25, borderWidth: 1 },
    quickIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    quickEmoji: { fontSize: 15 },
    quickLabel: { fontSize: 12.5, fontFamily: FONTS.bodyBold },
    badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    trustBadge: { paddingHorizontal: 11, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: 'rgba(16, 185, 129, 0.14)' },
    trustBadgeText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: Colors.success },
    deliveryChip: { paddingHorizontal: 12, height: 32, borderRadius: 16, justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(255,255,255,0.08)' : '#eceef2' },
    deliveryChipText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    sectionTitle: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 8 },
    infoList: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: edge(), borderRadius: 24, padding: 14, gap: 14 },
    title: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    infoDivider: { height: 1, backgroundColor: edge() },
    moreLink: { marginLeft: 'auto', fontSize: 11.5, fontFamily: FONTS.bodyBold, color: '#2457e6' },
    stockHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 },
    stockTitle: { fontSize: 22, fontFamily: FONTS.titleBold, color: Colors.textMain, letterSpacing: -0.3 },
    stockCount: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMuted },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    infoIconBox: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e3ecfd' },
    infoIcon: { fontSize: 16, textAlign: 'center' },
    infoValue: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    mapCard: { borderRadius: 24, overflow: 'hidden', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: edge() },
    mapBox: { height: 70, backgroundColor: Colors.subtleFill },
    mapPin: { position: 'absolute', transform: [{ translateX: -9 }, { translateY: -22 }] },
    mapPinEmoji: { fontSize: 20 },
    mapFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 6 },
    dirBtn: { paddingHorizontal: 11, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: '#2457e6' },
    dirBtnText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  })
);
