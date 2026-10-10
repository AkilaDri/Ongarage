import React, { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, directionsUrl, FONTS, getThemeMode, GoogleMap, LevelBadge, LEVELS, RATING_DIMENSIONS, themedStyles, type Bid, type Garage } from '@ongarage/shared';
import { MOCK_GARAGES } from '../constants/mockData';
import { GARAGE_COVERS, GARAGE_INFO } from '../constants/home';
import { garageProfileContent } from '../constants/garageProfile';
import { useUserLocation } from '../context/LocationContext';
import { ago, money } from '../utils/format';
import { Sheet } from './Sheet';

/** The garage behind a bid: its full profile when known, else what the bid carries. */
export const garageForBid = (b: Bid): Garage =>
  MOCK_GARAGES.find((g) => g.name === b.garageName) ?? {
    id: b.id,
    name: b.garageName,
    specialization: '',
    rating: b.rating,
    reviews: b.reviews,
    distance: b.distanceKm,
    status: 'open',
    phone: '',
    address: '',
    coords: b.coords,
    level: b.level,
  };

const AVATAR_COLORS = ['#2457e6', '#0e9f6e', '#e5483d', '#8b5cf6', '#f59e0b', '#0891b2', '#db2777'];
const avatarColor = (id: string) => AVATAR_COLORS[[...id].reduce((n, ch) => n + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];
const initialsOf = (name: string) =>
  (name.match(/[A-Za-z0-9]+/g) ?? [name]).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '🛠';

/**
 * A garage as owners judge it: its level, the four rating dimensions, and reviews with
 * the garage's public replies. Every review comes from a job closed with an owner's code.
 */
export const GarageReviewsSheet: React.FC<{
  garage: Garage | null;
  onClose: () => void;
  /** Opened from a bid: its offer on top, and accepting it. */
  bid?: Bid;
  onAccept?: () => void;
  /** Opened from Home: call or book this garage. */
  onCall?: () => void;
  onBook?: () => void;
}> = ({ garage, onClose, bid, onAccept, onCall, onBook }) => {
  const [shown, setShown] = useState(garage);
  useEffect(() => {
    if (garage) setShown(garage);
  }, [garage]);
  const garageId = garage?.id;
  const user = useUserLocation();
  // The profile is split into four tabs so it reads one topic at a time instead of as one long scroll.
  const [tab, setTab] = useState<'overview' | 'media' | 'reviews'>('overview');
  useEffect(() => {
    setTab('overview');
  }, [garageId]);

  const g = garage ?? shown;
  if (!g) return null;
  const level = g.level ? LEVELS.find((l) => l.id === g.level) : undefined;
  const info = GARAGE_INFO[g.id];
  const content = garageProfileContent(g);
  const totalJobs = content.services.reduce((n, sv) => n + sv.jobs, 0);
  const topJobs = Math.max(...content.services.map((sv) => sv.jobs));
  const cover = GARAGE_COVERS[g.id];
  const open = g.status === 'open';

  const hero = (
    <View>
      <View style={styles.coverWrap}>
        {cover ? <Image source={cover} style={styles.cover} resizeMode="cover" /> : <View style={[styles.cover, { backgroundColor: avatarColor(g.id) }]} />}
        <View style={styles.coverShade} />
        <View style={styles.coverGrip} />
        <Pressable style={styles.coverClose} onPress={onClose} hitSlop={8} accessibilityLabel="Close sheet">
          <Text style={styles.coverCloseText}>✕</Text>
        </Pressable>
        <View style={[styles.statusPill, open ? styles.statusOpen : styles.statusClosed]}>
          <Text style={styles.statusText}>{open ? '● දැන් විවෘතයි' : '● දැන් වසා ඇත'}</Text>
        </View>
      </View>
      <View style={styles.identity}>
        <View style={styles.avatarRing}>
          <View style={[styles.avatar, { backgroundColor: avatarColor(g.id) }]}>
            <Text style={styles.avatarText}>{initialsOf(g.name)}</Text>
          </View>
          {!!level && (
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarBadgeText}>{level.icon}</Text>
            </View>
          )}
        </View>
        <View style={styles.identityText}>
          <Text style={styles.name} numberOfLines={2}>
            {g.name}
          </Text>
          {!!g.specialization && (
            <Text style={styles.specialization} numberOfLines={1}>
              {g.specialization}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>★ {g.rating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>ශ්‍රේණිය</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{g.reviews}</Text>
          <Text style={styles.statLabel}>සමාලෝචන</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{g.distance} km</Text>
          <Text style={styles.statLabel}>දුර</Text>
        </View>
        {!!info && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>මිනි. {info.replyMin}</Text>
              <Text style={styles.statLabel}>පිළිතුර</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );

  return (
    <Sheet
      visible={!!garage}
      title={g.name}
      subtitle={`★ ${g.rating.toFixed(1)} · සමාලෝචන ${g.reviews}`}
      onClose={onClose}
      hero={hero}
      footer={
        bid && onAccept ? (
          <ActionButton label={`ලංසුව පිළිගන්න · ${money(bid.price)}`} icon="✓" variant="success" onPress={onAccept} />
        ) : onBook ? (
          <View style={styles.actions}>
            {!!onCall && (
              <View style={styles.flex1}>
                <ActionButton label="අමතන්න" icon="📞" variant="ghost" compact onPress={onCall} />
              </View>
            )}
            <View style={styles.flex2}>
              <ActionButton label="වෙන් කරන්න" icon="📅" variant="primary" compact onPress={onBook} />
            </View>
          </View>
        ) : undefined
      }
    >
      {bid && (
        <View style={[styles.box, styles.bidBox]} accessibilityLabel="Bid summary">
          <View style={styles.rowBetween}>
            <Text style={styles.customer}>ඔබගේ රැකියාවට ලංසුව</Text>
            <Text style={styles.bidPrice}>{money(bid.price)}</Text>
          </View>
          <Text style={styles.text}>
            🛡️ මාස {bid.warrantyMonths} වගකීම · ⏱️ පැය {bid.estHours} · 📍 කි.මී. {bid.distanceKm}
          </Text>
        </View>
      )}
      <View style={styles.tabs}>
        {(
          [
            { id: 'overview', label: 'දළ විස්තරය' },
            { id: 'media', label: 'මාධ්‍ය' },
            { id: 'reviews', label: 'සමාලෝචන' },
          ] as { id: typeof tab; label: string }[]
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
      {(!!g.address || !!g.phone || !!info?.offer) && (
        <View style={styles.box}>
          {!!g.address && <Text style={styles.contactLine}>📍 {g.address}</Text>}
          {!!g.phone && <Text style={styles.contactLine}>📞 {g.phone}</Text>}
          {!!info?.offer && (
            <View style={styles.offerChip}>
              <Text style={styles.offerText}>🎁 {info.offer}</Text>
            </View>
          )}
        </View>
      )}
      <Text style={styles.sectionTitle}>🎁 දැනට ඇති දීමනා</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
        {content.offers.map((o) => (
          <View key={o.id} style={[styles.offerCard, { backgroundColor: o.tone }]}>
            <Text style={styles.offerCardIcon}>{o.icon}</Text>
            <Text style={styles.offerCardTitle} numberOfLines={2}>
              {o.title}
            </Text>
            <Text style={styles.offerCardDetail} numberOfLines={1}>
              {o.detail}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitleBare}>🛠️ ලබාදෙන සේවා</Text>
        <View style={styles.jobsPill}>
          <Text style={styles.jobsPillText}>✓ රැකියා {totalJobs}</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
        {content.services.map((sv) => (
          <View key={sv.id} style={styles.serviceTile} accessibilityLabel={`Service ${sv.name}`}>
            <View style={styles.serviceTop}>
              <View style={[styles.serviceIconBox, { backgroundColor: `${sv.color}26` }]}>
                <Text style={styles.serviceIcon}>{sv.icon}</Text>
              </View>
              {sv.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>අලුත්</Text>
                </View>
              )}
            </View>
            <Text style={styles.serviceTileName} numberOfLines={2}>
              {sv.name}
            </Text>
            <View style={styles.jobsTrack}>
              <View style={[styles.jobsFill, { width: `${Math.max(8, (sv.jobs / topJobs) * 100)}%`, backgroundColor: sv.color }]} />
            </View>
            <Text style={styles.jobsText}>✓ රැකියා {sv.jobs} ක් සම්පූර්ණ</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitleBare}>⚡ ගරාජය පළ කළ Gigs</Text>
        <Text style={styles.sub}>{content.gigs.length} පැකේජ</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
        {content.gigs.map((gg) => (
          <View key={gg.id} style={styles.gig} accessibilityLabel={`Gig ${gg.title}`}>
            <Image source={gg.image} style={styles.gigImg} resizeMode="cover" />
            <View style={[styles.gigTag, { backgroundColor: gg.color }]}>
              <Text style={styles.gigTagText}>රු. {gg.price.toLocaleString()}</Text>
            </View>
            <View style={styles.gigBody}>
              <Text style={styles.gigTitle} numberOfLines={2}>
                {gg.title}
              </Text>
              <Text style={styles.sub} numberOfLines={2}>
                {gg.detail}
              </Text>
              <View style={styles.gigMeta}>
                <Text style={styles.gigMetaText}>⏱️ පැය {gg.hours}</Text>
                <Text style={styles.gigMetaText}>★ {gg.rating.toFixed(1)} ({gg.orders})</Text>
              </View>
              {!!onBook && (
                <Pressable style={styles.gigBtn} onPress={onBook} accessibilityLabel={`Book ${gg.title}`}>
                  <Text style={styles.gigBtnText}>වෙන් කරන්න</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>📍 ගරාජය ඇති ස්ථානය</Text>
      <View style={styles.mapCard}>
        <View style={styles.mapBox}>
          <GoogleMap
            style={StyleSheet.absoluteFill}
            center={g.coords}
            zoom={15}
            renderOverlay={(project) => {
              const pt = project(g.coords);
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
            <Text style={styles.serviceName} numberOfLines={1}>
              {g.address || g.name}
            </Text>
            <Text style={styles.sub}>ඔබගෙන් කි.මී. {g.distance}</Text>
          </View>
          <Pressable style={styles.dirBtn} onPress={() => Linking.openURL(directionsUrl(g.coords, user.coords))} accessibilityLabel="Directions to the garage">
            <Text style={styles.dirBtnText}>🗺️ දිශාවන්</Text>
          </Pressable>
        </View>
      </View>

      {level && (
        <View style={styles.box}>
          <LevelBadge level={level.id} />
          <Text style={styles.sub}>{level.note} · OnGarage මට්ටම් තීරණය වන්නේ අවසන් කළ රැකියා, ශ්‍රේණිය සහ ගැටලු අනුපාතය අනුවය.</Text>
          {level.id === 'premier' && <Text style={styles.protected}>🛡️ මෙම ගරාජයේ රැකියා OnGarage Guarantee මගින් ආරක්ෂිතයි (උපරිම රු. 50,000).</Text>}
        </View>
      )}

        </>
      )}
      {tab === 'media' && (
        <>
      <Text style={styles.sectionTitle}>📸 අලුතින් එක් කළ ඡායාරූප</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
        {content.gallery.map((ph) => (
          <View key={ph.id} style={styles.photoTile}>
            <Image source={ph.source} style={styles.photoImg} resizeMode="cover" />
            <Text style={styles.photoCaption} numberOfLines={1}>
              {ph.caption}
            </Text>
          </View>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>🎬 වීඩියෝ රීල්ස්</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
        {content.reels.map((r) => (
          <View key={r.id} style={styles.reel} accessibilityLabel={`Reel ${r.title}`}>
            <Image source={r.thumb} style={styles.reelImg} resizeMode="cover" />
            <View style={styles.reelShade} />
            <View style={styles.reelPlay}>
              <Text style={styles.reelPlayText}>▶</Text>
            </View>
            <View style={styles.reelLength}>
              <Text style={styles.reelLengthText}>{r.length}</Text>
            </View>
            <View style={styles.reelMeta}>
              <Text style={styles.reelTitle} numberOfLines={2}>
                {r.title}
              </Text>
              <Text style={styles.reelViews}>▶ {r.views}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

        </>
      )}
      {tab === 'reviews' && (
        <>
      {!!g.dimensions && (
        <View style={styles.box}>
          {RATING_DIMENSIONS.map((d) => {
            const v = g.dimensions![d.id];
            return (
              <View key={d.id} style={styles.dimRow}>
                <Text style={styles.dimLabel}>{d.label}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${(v / 5) * 100}%` }]} />
                </View>
                <Text style={styles.dimValue}>{v.toFixed(1)}</Text>
              </View>
            );
          })}
        </View>
      )}

      {(g.recentReviews ?? []).map((r) => (
        <View key={r.id} style={styles.review}>
          <View style={styles.rowBetween}>
            <Text style={styles.customer}>{r.customer}</Text>
            <Text style={styles.stars}>
              {'★'.repeat(Math.round(r.rating))}
              <Text style={styles.starsOff}>{'★'.repeat(5 - Math.round(r.rating))}</Text>
            </Text>
          </View>
          <Text style={styles.text}>{r.text}</Text>
          <Text style={styles.sub}>{ago(Date.now() - r.at)} · ✓ කේතයෙන් අවසන් කළ රැකියාවක්</Text>
          {!!r.reply && (
            <View style={styles.reply}>
              <Text style={styles.replyLabel}>↳ {g.name} පිළිතුර</Text>
              <Text style={styles.text}>{r.reply.text}</Text>
            </View>
          )}
        </View>
      ))}
      {!g.recentReviews?.length && <Text style={styles.sub}>තවම සමාලෝචන නැත.</Text>}
      {!g.recentReviews?.length && <Text style={styles.sub}>තවම සමාලෝචන නැත.</Text>}
        </>
      )}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    tabs: { flexDirection: 'row', gap: 6, marginTop: 4 },
    tabBtn: { flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dbe4f3', backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff' },
    tabBtnOn: { backgroundColor: '#2457e6', borderColor: '#2457e6', shadowColor: '#2457e6', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    tabText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#2457e6' },
    tabTextOn: { color: '#ffffff' },
    sectionTitle: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 8 },
    hRow: { gap: 10, paddingRight: 6 },
    offerCard: { width: 158, padding: 12, borderRadius: 18, gap: 4 },
    offerCardIcon: { fontSize: 22 },
    offerCardTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: '#ffffff', lineHeight: 17 },
    offerCardDetail: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: 'rgba(255,255,255,0.85)' },
    sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    sectionTitleBare: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    jobsPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.15)' },
    jobsPillText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: Colors.success },
    serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    serviceTile: { width: 150, gap: 6, padding: 12, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    serviceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    serviceIconBox: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    serviceTileName: { fontSize: 12.5, fontFamily: FONTS.titleBold, color: Colors.textMain, lineHeight: 17, minHeight: 34 },
    jobsTrack: { height: 5, borderRadius: 3, backgroundColor: Colors.subtleFill, overflow: 'hidden', marginTop: 2 },
    jobsFill: { height: 5, borderRadius: 3 },
    jobsText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
    moreBtn: { alignSelf: 'center', paddingHorizontal: 16, height: 36, borderRadius: 18, justifyContent: 'center', backgroundColor: 'rgba(36, 87, 230, 0.1)' },
    moreBtnText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#2457e6' },
    gig: { width: 210, borderRadius: 18, overflow: 'hidden', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    gigImg: { width: '100%', height: 104, backgroundColor: Colors.subtleFill },
    gigTag: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 10, height: 24, borderRadius: 12, justifyContent: 'center' },
    gigTagText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    gigBody: { padding: 12, gap: 5 },
    gigTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain, lineHeight: 17 },
    gigMeta: { flexDirection: 'row', justifyContent: 'space-between' },
    gigMetaText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
    gigBtn: { alignSelf: 'flex-start', marginTop: 2, paddingHorizontal: 14, height: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: '#2457e6' },
    gigBtnText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    serviceList: { borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, overflow: 'hidden' },
    serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
    serviceIcon: { fontSize: 22 },
    serviceName: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    newBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, backgroundColor: '#ef4444' },
    newBadgeText: { fontSize: 10, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    photoTile: { width: 128, gap: 5 },
    photoImg: { width: 128, height: 128, borderRadius: 16, backgroundColor: Colors.subtleFill },
    photoCaption: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    reel: { width: 118, height: 190, borderRadius: 18, overflow: 'hidden', backgroundColor: Colors.subtleFill },
    reelImg: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
    reelShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5, 10, 25, 0.38)' },
    reelPlay: { position: 'absolute', top: 70, left: 39, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.88)' },
    reelPlayText: { fontSize: 15, color: '#1b2a49', marginLeft: 2 },
    reelLength: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.55)' },
    reelLengthText: { fontSize: 10, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    reelMeta: { position: 'absolute', left: 8, right: 8, bottom: 8, gap: 2 },
    reelTitle: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#ffffff', lineHeight: 14 },
    reelViews: { fontSize: 10, fontFamily: FONTS.bodyMedium, color: 'rgba(255,255,255,0.85)' },
    mapCard: { borderRadius: 18, overflow: 'hidden', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    mapBox: { height: 60, backgroundColor: Colors.subtleFill },
    mapPin: { position: 'absolute', transform: [{ translateX: -8 }, { translateY: -20 }] },
    mapPinEmoji: { fontSize: 18 },
    mapFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 6 },
    dirBtn: { paddingHorizontal: 11, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: '#2457e6' },
    dirBtnText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    coverWrap: { height: 168, overflow: 'hidden', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
    cover: { width: '100%', height: '100%' },
    coverShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(8, 16, 36, 0.22)' },
    coverGrip: { position: 'absolute', top: 8, alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)' },
    coverClose: { position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
    coverCloseText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
    statusPill: { position: 'absolute', left: 14, top: 14, paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center' },
    statusOpen: { backgroundColor: 'rgba(16, 185, 129, 0.92)' },
    statusClosed: { backgroundColor: 'rgba(100, 116, 139, 0.92)' },
    statusText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    identity: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 6, marginTop: -34 },
    avatarRing: { width: 84, height: 84, borderRadius: 42, padding: 4, backgroundColor: Colors.sheetBg },
    avatar: { flex: 1, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 26, fontFamily: FONTS.titleBold, color: '#ffffff', letterSpacing: 0.5 },
    avatarBadge: { position: 'absolute', right: -2, bottom: 0, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.sheetBg, borderWidth: 2, borderColor: Colors.sheetBg },
    avatarBadgeText: { fontSize: 15 },
    identityText: { flex: 1, paddingBottom: 6, gap: 2 },
    name: { fontSize: 19, fontFamily: FONTS.titleBold, color: Colors.textMain },
    specialization: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    statRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 6, marginTop: 14, paddingVertical: 12, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    stat: { flex: 1, alignItems: 'center', gap: 2 },
    statValue: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
    statLabel: { fontSize: 10, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    statDivider: { width: 1, height: 26, backgroundColor: Colors.borderColor },
    contactLine: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textSoft, lineHeight: 18 },
    offerChip: { alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 13, backgroundColor: 'rgba(245, 158, 11, 0.16)' },
    offerText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: Colors.warning },
    box: { padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 8 },
    dimRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dimLabel: { width: 118, fontSize: 11, fontFamily: FONTS.bodyMedium, color: Colors.textSoft },
    track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.subtleFill, overflow: 'hidden' },
    fill: { height: 6, borderRadius: 3, backgroundColor: Colors.warning },
    dimValue: { width: 26, textAlign: 'right', fontSize: 11, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    review: { padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 4 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    customer: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    stars: { fontSize: 13, color: Colors.warning },
    starsOff: { color: Colors.subtleBorder },
    text: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 18 },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    reply: { marginTop: 4, padding: 10, borderRadius: 12, backgroundColor: Colors.subtleFill, gap: 2 },
    protected: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 17 },
    actions: { flexDirection: 'row', gap: 8 },
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    bidBox: { borderColor: 'rgba(16, 185, 129, 0.45)' },
    bidPrice: { fontSize: 17, fontFamily: FONTS.titleBold, color: Colors.success },
    replyLabel: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  })
);
