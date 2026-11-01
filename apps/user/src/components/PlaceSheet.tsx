import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ActionButton,
  Colors,
  directionsUrl,
  effectiveStock,
  effectiveState,
  FONTS,
  freePlugs,
  getThemeMode,
  Gradient,
  isFresh,
  minutesAgo,
  REPORT_RADIUS_M,
  themedStyles,
  type FuelName,
  type FuelStock,
  type Place,
  type PlugType,
  type QueueLevel,
} from '@ongarage/shared';
import { Sheet } from './Sheet';
import { PlugDots } from './home/PlaceTile';
import { AMENITY_ICON, AMENITY_LABEL, BRAND_BADGE } from '../constants/places';
import { usePlaceCommunity } from '../context/PlaceCommunityContext';
import { useUserLocation } from '../context/LocationContext';
import { useEvBookings } from '../context/EvBookingContext';
import { EvBookingCard, EvBookingSheet } from './EvBookingSheet';
import { RatingSummary, ReviewCard, ReviewsSection, WriteReview, type ReviewView } from './ReviewCard';

const STOCK_TEXT = { available: 'ඇත', low: 'අඩුයි', out: 'අවසන්' } as const;
const STATE_TEXT = { free: 'නිදහස්', busy: 'භාවිතයේ', offline: 'අක්‍රීයයි' } as const;
const QUEUE_TEXT: Record<QueueLevel, string> = { none: 'පෝලිමක් නැහැ', short: 'පෝලිම කෙටියි', long: 'පෝලිම දිගයි' };
const ago = (m: number) => (m < 60 ? `මිනි. ${m}කට පෙර` : `පැය ${Math.round(m / 60)}කට පෙර`);
const AVATAR_COLORS = ['#2457e6', '#0e9f6e', '#e5483d', '#8b5cf6', '#f59e0b', '#0891b2', '#db2777'];
const avatarColor = (id: string) => AVATAR_COLORS[[...id].reduce((n, ch) => n + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];
const dayAgo = (t: number) => {
  const d = Math.floor((Date.now() - t) / 86400000);
  return d <= 0 ? 'අද' : `දින ${d}කට පෙර`;
};

type Tab = 'overview' | 'info' | 'live' | 'reviews';

/**
 * A fuel station's or an EV charging point's profile, laid out like a garage's: a cover with its brand, name, rating, open state and round action buttons (way
 * there, call, book a slot, save, share), then four tabs. Overview: address, hours, phone and the fuels with price per litre or the connectors with every plug.
 * Details: facilities and services. Live: what other owners report now (only from near the place, once an hour), alerts and the owner's own slot bookings.
 * Reviews: the average, how the stars are spread and every review, with a form. Nothing here is bid for; costs are estimates paid at the place.
 */
export const PlaceSheet: React.FC<{ place: Place | null; distance?: number; from?: { latitude: number; longitude: number }; onClose: () => void }> = ({ place, distance, from, onClose }) => {
  const community = usePlaceCommunity();
  const user = useUserLocation();
  const evb = useEvBookings();
  const [shown, setShown] = useState(place);
  useEffect(() => {
    if (place) setShown(place);
  }, [place]);
  const p = place ?? shown;
  const [tab, setTab] = useState<Tab>('overview');
  const [saved, setSaved] = useState(false);
  const [booking, setBooking] = useState(false);
  const [fuel, setFuel] = useState<FuelName | null>(null);
  const [plug, setPlug] = useState<PlugType | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    setTab('overview');
    setSaved(false);
    setFuel(place?.fuels?.[0]?.name ?? null);
    setPlug(place?.connectors?.[0]?.type ?? null);
    setMessage(null);
    setStars(0);
    setText('');
    setProblem(null);
    setBooking(false);
  }, [place?.id]);

  if (!p) return null;
  const badge = BRAND_BADGE[p.brand] ?? { color: '#64748b', mark: p.brand.slice(0, 3).toUpperCase() };
  const isEv = p.kind === 'ev';
  const now = Date.now();
  const rate = community.rating(p.id);
  const reviews = community.reviews.filter((r) => r.placeId === p.id).sort((a, b) => b.at - a.at);
  const queue = community.queueOf(p.id);
  const starCount = Math.round(rate.avg);
  const todayHours = p.open24 ? '24 පැය විවෘතයි' : p.hours ?? '';
  const closesAt = !p.open24 ? p.hours?.split('-')[1]?.trim() : undefined;
  const myBookings = evb.bookingsAt(p.id);

  const send = (input: Parameters<typeof community.report>[0]) => {
    const r = community.report(input, user.coords);
    if (r.ok) setMessage({ ok: true, text: 'වාර්තාව සටහන් කළා. ස්තූතියි!' });
    else setMessage({ ok: false, text: r.reason === 'far' ? `වාර්තා කරන්න ස්ථානයට මීටර් ${REPORT_RADIUS_M}ක් ඇතුළත ඉන්න ඕන (දැන් මීටර් ${r.value}ක් දුරයි).` : `එකම ස්ථානය ගැන පැයකට වාර්තාවක් පමණයි (තව මිනිත්තු ${r.value}ක් ඉන්න).` });
  };
  const submitReview = async () => {
    if (stars < 1) return;
    const r = await community.review(p.id, stars, text);
    if (r.ok) {
      setStars(0);
      setText('');
      setProblem(null);
    } else setProblem(r.reason);
  };
  const share = () => Share.share({ message: `${p.name} · ${p.address} · ${p.phone} (OnGarage)` }).catch(() => undefined);

  const anyOut = !!p.fuels?.some((f) => effectiveStock(f.stock, community.stockOf(p.id, f.name)) !== 'available');
  const noneFree = !!p.connectors && p.connectors.every((c) => freePlugs({ ...c, states: c.states.map((st) => effectiveState(st, community.chargerOf(p.id, c.type))) }) === 0);
  const fresh = community.reports.filter((r) => r.placeId === p.id && isFresh(r, now));
  const lastAt = fresh.reduce((t, r) => Math.max(t, r.at), 0);
  const freeNow = p.connectors ? p.connectors.reduce((n, c) => n + freePlugs({ ...c, states: c.states.map((st) => effectiveState(st, community.chargerOf(p.id, c.type))) }), 0) : 0;
  const totalPlugs = p.connectors ? p.connectors.reduce((n, c) => n + c.states.length, 0) : 0;
  const outFuels = p.fuels ? p.fuels.filter((f) => effectiveStock(f.stock, community.stockOf(p.id, f.name)) === 'out').length : 0;
  const reviewViews: ReviewView[] = reviews.map((r) => ({ id: r.userId + r.id, name: r.name, rating: r.rating, at: r.at, text: r.text, meta: 'ඔබ වගේම අයිතිකරුවෙක්' }));
  const writeReview = <WriteReview done={community.hasReviewed(p.id)} doneText="✓ ඔබ මේ ස්ථානය ශ්‍රේණිගත කර ඇත." onSubmit={(stars, text) => community.review(p.id, stars, text)} />;
  const spread = [5, 4, 3, 2, 1].map((n) => ({ n, count: reviews.filter((r) => r.rating === n).length }));

  const hero = (
    <View>
      <View style={styles.coverWrap}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: badge.color }]} />
        <Gradient stops={[{ offset: '0', color: badge.color }, { offset: '1', color: '#0b1c52' }]} />
        <Text style={styles.coverIcon}>{isEv ? '🔌' : '⛽'}</Text>
        <View style={styles.coverShade} pointerEvents="none" />
        <View style={styles.coverGrip} />
        <Pressable style={styles.coverClose} onPress={onClose} hitSlop={8} accessibilityLabel="Close sheet">
          <Text style={styles.coverCloseText}>✕</Text>
        </Pressable>
        <View style={[styles.statusPill, p.open ? styles.statusOpen : styles.statusClosed]}>
          <Text style={styles.statusText}>{p.open ? '● දැන් විවෘතයි' : '● දැන් වසා ඇත'}</Text>
        </View>
      </View>
      <View style={styles.place}>
        <View style={styles.placeTop}>
          <View style={[styles.placeLogo, { backgroundColor: badge.color }]}>
            <Text style={styles.placeLogoText}>{badge.mark}</Text>
          </View>
          <View style={styles.flex1}>
            <Text style={styles.placeName} numberOfLines={2}>
              {p.name}
            </Text>
            <View style={styles.placeRating}>
              <Text style={styles.placeRatingNum}>{rate.count ? rate.avg.toFixed(1) : '–'}</Text>
              <Text style={styles.placeStars}>
                {'★'.repeat(starCount)}
                <Text style={styles.starsOff}>{'★'.repeat(5 - starCount)}</Text>
              </Text>
              <Text style={styles.placeMuted}>({rate.count})</Text>
            </View>
          </View>
        </View>
        <Text style={styles.placeType} numberOfLines={2}>
          {[isEv ? 'EV Charging station' : 'ඉන්ධන පිරවුම්හල', p.brand, distance !== undefined ? `කි.මී. ${distance}` : ''].filter(Boolean).join(' · ')}
        </Text>
        <Text style={styles.placeStatus}>
          <Text style={p.open ? styles.placeOpen : styles.placeClosed}>{p.open ? 'විවෘතයි' : 'වසා ඇත'}</Text>
          {p.open && closesAt ? <Text style={styles.placeMuted}> ⋅ {closesAt} දක්වා</Text> : p.open24 ? <Text style={styles.placeMuted}> ⋅ පැය 24ම</Text> : null}
          {queue ? <Text style={styles.placeMuted}> ⋅ 👥 {QUEUE_TEXT[queue.value]}</Text> : null}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.placeActions}>
          {[
            { id: 'dir', icon: '🧭', label: 'දිශාවන්', primary: true, onPress: () => Linking.openURL(directionsUrl(p.coords, from ?? user.coords)) },
            { id: 'call', icon: '📞', label: 'අමතන්න', onPress: () => Linking.openURL(`tel:${p.phone.replace(/\s/g, '')}`) },
            ...(isEv ? [{ id: 'book', icon: '📅', label: 'වෙන් කරන්න', onPress: () => setBooking(true) }] : []),
            { id: 'save', icon: saved ? '♥' : '♡', label: saved ? 'සුරැකිණි' : 'සුරකින්න', on: saved, onPress: () => setSaved((v) => !v) },
            { id: 'share', icon: '↗', label: 'බෙදාගන්න', onPress: share },
          ].map((a) => (
            <Pressable key={a.id} style={styles.placeAction} onPress={a.onPress} accessibilityLabel={`Place ${a.id}`}>
              <View style={[styles.placeActionCircle, 'primary' in a && a.primary && styles.placeActionPrimary, 'on' in a && a.on && styles.placeActionOn]}>
                <Text style={[styles.placeActionIcon, 'primary' in a && a.primary && { color: '#ffffff' }, 'on' in a && a.on && { color: '#e5483d' }]}>{a.icon}</Text>
              </View>
              <Text style={[styles.placeActionLabel, 'primary' in a && a.primary && { color: '#1a73e8' }]}>{a.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <>
      <Sheet
        visible={!!place}
        title={p.name}
        subtitle={`${rate.count ? `★ ${rate.avg.toFixed(1)} · ` : ''}සමාලෝචන ${rate.count}`}
        onClose={onClose}
        hero={hero}
        compact
        noDividers
        footer={isEv ? <ActionButton label="Charging slot එකක් වෙන් කරන්න" icon="📅" variant="primary" compact onPress={() => setBooking(true)} /> : undefined}
      >
        <View style={styles.tabs}>
          {(
            [
              { id: 'overview', label: 'දළ විස්තරය' },
              { id: 'info', label: 'තොරතුරු' },
              { id: 'live', label: 'සජීවී' },
              { id: 'reviews', label: 'සමාලෝචන' },
            ] as { id: Tab; label: string }[]
          ).map((t) => {
            const on = tab === t.id;
            return (
              <Pressable key={t.id} style={[styles.tabBtn, on && styles.tabBtnOn]} onPress={() => setTab(t.id)} accessibilityLabel={`Profile ${t.id}`}>
                <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'overview' && (
          <>
            <View style={styles.gmList}>
              <Pressable style={styles.gmRow} onPress={() => Linking.openURL(directionsUrl(p.coords, from ?? user.coords))} accessibilityLabel="Address">
                <Text style={styles.gmIcon}>📍</Text>
                <View style={styles.flex1}>
                  <Text style={styles.gmText}>{p.address}</Text>
                </View>
              </Pressable>
              <View style={styles.gmRow}>
                <Text style={styles.gmIcon}>🕗</Text>
                <View style={styles.flex1}>
                  <Text style={styles.gmText}>
                    <Text style={p.open ? styles.placeOpen : styles.placeClosed}>අද · </Text>
                    {todayHours}
                  </Text>
                </View>
              </View>
              <Pressable style={styles.gmRow} onPress={() => Linking.openURL(`tel:${p.phone.replace(/\s/g, '')}`)} accessibilityLabel="Phone">
                <Text style={styles.gmIcon}>📞</Text>
                <View style={styles.flex1}>
                  <Text style={styles.gmText}>{p.phone}</Text>
                </View>
              </Pressable>
            </View>

            {/* Live information: what the reports say right now, the queue, and "tell me when" alerts. */}
            <Text style={styles.sectionTitle}>📡 සජීවී තොරතුරු</Text>
            <View style={styles.block}>
              <View style={styles.liveGrid}>
                <View style={styles.liveCell}>
                  <Text style={styles.liveValue}>{isEv ? `${freeNow}/${totalPlugs}` : p.fuels ? `${p.fuels.length - outFuels}/${p.fuels.length}` : '–'}</Text>
                  <Text style={styles.liveLabel}>{isEv ? 'නිදහස් plugs' : 'ඇති ඉන්ධන'}</Text>
                </View>
                <View style={styles.liveCell}>
                  <Text style={styles.liveValue}>{queue ? QUEUE_TEXT[queue.value].replace('පෝලිම ', '').replace('පෝලිමක් ', '') : '–'}</Text>
                  <Text style={styles.liveLabel}>පෝලිම</Text>
                </View>
                <View style={styles.liveCell}>
                  <Text style={styles.liveValue}>{fresh.length}</Text>
                  <Text style={styles.liveLabel}>නැවුම් වාර්තා</Text>
                </View>
              </View>
              <Text style={styles.crowd}>{lastAt ? `👥 අවසන් වාර්තාව ${ago(minutesAgo(lastAt, now))}` : 'තවම නැවුම් වාර්තා නැහැ — පළමුවැන්නා වන්න.'}</Text>
              <Pressable onPress={() => setTab('live')} accessibilityLabel="Go report">
                <Text style={styles.link}>වාර්තා කරන්න ›</Text>
              </Pressable>
            </View>

            {/* "Tell me when": shown when something is out or no plug is free. */}
            {anyOut && !!p.fuels && (
              <Pressable style={[styles.alertRow, community.isAlerted(p.id, 'stock') && styles.alertOn]} onPress={() => community.toggleAlert(p.id, 'stock')} accessibilityLabel="Alert me when fuel is back">
                <Text style={styles.alertText}>{community.isAlerted(p.id, 'stock') ? '🔔 ඉන්ධන ලැබුණොත් දන්වනවා (අක්‍රිය කරන්න)' : '🔕 ඉන්ධන තොගය ලැබුණොත් දන්වන්න'}</Text>
              </Pressable>
            )}
            {noneFree && (
              <Pressable style={[styles.alertRow, community.isAlerted(p.id, 'free') && styles.alertOn]} onPress={() => community.toggleAlert(p.id, 'free')} accessibilityLabel="Alert me when a plug is free">
                <Text style={styles.alertText}>{community.isAlerted(p.id, 'free') ? '🔔 plug එකක් නිදහස් වුණොත් දන්වනවා (අක්‍රිය කරන්න)' : '🔕 plug එකක් නිදහස් වුණොත් දන්වන්න'}</Text>
              </Pressable>
            )}

            {!!p.fuels && (
              <>
                <Text style={styles.sectionTitle}>⛽ ඉන්ධන සහ මිල (ලීටරයකට)</Text>
                <View style={styles.block}>
                  {p.fuels.map((f) => {
                    const crowd = community.stockOf(p.id, f.name);
                    const stock = effectiveStock(f.stock, crowd);
                    return (
                      <View key={f.name} style={styles.row}>
                        <View style={styles.flex1}>
                          <Text style={styles.rowName}>{f.name}</Text>
                          {!!crowd && (
                            <Text style={styles.crowd}>
                              {crowd.byOwner ? '✔ ස්ථානය තහවුරු කළා' : `👥 අයිතිකරුවන් ${crowd.count}ක් වාර්තා කළා`} · {ago(minutesAgo(crowd.latestAt, now))}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.rowPrice}>රු. {f.price}</Text>
                        <Text style={[styles.rowStock, stock === 'out' ? styles.stockOut : stock === 'low' ? styles.stockLow : styles.stockOk]}>{STOCK_TEXT[stock]}</Text>
                      </View>
                    );
                  })}
                  <Text style={styles.note}>ස්ථානයට යන්න කලින් අමතා තහවුරු කරගන්න; මිල නියැදි දත්ත වන අතර තොග තත්වය අනෙක් අයිතිකරුවන්ගේ වාර්තා මත පදනම් වේ.</Text>
                </View>
              </>
            )}

            {!!p.connectors && (
              <>
                <Text style={styles.sectionTitle}>🔌 Chargers (plug අනුව)</Text>
                <View style={styles.block}>
                  {p.connectors.map((raw) => {
                    const crowd = community.chargerOf(p.id, raw.type);
                    const c = { ...raw, states: raw.states.map((st) => effectiveState(st, crowd)) };
                    return (
                      <View key={c.type + c.kw} style={styles.connBox}>
                        <View style={styles.row}>
                          <Text style={[styles.rowName, styles.flex1]}>
                            {c.type} · {c.kw} kW
                          </Text>
                          <Text style={styles.rowPrice}>රු. {c.price} / kWh</Text>
                        </View>
                        <View style={styles.plugRow}>
                          <PlugDots states={c.states} />
                          <Text style={styles.sub}>
                            {freePlugs(c)} නිදහස් · {c.states.map((s) => STATE_TEXT[s]).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                          </Text>
                        </View>
                        {!!crowd && (
                          <Text style={styles.crowd}>
                            {crowd.value ? '👥 වැඩ කරනවා' : '👥 වැඩ කරන්නේ නැහැ'} · අයිතිකරුවන් {crowd.count}ක් · {ago(minutesAgo(crowd.latestAt, now))}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                  <Text style={styles.note}>ගෙවීම ස්ථානයේදී කරන්න; මුදල ඇස්තමේන්තුවක් පමණයි.</Text>
                </View>
              </>
            )}
            <ReviewsSection avg={rate.avg} count={rate.count} reviews={reviewViews} onSeeAll={() => setTab('reviews')} write={writeReview} />
          </>
        )}

        {tab === 'info' && (
          <>
            <Text style={styles.sectionTitle}>🛠️ ලබාදෙන සේවා</Text>
            <View style={styles.tags}>
              {p.services.map((s) => (
                <View key={s} style={styles.tag}>
                  <Text style={styles.tagText}>{s}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.sectionTitle}>🏢 පහසුකම්</Text>
            {p.amenities.length ? (
              <View style={styles.tags}>
                {p.amenities.map((a) => (
                  <View key={a} style={styles.tag}>
                    <Text style={styles.tagText}>
                      {AMENITY_ICON[a]} {AMENITY_LABEL[a]}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.sub}>විශේෂ පහසුකම් නැහැ.</Text>
            )}
            <Text style={styles.sectionTitle}>🕗 විවෘත වේලාව</Text>
            <Text style={styles.gmText}>{p.open24 ? 'දිනපතා පැය 24ම විවෘතයි' : p.hours ?? '—'}</Text>
            <Text style={styles.sectionTitle}>🏷️ ජාලය</Text>
            <Text style={styles.gmText}>{p.brand}</Text>
          </>
        )}

        {tab === 'live' && (
          <>
            {isEv && myBookings.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>📅 ඔබේ වෙන් කිරීම්</Text>
                {myBookings.map((b) => (
                  <EvBookingCard key={b.id} booking={b} placeName={p.name} />
                ))}
              </>
            )}

            {/* Tell other owners what it is like now. Only from near the place, once an hour; the reports expire (fuel stock after two hours). */}
            <Text style={styles.sectionTitle}>👥 දැන් තත්වය වාර්තා කරන්න</Text>
            <View style={styles.block}>
              {!!p.fuels && (
                <>
                  <View style={styles.pickRow}>
                    {p.fuels.map((f) => (
                      <Pressable key={f.name} style={[styles.pick, fuel === f.name && styles.pickOn]} onPress={() => setFuel(f.name)} accessibilityLabel={`Report fuel ${f.name}`}>
                        <Text style={[styles.pickText, fuel === f.name && styles.pickTextOn]}>{f.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.pickRow}>
                    {(['available', 'low', 'out'] as FuelStock[]).map((st) => (
                      <Pressable key={st} style={[styles.reportBtn, st === 'out' ? styles.btnOut : st === 'low' ? styles.btnLow : styles.btnOk]} onPress={() => fuel && send({ placeId: p.id, kind: 'stock', fuel, stock: st })} accessibilityLabel={`Report ${fuel} ${st}`}>
                        <Text style={styles.reportBtnText}>{STOCK_TEXT[st]}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
              {!!p.connectors && (
                <>
                  <View style={styles.pickRow}>
                    {p.connectors.map((c) => (
                      <Pressable key={c.type} style={[styles.pick, plug === c.type && styles.pickOn]} onPress={() => setPlug(c.type)} accessibilityLabel={`Report plug ${c.type}`}>
                        <Text style={[styles.pickText, plug === c.type && styles.pickTextOn]}>{c.type}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.pickRow}>
                    <Pressable style={[styles.reportBtn, styles.btnOk]} onPress={() => plug && send({ placeId: p.id, kind: 'charger', plug, working: true })} accessibilityLabel="Report charger works">
                      <Text style={styles.reportBtnText}>වැඩ කරනවා</Text>
                    </Pressable>
                    <Pressable style={[styles.reportBtn, styles.btnOut]} onPress={() => plug && send({ placeId: p.id, kind: 'charger', plug, working: false })} accessibilityLabel="Report charger broken">
                      <Text style={styles.reportBtnText}>වැඩ කරන්නේ නැහැ</Text>
                    </Pressable>
                  </View>
                </>
              )}
              <Text style={styles.subLabel}>පෝලිම</Text>
              <View style={styles.pickRow}>
                {(['none', 'short', 'long'] as QueueLevel[]).map((q) => (
                  <Pressable key={q} style={[styles.reportBtn, styles.btnPlain]} onPress={() => send({ placeId: p.id, kind: 'queue', queue: q })} accessibilityLabel={`Report queue ${q}`}>
                    <Text style={styles.reportBtnTextDark}>{QUEUE_TEXT[q]}</Text>
                  </Pressable>
                ))}
              </View>
              {!!message && <Text style={[styles.msg, message.ok ? styles.msgOk : styles.msgBad]}>{message.text}</Text>}
            </View>

          </>
        )}

        {tab === 'reviews' && (
          <>
            <RatingSummary avg={rate.avg} count={rate.count} ratings={reviews.map((r) => r.rating)} />
            {reviewViews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
            {reviews.length === 0 && <Text style={styles.sub}>තවම සමාලෝචන නැහැ.</Text>}
            {writeReview}
          </>
        )}
      </Sheet>
      {isEv && <EvBookingSheet place={booking ? p : null} onClose={() => setBooking(false)} />}
    </>
  );
};

const dark = () => getThemeMode() === 'dark';
const soft = () => (dark() ? 'rgba(255, 255, 255, 0.06)' : '#f1f4f9');

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    coverWrap: { height: 150, overflow: 'hidden', borderTopLeftRadius: 28, borderTopRightRadius: 28, alignItems: 'center', justifyContent: 'center' },
    coverIcon: { fontSize: 64, opacity: 0.9 },
    coverShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(8, 16, 36, 0.18)' },
    coverGrip: { position: 'absolute', top: 8, alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)' },
    coverClose: { position: 'absolute', top: 16, right: 16, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
    coverCloseText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
    statusPill: { position: 'absolute', left: 16, top: 16, paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center' },
    statusOpen: { backgroundColor: 'rgba(16, 185, 129, 0.92)' },
    statusClosed: { backgroundColor: 'rgba(100, 116, 139, 0.92)' },
    statusText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    place: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 4, gap: 6 },
    placeTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    placeLogo: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    placeLogoText: { fontSize: 14, fontFamily: FONTS.titleBold, color: '#ffffff', letterSpacing: 0.5 },
    placeName: { fontSize: 22, lineHeight: 28, fontFamily: FONTS.titleBold, color: Colors.textMain, letterSpacing: -0.2 },
    placeRating: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 4 },
    placeRatingNum: { fontSize: 13.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    placeStars: { fontSize: 14, color: '#fbbc04', letterSpacing: 1 },
    starsOff: { color: Colors.subtleBorder },
    placeMuted: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    placeType: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    placeStatus: { fontSize: 13, fontFamily: FONTS.bodyRegular },
    placeOpen: { fontFamily: FONTS.bodyBold, color: '#188038' },
    placeClosed: { fontFamily: FONTS.bodyBold, color: '#d93025' },
    placeActions: { gap: 16, paddingTop: 6, paddingBottom: 4, paddingRight: 6 },
    placeAction: { alignItems: 'center', gap: 8, minWidth: 64 },
    placeActionCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: dark() ? Colors.subtleFill : '#ffffff', borderWidth: 1, borderColor: dark() ? Colors.borderColor : '#dadce0' },
    placeActionPrimary: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
    placeActionOn: { backgroundColor: dark() ? 'rgba(229, 72, 61, 0.16)' : '#fdecea', borderColor: '#f5b5b0' },
    placeActionIcon: { fontSize: 19, color: '#1a73e8' },
    placeActionLabel: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: dark() ? '#8db1ff' : '#1a73e8' },
    tabs: { flexDirection: 'row', marginTop: 8 },
    tabBtn: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderBottomWidth: 3, borderBottomColor: 'transparent' },
    tabBtnOn: { borderBottomColor: '#1a73e8' },
    tabText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    tabTextOn: { color: '#1a73e8', fontFamily: FONTS.bodyBold },
    gmList: { marginHorizontal: 4, marginTop: 8 },
    gmRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 4 },
    gmIcon: { width: 22, fontSize: 16, textAlign: 'center' },
    gmText: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 18 },
    sectionTitle: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary, letterSpacing: 0.2, marginTop: 22, marginBottom: 4 },
    sectionTitleBare: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary, letterSpacing: 0.2 },
    sub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
    subLabel: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 4 },
    block: { padding: 14, borderRadius: 14, backgroundColor: soft(), gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowName: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    rowPrice: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    rowStock: { minWidth: 48, textAlign: 'right', fontSize: 12, fontFamily: FONTS.bodyBold },
    crowd: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    stockOk: { color: '#16a34a' },
    stockLow: { color: '#d97706' },
    stockOut: { color: '#dc2626' },
    connBox: { gap: 4 },
    plugRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    note: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: dark() ? 'rgba(141, 177, 255, 0.14)' : '#e8f0fe' },
    tagText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    pickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    pick: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 12, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.08)' : '#e8eef7' },
    pickOn: { backgroundColor: '#1a73e8' },
    pickText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    pickTextOn: { color: '#ffffff' },
    reportBtn: { flex: 1, minWidth: 90, alignItems: 'center', paddingVertical: 9, borderRadius: 12 },
    btnOk: { backgroundColor: '#16a34a' },
    btnLow: { backgroundColor: '#d97706' },
    btnOut: { backgroundColor: '#dc2626' },
    btnPlain: { backgroundColor: dark() ? 'rgba(255, 255, 255, 0.1)' : '#e1e8f2' },
    reportBtnText: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    reportBtnTextDark: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    msg: { fontSize: 12, fontFamily: FONTS.bodySemiBold, lineHeight: 18 },
    msgOk: { color: '#16a34a' },
    msgBad: { color: dark() ? '#f28b82' : '#b3261e' },
    alertRow: { padding: 13, borderRadius: 14, backgroundColor: soft(), marginTop: 10 },
    alertOn: { backgroundColor: dark() ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    alertText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    liveGrid: { flexDirection: 'row', gap: 8 },
    liveCell: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.06)' : '#ffffff' },
    liveValue: { fontSize: 16, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    liveLabel: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    link: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: '#1a73e8' },
    summary: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingVertical: 14 },
    summaryBig: { alignItems: 'center', gap: 2, minWidth: 90 },
    summaryNum: { fontSize: 40, lineHeight: 46, fontFamily: FONTS.titleBold, color: Colors.textMain },
    spreadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
    spreadLabel: { width: 10, fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    spreadTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: dark() ? 'rgba(255, 255, 255, 0.12)' : '#e3e8ef' },
    spreadFill: { height: 8, backgroundColor: '#fbbc04' },
    review: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
    avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 15, fontFamily: FONTS.titleBold, color: '#ffffff' },
    reviewName: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    reviewStars: { fontSize: 12.5, color: '#fbbc04', marginTop: 1 },
    reviewText: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 19, marginTop: 3 },
    write: { gap: 8, marginTop: 14 },
    starsRow: { flexDirection: 'row', gap: 6 },
    star: { fontSize: 30, color: Colors.subtleBorder },
    starOn: { color: Colors.warning },
    input: { minHeight: 60, padding: 12, borderRadius: 12, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.06)' : '#ffffff', borderWidth: 1, borderColor: Colors.borderColor, color: Colors.textMain, fontSize: 13, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top' },
  })
);
