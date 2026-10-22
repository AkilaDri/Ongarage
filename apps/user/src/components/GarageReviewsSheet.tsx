import { EmptyState } from '@ongarage/shared';
import { elevation1, outline } from '../utils/material';
import React, { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Share, Text, View, type ImageSourcePropType } from 'react-native';
import { ActionButton, Colors, directionsUrl, FONTS, getThemeMode, GoogleMap, LevelBadge, LEVELS, RATING_DIMENSIONS, themedStyles, type Bid, type Garage } from '@ongarage/shared';
import { MOCK_GARAGES } from '../constants/mockData';
import { GARAGE_COVERS, GARAGE_INFO } from '../constants/home';
import { garageProfileContent } from '../constants/garageProfile';
import { useUserLocation } from '../context/LocationContext';
import { useChat } from '../context/ChatContext';
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

/** A review card's width: about one and a half show at once, so the next one peeks in. */
const REVIEW_W = 210;
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
  /** Opened from a service category: the inquiry form starts on that service. */
  inquiryCategoryId?: string;
}> = ({ garage, onClose, bid, onAccept, onCall, onBook, inquiryCategoryId }) => {
  const [shown, setShown] = useState(garage);
  useEffect(() => {
    if (garage) setShown(garage);
  }, [garage]);
  const garageId = garage?.id;
  const user = useUserLocation();
  // The profile is split into four tabs so it reads one topic at a time instead of as one long scroll.
  const [tab, setTab] = useState<'overview' | 'info' | 'media' | 'reviews'>('overview');
  // The cover is a row of the garage's photos and videos that scrolls sideways, one at a time.
  const [coverW, setCoverW] = useState(0);
  const [slide, setSlide] = useState(0);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setTab('overview');
    setSlide(0);
    setSaved(false);
  }, [garageId]);

  const g = garage ?? shown;
  const chat = useChat();
  // OnChat replaces WhatsApp: the profile closes and the chat with this garage opens.
  const startChat = (compose: boolean) => {
    if (!g) return;
    onClose();
    chat.open({ id: `garage:${g.id}`, title: g.name, subtitle: 'ගරාජ පැතිකඩ', phone: g.phone, profile: 'garage', inquiry: { categoryId: inquiryCategoryId, compose } });
  };
  const openChat = () => startChat(false);
  // "Send an inquiry" opens the same chat with the inquiry form ready.
  const askInquiry = () => startChat(true);
  if (!g) return null;
  const level = g.level ? LEVELS.find((l) => l.id === g.level) : undefined;
  const info = GARAGE_INFO[g.id];
  const content = garageProfileContent(g);
  const totalJobs = content.services.reduce((n, sv) => n + sv.jobs, 0);
  const topJobs = Math.max(...content.services.map((sv) => sv.jobs));
  const cover = GARAGE_COVERS[g.id];
  const open = g.status === 'open';
  const todayHours = content.hours[(new Date().getDay() + 6) % 7]?.open ?? null;
  const closesAt = todayHours?.split('–')[1]?.trim();
  const stars = Math.round(g.rating);
  const shareGarage = () => Share.share({ message: `${g.name}${g.address ? ' · ' + g.address : ''}${g.phone ? ' · ' + g.phone : ''} (OnGarage)` }).catch(() => undefined);
  // The cover photo first, then the garage's photos, then its videos.
  const coverMedia: { id: string; kind: 'photo' | 'video'; source?: ImageSourcePropType; caption: string; length?: string }[] = [
    { id: 'cover', kind: 'photo', source: cover, caption: g.name },
    ...content.gallery.map((p) => ({ id: p.id, kind: 'photo' as const, source: p.source, caption: p.caption })),
    ...content.reels.map((r) => ({ id: r.id, kind: 'video' as const, source: r.thumb, caption: r.title, length: r.length })),
  ];

  const hero = (
    <View>
      <View style={styles.coverWrap}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          // On a phone browser only sideways drags belong to the photos; a drag down is left to the sheet (swipe down to close).
          style={[StyleSheet.absoluteFill, { touchAction: 'pan-x' } as object]}
          onLayout={(e) => setCoverW(Math.round(e.nativeEvent.layout.width))}
          onScroll={(e) => coverW > 0 && setSlide(Math.round(e.nativeEvent.contentOffset.x / coverW))}
          scrollEventThrottle={16}
          accessibilityLabel="Garage photos and videos"
        >
          {coverMedia.map((m) => (
            <View key={m.id} style={[styles.coverSlide, { width: coverW || '100%' }]}>
              {m.source ? <Image source={m.source} style={styles.cover} resizeMode="cover" /> : <View style={[styles.cover, { backgroundColor: avatarColor(g.id) }]} />}
              {m.kind === 'video' && (
                <>
                  <View style={styles.coverPlay}>
                    <Text style={styles.coverPlayText}>▶</Text>
                  </View>
                  <View style={styles.coverVideoTag}>
                    <Text style={styles.coverVideoTagText}>🎬 {m.caption} · {m.length}</Text>
                  </View>
                </>
              )}
            </View>
          ))}
        </ScrollView>
        <View style={styles.coverShade} pointerEvents="none" />
        <View style={styles.coverCount} pointerEvents="none">
          <Text style={styles.coverCountText}>
            {Math.min(slide, coverMedia.length - 1) + 1} / {coverMedia.length}
          </Text>
        </View>
        <View style={styles.coverDots} pointerEvents="none">
          {coverMedia.map((m, i) => (
            <View key={m.id} style={[styles.coverDot, i === slide && styles.coverDotOn]} />
          ))}
        </View>
        <View style={styles.coverGrip} />
        <Pressable style={styles.coverClose} onPress={onClose} hitSlop={8} accessibilityLabel="Close sheet">
          <Text style={styles.coverCloseText}>✕</Text>
        </Pressable>
        <View style={[styles.statusPill, open ? styles.statusOpen : styles.statusClosed]}>
          <Text style={styles.statusText}>{open ? '● දැන් විවෘතයි' : '● දැන් වසා ඇත'}</Text>
        </View>
      </View>
      <View style={styles.place}>
        <View style={styles.placeTop}>
          <View style={[styles.placeLogo, { backgroundColor: avatarColor(g.id) }]}>
            <Text style={styles.placeLogoText}>{initialsOf(g.name)}</Text>
          </View>
          <View style={styles.flex1}>
            <Text style={styles.placeName} numberOfLines={2}>
              {g.name}
            </Text>
            <View style={styles.placeRating}>
              <Text style={styles.placeRatingNum}>{g.rating.toFixed(1)}</Text>
              <Text style={styles.placeStars}>
                {'★'.repeat(stars)}
                <Text style={styles.starsOff}>{'★'.repeat(5 - stars)}</Text>
              </Text>
              <Text style={styles.placeMuted}>({g.reviews})</Text>
              {!!level && <Text style={styles.placeMuted}>· {level.icon} {level.name}</Text>}
            </View>
          </View>
        </View>
        <Text style={styles.placeType} numberOfLines={2}>
          {[g.specialization || 'වාහන අලුත්වැඩියා ගරාජය', `කි.මී. ${g.distance}`].filter(Boolean).join(' · ')}
        </Text>
        <Text style={styles.placeStatus}>
          <Text style={open ? styles.placeOpen : styles.placeClosed}>{open ? 'විවෘතයි' : 'වසා ඇත'}</Text>
          {open && closesAt ? <Text style={styles.placeMuted}> ⋅ {closesAt} දක්වා</Text> : null}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.placeActions}>
          {[
            { id: 'dir', icon: '🧭', label: 'දිශාවන්', primary: true, onPress: () => Linking.openURL(directionsUrl(g.coords, user.coords)) },
            { id: 'call', icon: '📞', label: 'අමතන්න', onPress: () => (onCall ? onCall() : g.phone ? Linking.openURL(`tel:${g.phone.replace(/\s/g, '')}`) : undefined) },
            { id: 'wa', icon: '💬', label: 'OnChat', onPress: openChat },
            { id: 'save', icon: saved ? '♥' : '♡', label: saved ? 'සුරැකිණි' : 'සුරකින්න', on: saved, onPress: () => setSaved((v) => !v) },
            { id: 'share', icon: '↗', label: 'බෙදාගන්න', onPress: shareGarage },
          ].map((a) => (
            <Pressable key={a.id} style={styles.placeAction} onPress={a.onPress} accessibilityLabel={`Garage ${a.id}`}>
              <View style={[styles.placeActionCircle, a.primary && styles.placeActionPrimary, a.on && styles.placeActionOn]}>
                <Text style={[styles.placeActionIcon, a.primary && { color: '#ffffff' }, a.on && { color: '#e5483d' }]}>{a.icon}</Text>
              </View>
              <Text style={[styles.placeActionLabel, a.primary && { color: '#1a73e8' }]}>{a.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
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
      compact
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
            <View style={styles.flex1}>
              <ActionButton label="විමසීම" icon="❓" variant="ghost" compact onPress={askInquiry} />
            </View>
            <View style={styles.flex2}>
              <ActionButton label="වෙන් කරන්න" icon="📅" variant="primary" compact onPress={onBook} />
            </View>
          </View>
        ) : undefined
      }
    >
      {bid && (
        <View style={styles.bidHero} accessibilityLabel="Bid summary">
          <View style={styles.bidHeroTop}>
            <View style={styles.flex1}>
              <Text style={styles.bidHeroLabel}>💰 ඔබගේ රැකියාවට ලංසුව</Text>
              <Text style={styles.bidHeroPrice}>{money(bid.price)}</Text>
            </View>
            <View style={styles.bidHeroTag}>
              <Text style={styles.bidHeroTagText}>ලංසුව</Text>
            </View>
          </View>
          <View style={styles.bidHeroChips}>
            <View style={styles.bidHeroChip}>
              <Text style={styles.bidHeroChipText}>🛡️ මාස {bid.warrantyMonths} වගකීම</Text>
            </View>
            <View style={styles.bidHeroChip}>
              <Text style={styles.bidHeroChipText}>⏱️ පැය {bid.estHours}</Text>
            </View>
            <View style={styles.bidHeroChip}>
              <Text style={styles.bidHeroChipText}>📍 කි.මී. {bid.distanceKm}</Text>
            </View>
            {!!bid.travelFee && (
              <View style={[styles.bidHeroChip, { backgroundColor: 'rgba(245, 158, 11, 0.25)' }]} accessibilityLabel="Bid includes travel fee">
                <Text style={styles.bidHeroChipText}>🚗 ගමන් ගාස්තුව ඇතුළුව · රු. {bid.travelFee.toLocaleString()}</Text>
              </View>
            )}
          </View>
        </View>
      )}
      <View style={styles.tabs}>
        {(
          [
            { id: 'overview', label: 'දළ විස්තරය' },
            { id: 'info', label: 'තොරතුරු' },
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
      <View style={styles.gmList}>
          <Pressable style={styles.gmRow} onPress={() => Linking.openURL(directionsUrl(g.coords, user.coords))} accessibilityLabel="Address">
            <Text style={styles.gmIcon}>📍</Text>
            <View style={styles.flex1}><Text style={styles.gmText}>{g.address || g.name}</Text></View>
          </Pressable>
          <Pressable style={styles.gmRow} onPress={() => setTab('info')} accessibilityLabel="Hours">
            <Text style={styles.gmIcon}>🕗</Text>
            <View style={styles.flex1}><Text style={styles.gmText}>{todayHours ? <Text><Text style={open ? styles.placeOpen : styles.placeClosed}>අද · </Text>{todayHours}</Text> : 'අද වසා ඇත'}</Text></View>
          </Pressable>
          <Pressable style={styles.gmRow} onPress={() => (g.phone ? Linking.openURL(`tel:${g.phone.replace(/\s/g, '')}`) : undefined)} accessibilityLabel="Phone">
            <Text style={styles.gmIcon}>📞</Text>
            <View style={styles.flex1}><Text style={styles.gmText}>{g.phone || content.contact.hotline}</Text></View>
          </Pressable>
          <Pressable style={styles.gmRow} onPress={openChat} accessibilityLabel="OnChat">
            <Text style={styles.gmIcon}>💬</Text>
            <View style={styles.flex1}><Text style={styles.gmText}>OnChat · {g.name}</Text></View>
          </Pressable>
          <Pressable style={styles.gmRow} onPress={() => Linking.openURL(`mailto:${content.contact.email}`)} accessibilityLabel="Email">
            <Text style={styles.gmIcon}>✉️</Text>
            <View style={styles.flex1}><Text style={styles.gmText}>{content.contact.email}</Text></View>
          </Pressable>
          <Pressable style={styles.gmRow} onPress={() => undefined} accessibilityLabel="Offer">
            <Text style={styles.gmIcon}>🏷️</Text>
            <View style={styles.flex1}><Text style={styles.gmText}>{info?.offer ?? 'පළමු සේවාවට 10% වට්ටම'}</Text></View>
          </Pressable>
      </View>
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
      {tab === 'info' && (
        <>
          <Text style={styles.sectionTitle}>📞 සම්බන්ධතා තොරතුරු</Text>
          <View style={styles.box}>
            {!!content.contact.hotline && (
            <Pressable style={styles.infoLine} onPress={() => Linking.openURL(`tel:${content.contact.hotline.replace(/\s/g, '')}`)} accessibilityLabel="Call hotline">
              <Text style={styles.infoIcon}>☎️</Text>
              <View style={styles.flex1}>
                <Text style={styles.sub}>Hotline</Text>
                <Text style={styles.infoValue}>{content.contact.hotline}</Text>
              </View>
              <Text style={styles.infoAction}>අමතන්න ›</Text>
            </Pressable>
            )}
            <Pressable style={styles.infoLine} onPress={openChat} accessibilityLabel="Open OnChat">
              <Text style={styles.infoIcon}>💬</Text>
              <View style={styles.flex1}>
                <Text style={styles.sub}>OnChat</Text>
                <Text style={styles.infoValue}>{g.name}</Text>
              </View>
              <Text style={styles.infoAction}>කතා කරන්න ›</Text>
            </Pressable>
            <Pressable style={styles.infoLine} onPress={() => Linking.openURL(`mailto:${content.contact.email}`)} accessibilityLabel="Send email">
              <Text style={styles.infoIcon}>✉️</Text>
              <View style={styles.flex1}>
                <Text style={styles.sub}>විද්‍යුත් තැපෑල</Text>
                <Text style={styles.infoValue}>{content.contact.email}</Text>
              </View>
              <Text style={styles.infoAction}>ලියන්න ›</Text>
            </Pressable>
            <Pressable style={styles.infoLine} onPress={() => Linking.openURL(directionsUrl(g.coords, user.coords))} accessibilityLabel="Directions to the garage">
              <Text style={styles.infoIcon}>📍</Text>
              <View style={styles.flex1}>
                <Text style={styles.sub}>ලිපිනය</Text>
                <Text style={styles.infoValue}>{g.address || g.name}</Text>
              </View>
              <Text style={styles.infoAction}>දිශාවන් ›</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>🕗 සේවා කාලය</Text>
          <View style={styles.box}>
            {content.hours.map((h, i) => {
              const today = i === (new Date().getDay() + 6) % 7;
              return (
                <View key={h.day} style={[styles.hourRow, today && styles.hourRowToday]}>
                  <Text style={[styles.hourDay, today && styles.hourToday]}>
                    {h.day}
                    {today ? ' · අද' : ''}
                  </Text>
                  <Text style={[styles.hourTime, !h.open && styles.hourClosed, today && styles.hourToday]}>{h.open ?? 'වසා ඇත'}</Text>
                </View>
              );
            })}
            <View style={[styles.noteBox, content.emergency24 && styles.noteBoxOn]}>
              <Text style={[styles.noteText, content.emergency24 && styles.noteTextOn]}>
                {content.emergency24 ? '🚨 ' : '🗓️ '}
                {content.holiday}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>🚗 භාරගන්නා වාහන වර්ග</Text>
          <View style={styles.chipWrap}>
            {content.vehicleTypes.map((v) => (
              <View key={v} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{v}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.sectionTitle}>🔧 විශේෂඥතාව ඇති වාහන බ්‍රෑන්ඩ්</Text>
          <View style={styles.chipWrap}>
            {content.brands.map((b) => (
              <View key={b} style={[styles.tagChip, styles.tagChipBrand]}>
                <Text style={[styles.tagChipText, styles.tagChipBrandText]}>{b}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>👷 කාර්ය මණ්ඩලය</Text>
          <View style={styles.box}>
            {content.staff.map((st) => (
              <View key={st.id} style={styles.staffRow}>
                <View style={[styles.staffAvatar, { backgroundColor: avatarColor(st.id + g.id) }]}>
                  <Text style={styles.staffAvatarText}>{st.name.slice(0, 1)}</Text>
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.infoValue}>{st.name}</Text>
                  <Text style={styles.sub}>
                    {st.role} · අත්දැකීම් වසර {st.years}
                  </Text>
                </View>
                <View style={styles.certPill}>
                  <Text style={styles.certPillText}>{st.cert}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>🏢 ගරාජයේ පහසුකම්</Text>
          <View style={styles.chipWrap}>
            {content.facilities.map((f) => (
              <View key={f} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{f}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>💰 සේවා ගාස්තු</Text>
          <View style={styles.box}>
            {content.rates.map((r) => (
              <View key={r.id} style={styles.rateRow}>
                <Text style={styles.rateName} numberOfLines={1}>
                  {r.icon} {r.name}
                </Text>
                <Text style={styles.ratePrice}>රු. {r.labour.toLocaleString()} සිට</Text>
              </View>
            ))}
            <Text style={styles.sub}>ශ්‍රම ගාස්තු පමණි (කොටස් වෙනම). නිශ්චිත මිල ලැබෙන්නේ වාහනය පරීක්ෂා කළ පසුවය. පැකේජ මිල ගණන් සඳහා “දළ විස්තරය” බලන්න.</Text>
          </View>

          <Text style={styles.sectionTitle}>🏅 සහතික සහ අනුමැතිය</Text>
          <View style={styles.box}>
            {content.certifications.map((c) => (
              <View key={c.id} style={styles.certRow}>
                <Text style={styles.infoIcon}>{c.icon}</Text>
                <View style={styles.flex1}>
                  <Text style={styles.infoValue}>{c.title}</Text>
                  <Text style={styles.sub}>{c.note}</Text>
                </View>
              </View>
            ))}
          </View>
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

      {!!g.recentReviews?.length && (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow} snapToInterval={REVIEW_W + 8} decelerationRate="fast">
      {g.recentReviews.map((r) => (
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
      </ScrollView>
      )}
      {!g.recentReviews?.length && <EmptyState icon="⭐" title="තවම සමාලෝචන නැත" text="පාරිභෝගිකයන් සමාලෝචන ලියූ විට ඒවා මෙහි පෙන්වයි." />}
        </>
      )}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    tabs: { flexDirection: 'row', marginTop: 8, borderBottomWidth: 1, borderBottomColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0' },
    tabBtn: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderBottomWidth: 3, borderBottomColor: 'transparent' },
    tabBtnOn: { borderBottomColor: '#1a73e8' },
    tabText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    tabTextOn: { color: '#1a73e8', fontFamily: FONTS.bodyBold },
    sectionTitle: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary, letterSpacing: 0.2, marginTop: 0 },
    hRow: { gap: 6, paddingRight: 6 },
    offerCard: { width: 150, padding: 8, borderRadius: 12, gap: 2 },
    offerCardIcon: { fontSize: 22 },
    offerCardTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: '#ffffff', lineHeight: 17 },
    offerCardDetail: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: 'rgba(255,255,255,0.85)' },
    sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 0 },
    sectionTitleBare: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary, letterSpacing: 0.2 },
    jobsPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(16, 185, 129, 0.15)' },
    jobsPillText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: Colors.success },
    serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    serviceTile: { width: 140, gap: 3, padding: 12, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    serviceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    serviceIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    serviceTileName: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain, lineHeight: 17, minHeight: 34 },
    jobsTrack: { height: 5, borderRadius: 3, backgroundColor: Colors.subtleFill, overflow: 'hidden', marginTop: 2 },
    jobsFill: { height: 5, borderRadius: 3 },
    jobsText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
    moreBtn: { alignSelf: 'center', paddingHorizontal: 16, height: 36, borderRadius: 8, justifyContent: 'center', backgroundColor: 'rgba(36, 87, 230, 0.1)' },
    moreBtnText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#2457e6' },
    gig: { width: 210, borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    gigImg: { width: '100%', height: 104, backgroundColor: Colors.subtleFill },
    gigTag: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 10, height: 24, borderRadius: 12, justifyContent: 'center' },
    gigTagText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    gigBody: { padding: 12, gap: 3 },
    gigTitle: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain, lineHeight: 17 },
    gigMeta: { flexDirection: 'row', justifyContent: 'space-between' },
    gigMetaText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
    gigBtn: { alignSelf: 'flex-start', marginTop: 2, paddingHorizontal: 14, height: 30, borderRadius: 8, justifyContent: 'center', backgroundColor: '#2457e6' },
    gigBtnText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    serviceList: { borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), overflow: 'hidden', ...elevation1() },
    serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
    serviceIcon: { fontSize: 22 },
    serviceName: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    newBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, backgroundColor: '#ef4444' },
    newBadgeText: { fontSize: 10, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    photoTile: { width: 128, gap: 5 },
    photoImg: { width: 128, height: 128, borderRadius: 12, backgroundColor: Colors.subtleFill },
    photoCaption: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    reel: { width: 118, height: 190, borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.subtleFill },
    reelImg: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
    reelShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5, 10, 25, 0.38)' },
    reelPlay: { position: 'absolute', top: 70, left: 39, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.88)' },
    reelPlayText: { fontSize: 15, color: '#1b2a49', marginLeft: 2 },
    reelLength: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.55)' },
    reelLengthText: { fontSize: 10, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    reelMeta: { position: 'absolute', left: 8, right: 8, bottom: 8, gap: 2 },
    reelTitle: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#ffffff', lineHeight: 14 },
    reelViews: { fontSize: 10, fontFamily: FONTS.bodyMedium, color: 'rgba(255,255,255,0.85)' },
    mapCard: { borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    mapBox: { height: 60, backgroundColor: Colors.subtleFill },
    mapPin: { position: 'absolute', transform: [{ translateX: -8 }, { translateY: -20 }] },
    mapPinEmoji: { fontSize: 18 },
    mapFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 6 },
    dirBtn: { paddingHorizontal: 11, height: 28, borderRadius: 8, justifyContent: 'center', backgroundColor: '#2457e6' },
    dirBtnText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    coverWrap: { height: 360, overflow: 'hidden', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
    cover: { width: '100%', height: '100%' },
    coverSlide: { height: '100%' },
    coverPlay: { position: 'absolute', alignSelf: 'center', top: '38%', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 2, borderColor: '#ffffff' },
    coverPlayText: { fontSize: 22, color: '#ffffff', marginLeft: 3 },
    coverCount: { position: 'absolute', right: 16, bottom: 46, paddingHorizontal: 10, height: 22, borderRadius: 11, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
    coverCountText: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    coverVideoTag: { position: 'absolute', left: 16, top: 64, maxWidth: '70%', paddingHorizontal: 10, height: 24, borderRadius: 12, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    coverVideoTagText: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    coverDots: { position: 'absolute', left: 0, right: 0, bottom: 44, flexDirection: 'row', justifyContent: 'center', gap: 5 },
    coverDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
    coverDotOn: { width: 16, backgroundColor: '#ffffff' },
    coverShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(8, 16, 36, 0.22)' },
    coverGrip: { position: 'absolute', top: 8, alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)' },
    coverClose: { position: 'absolute', top: 16, right: 16, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
    coverCloseText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
    statusPill: { position: 'absolute', left: 16, top: 16, paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center' },
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
    statRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 6, marginTop: 14, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    stat: { flex: 1, alignItems: 'center', gap: 2 },
    statValue: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    statLabel: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    statDivider: { width: 1, height: 26, backgroundColor: Colors.borderColor },
    contactLine: { fontSize: 13, fontFamily: FONTS.bodyMedium, color: Colors.textSoft, lineHeight: 18 },
    offerChip: { alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(245, 158, 11, 0.16)' },
    offerText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: Colors.warning },
    box: { padding: 12, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), gap: 4, ...elevation1() },
    dimRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dimLabel: { width: 118, fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textSoft },
    track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.subtleFill, overflow: 'hidden' },
    fill: { height: 6, borderRadius: 3, backgroundColor: Colors.warning },
    dimValue: { width: 26, textAlign: 'right', fontSize: 11, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    review: { width: REVIEW_W, padding: 14, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), gap: 4, ...elevation1() },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    customer: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    stars: { fontSize: 13, color: Colors.warning },
    starsOff: { color: Colors.subtleBorder },
    text: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 20 },
    sub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
    reply: { marginTop: 4, padding: 10, borderRadius: 8, backgroundColor: Colors.subtleFill, gap: 2 },
    protected: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 17 },
    actions: { flexDirection: 'row', gap: 8 },
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    bidHero: { padding: 16, gap: 12, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(96, 165, 250, 0.16)' : '#e3eeff' },
    bidHeroTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bidHeroLabel: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#93c5fd' : '#1e4fa8' },
    bidHeroPrice: { fontSize: 26, lineHeight: 32, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#dbeafe' : '#0f2f6b', letterSpacing: -0.5 },
    bidHeroTag: { paddingHorizontal: 12, height: 26, borderRadius: 8, justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(147, 197, 253, 0.22)' : '#c7dcfb' },
    bidHeroTagText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#93c5fd' : '#1e4fa8' },
    bidHeroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    bidHeroChip: { paddingHorizontal: 11, height: 28, borderRadius: 8, justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)' },
    bidHeroChipText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#bfdbfe' : '#1e3f86' },
    place: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 4, gap: 6 },
    placeTop: { flexDirection: 'row', alignItems: 'center', gap: 16},
    placeLogo: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    placeLogoText: { fontSize: 18, fontFamily: FONTS.titleBold, color: '#ffffff', letterSpacing: 0.5 },
    placeName: { fontSize: 22, lineHeight: 28, fontFamily: FONTS.titleBold, color: Colors.textMain, letterSpacing: -0.2 },
    placeRating: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 4},
    placeRatingNum: { fontSize: 13.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    placeStars: { fontSize: 14, color: '#fbbc04', letterSpacing: 1 },
    placeMuted: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    placeType: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    placeStatus: { fontSize: 13, fontFamily: FONTS.bodyRegular },
    placeOpen: { fontFamily: FONTS.bodyBold, color: '#188038' },
    placeClosed: { fontFamily: FONTS.bodyBold, color: '#d93025' },
    placeActions: { gap: 16, paddingTop: 12, paddingBottom: 4, paddingRight: 6 },
    placeAction: { alignItems: 'center', gap: 8, minWidth: 64},
    placeActionCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#ffffff', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0' },
    placeActionPrimary: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
    placeActionOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(229, 72, 61, 0.16)' : '#fdecea', borderColor: '#f5b5b0' },
    placeActionIcon: { fontSize: 19, color: '#1a73e8' },
    placeActionLabel: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    gmList: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e8eaed', marginHorizontal: 4 },
    gmRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: getThemeMode() === 'dark' ? Colors.borderColor : '#f1f3f4' },
    gmIcon: { width: 22, fontSize: 16, textAlign: 'center' },
    gmText: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 18 },
    infoLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    infoIcon: { fontSize: 18, width: 26, textAlign: 'center' },
    infoValue: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    infoAction: { fontSize: 11, fontFamily: FONTS.bodyBold, color: Colors.primary },
    hourRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8 },
    hourRowToday: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e3ecfd' },
    hourDay: { fontSize: 13, fontFamily: FONTS.bodyMedium, color: Colors.textMain },
    hourTime: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    hourClosed: { color: Colors.errorText },
    hourToday: { fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1e4fa8' },
    noteBox: { padding: 10, borderRadius: 8, backgroundColor: Colors.subtleFill },
    noteBoxOn: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
    noteText: { fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textSoft, lineHeight: 17 },
    noteTextOn: { color: Colors.errorText, fontFamily: FONTS.bodySemiBold },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tagChip: { paddingHorizontal: 12, height: 32, borderRadius: 8, justifyContent: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
    tagChipText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    tagChipBrand: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e3ecfd', borderColor: 'transparent' },
    tagChipBrandText: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1e4fa8' },
    staffRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    staffAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    staffAvatarText: { fontSize: 14, fontFamily: FONTS.titleBold, color: '#ffffff' },
    certPill: { paddingHorizontal: 8, height: 22, borderRadius: 6, justifyContent: 'center', backgroundColor: 'rgba(16, 185, 129, 0.14)' },
    certPillText: { fontSize: 9.5, fontFamily: FONTS.bodyBold, color: Colors.successText },
    rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    rateName: { flex: 1, fontSize: 13.5, fontFamily: FONTS.bodyMedium, color: Colors.textMain },
    ratePrice: { fontSize: 13.5, fontFamily: FONTS.bodyBold, color: Colors.successText },
    certRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bidPrice: { fontSize: 17, fontFamily: FONTS.titleBold, color: Colors.success },
    replyLabel: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  })
);
