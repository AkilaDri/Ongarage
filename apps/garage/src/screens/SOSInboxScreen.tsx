import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import {
  ActionButton,
  breakdownInfo,
  Colors,
  etaMinutes,
  FONTS,
  getThemeMode,
  GlassIcon,
  glassStyle,
  GoogleMap,
  Gradient,
  GRADIENTS,
  Icon,
  kmToMapPixels,
  Pulse,
  themedStyles,
  vehicleIcon,
  zoomToFit,
  type BreakdownId,
  softEdge,
  softShadow,
  softCard,
  softFill,
} from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { AttendanceSheet } from '../components/AttendanceSheet';
import { STAGE_LABEL } from './SOSDispatchScreen';
import { ago, money } from '../utils/format';
import type { SOSRequest } from '../types';

const NAV_H = 72; // the app's bottom tab bar overlays this screen
const PEEK_H = 124; // handle + breakdown category icons
const BANNER_GAP = 12;
const SWIPE_V = 0.4;
const CALLOUT_W = 252;

type SheetState = 'peek' | 'expanded';

export const SOSInboxScreen: React.FC = () => {
  const { profile, isOpen, setOpen, requests, activeJobs, crew, sosBlocked, declineRequest, openDispatch, resumeDispatch } = useGarage();
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [stackH, setStackH] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [areaH, setAreaH] = useState(0);
  const [bannerH, setBannerH] = useState(120);
  const [sheet, setSheet] = useState<SheetState>('peek');
  const [filter, setFilter] = useState<BreakdownId | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [calloutH, setCalloutH] = useState(160);
  const { width: screenW } = useWindowDimensions();
  const calloutAnim = useRef(new Animated.Value(0)).current;
  const selected = requests.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;
    calloutAnim.setValue(0);
    Animated.spring(calloutAnim, { toValue: 1, stiffness: 260, damping: 20, useNativeDriver: true }).start();
  }, [selectedId, calloutAnim]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // The banner (and the map slid down beneath it) only shows when there is
  // something to say: requests waiting, or the garage being offline.
  const showBanner = !isOpen || requests.length > 0;
  const bannerOffset = bannerH + BANNER_GAP;
  const mapH = Math.max(0, areaH - NAV_H);
  const expandedH = Math.max(PEEK_H + 1, areaH - NAV_H - (showBanner ? bannerOffset : 0) - 8);

  // ---------- Banner + map slide ----------
  const bannerAnim = useRef(new Animated.Value(showBanner ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(bannerAnim, { toValue: showBanner ? 1 : 0, stiffness: 160, damping: 20, useNativeDriver: true }).start();
  }, [showBanner, bannerAnim]);

  // ---------- Requests sheet ----------
  const sheetH = useRef(new Animated.Value(PEEK_H)).current;
  const currentH = useRef(PEEK_H);
  const dragStart = useRef(PEEK_H);
  const sheetRef = useRef<SheetState>('peek');
  sheetRef.current = sheet;
  const heights = useRef({ peek: PEEK_H, expanded: expandedH });
  heights.current = { peek: PEEK_H, expanded: expandedH };
  const listRef = useRef<ScrollView>(null);
  const listY = useRef(0);

  useEffect(() => {
    const id = sheetH.addListener(({ value }) => (currentH.current = value));
    return () => sheetH.removeListener(id);
  }, [sheetH]);

  const animateTo = (target: SheetState, velocity = 0) => {
    setSheet(target);
    sheetRef.current = target;
    if (target === 'peek') {
      listRef.current?.scrollTo({ y: 0, animated: true });
      listY.current = 0;
    }
    Animated.spring(sheetH, { toValue: heights.current[target], velocity, stiffness: 200, damping: 25, useNativeDriver: false }).start();
  };

  // Keep the expanded sheet glued under the banner when the banner appears or goes.
  useEffect(() => {
    if (!areaH) return;
    Animated.spring(sheetH, { toValue: heights.current[sheetRef.current], stiffness: 200, damping: 25, useNativeDriver: false }).start();
  }, [areaH, expandedH, sheetH]);

  // Nothing left to show: fold the list away.
  useEffect(() => {
    if (requests.length === 0 && sheetRef.current === 'expanded') animateTo('peek');
    if (filter && !requests.some((r) => r.breakdownId === filter)) setFilter(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  const settle = (vy: number) => {
    const h = currentH.current;
    const { peek, expanded } = heights.current;
    let target: SheetState;
    if (vy < -SWIPE_V) target = 'expanded';
    else if (vy > SWIPE_V) target = 'peek';
    else target = h - peek > (expanded - peek) / 2 ? 'expanded' : 'peek';
    animateTo(target, -vy);
  };

  // Vertical drags move the sheet, except while the expanded list is scrolled
  // into its content: then the list scrolls until it is back at the latest request.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => {
        if (Math.abs(g.dy) < 6 || Math.abs(g.dy) < Math.abs(g.dx)) return false;
        if (sheetRef.current === 'peek') return true;
        return g.dy > 0 && listY.current <= 0;
      },
      onPanResponderGrant: () => {
        sheetH.stopAnimation();
        dragStart.current = currentH.current;
      },
      onPanResponderMove: (_, g) => {
        const { peek, expanded } = heights.current;
        const raw = dragStart.current - g.dy;
        const h = raw > expanded ? expanded + (raw - expanded) * 0.25 : raw < peek ? peek - (peek - raw) * 0.25 : raw;
        sheetH.setValue(h);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => settle(g.vy),
      onPanResponderTerminate: (_, g) => settle(g.vy),
    })
  ).current;

  // Cross-fade between the category icons and the request list as the sheet moves.
  const span = Math.max(1, expandedH - PEEK_H);
  const chipsOpacity = sheetH.interpolate({ inputRange: [PEEK_H, PEEK_H + span * 0.35], outputRange: [1, 0], extrapolate: 'clamp' });
  const chipsShift = sheetH.interpolate({ inputRange: [PEEK_H, PEEK_H + span * 0.35], outputRange: [0, -18], extrapolate: 'clamp' });
  const chipsScale = sheetH.interpolate({ inputRange: [PEEK_H, PEEK_H + span * 0.35], outputRange: [1, 0.92], extrapolate: 'clamp' });
  const listOpacity = sheetH.interpolate({ inputRange: [PEEK_H + span * 0.2, PEEK_H + span * 0.6], outputRange: [0, 1], extrapolate: 'clamp' });
  const listShift = sheetH.interpolate({ inputRange: [PEEK_H + span * 0.2, PEEK_H + span * 0.6], outputRange: [28, 0], extrapolate: 'clamp' });
  const mapDim = sheetH.interpolate({ inputRange: [PEEK_H, PEEK_H + span], outputRange: [0, getThemeMode() === 'dark' ? 0.5 : 0.25], extrapolate: 'clamp' });

  // ---------- Data ----------
  const groups = useMemo(() => {
    const order: BreakdownId[] = [];
    const counts: Record<string, number> = {};
    for (const r of requests) {
      if (!counts[r.breakdownId]) order.push(r.breakdownId);
      counts[r.breakdownId] = (counts[r.breakdownId] ?? 0) + 1;
    }
    return order.map((id) => ({ id, count: counts[id] }));
  }, [requests]);
  const listed = filter ? requests.filter((r) => r.breakdownId === filter) : requests;

  const lat = profile.coords.latitude;
  // Frame the requests when there are some, otherwise the whole coverage area.
  const farthest = requests.length ? Math.max(1.2, ...requests.map((r) => r.distanceKm)) : profile.coverageKm;
  const zoom = zoomToFit(Math.min(farthest, profile.coverageKm) * 2.4, lat, Math.max(200, mapH - PEEK_H - (showBanner ? bannerOffset : 0)));
  // Until today's attendance is confirmed, a prompt replaces capacity.
  const needsAttendance = isOpen && !crew.confirmed;
  // The active-job card sits just below the floating banner so it is never covered.
  const activeTop = (showBanner ? bannerOffset : 0) + 8;

  const accept = (r: SOSRequest) => {
    openDispatch(r.id);
  };

  // ---------- Map callout for a tapped request pin ----------
  const renderCallout = (p: { x: number; y: number } | null, r: SOSRequest) => {
    if (!p) return null;
    const info = breakdownInfo(r.breakdownId);
    const left = Math.min(Math.max(p.x - CALLOUT_W / 2, 12), screenW - CALLOUT_W - 12);
    // Above the pin unless that would slide under the banner/job cards; then below it,
    // unless that would slide under the category sheet. Clamp into the visible map.
    const minTop = (showBanner ? bannerOffset : 0) + (stackH ? stackH + 8 : 0) + 8;
    const maxBottom = mapH - PEEK_H - 8;
    const roomAbove = p.y - 24 - minTop;
    const roomBelow = maxBottom - (p.y + 24);
    const above = roomAbove >= calloutH || (roomBelow < calloutH && roomAbove >= roomBelow);
    const ideal = above ? p.y - calloutH - 24 : p.y + 24;
    const top = Math.max(minTop, Math.min(ideal, maxBottom - calloutH));
    const caretX = Math.min(Math.max(p.x - left - 7, 18), CALLOUT_W - 32);
    return (
      <Animated.View
        onLayout={(e) => setCalloutH(e.nativeEvent.layout.height)}
        style={[
          styles.callout,
          {
            left,
            top,
            opacity: calloutAnim,
            transform: [
              { translateY: calloutAnim.interpolate({ inputRange: [0, 1], outputRange: [above ? 10 : -10, 0] }) },
              { scale: calloutAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
            ],
          },
        ]}
      >
        <View style={[styles.caret, above ? styles.caretDown : styles.caretUp, { left: caretX }]} />
        <View style={styles.row}>
          <GlassIcon emoji={info.icon} small />
          <View style={styles.flex1}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {info.label}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {vehicleIcon(r.vehicle.type)} {r.vehicle.name} · {r.customer.name}
            </Text>
          </View>
          <Pressable style={styles.calloutClose} onPress={() => setSelectedId(null)} hitSlop={8} accessibilityLabel="Close">
            <Icon name="x" size={12} strokeWidth={2.5} color={Colors.textMuted} />
          </Pressable>
        </View>
        <View style={styles.chips}>
          <InfoChip text={`📍 කි.මී. ${r.distanceKm} · මිනි. ~${etaMinutes(r.distanceKm)}`} />
          <InfoChip text={`🚐 පැමිණීමේ ගාස්තුව ${money(r.calloutFee)}`} earn />
          <InfoChip text={`⏱️ ${ago(now - r.requestedAt)}`} />
        </View>
        <ActionButton
          label={sosBlocked ?? 'ඉල්ලීම විවෘත කරන්න'}
          icon="🚨"
          variant="sos"
          disabled={!!sosBlocked}
          onPress={() => {
            setSelectedId(null);
            accept(r);
          }}
        />
      </Animated.View>
    );
  };

  // ---------- Pieces ----------
  const banner = isOpen ? (
    <View style={[styles.banner, styles.sosBanner]}>
      {/* Solid red, like the owner app's SOS banner. */}
      <View style={styles.bannerGlass} pointerEvents="none">
        <Gradient stops={GRADIENTS.sos} />
      </View>
      <View style={styles.flex1}>
        <View style={styles.liveBadge}>
          <Pulse style={styles.liveDot} />
          <Text style={styles.liveText}>සජීවී · කි.මී. {profile.coverageKm} කලාපය</Text>
        </View>
        <Text style={styles.bannerTitle}>හදිසි SOS ඉල්ලීම් ලැබෙමින්</Text>
        <Text style={styles.bannerDesc}>ඔබගේ කලාපයේ නතර වූ වාහන හිමියන් ඔබ වෙත දැනුම් දෙනු ලැබේ.</Text>
        <View style={styles.crewBadge}>
          <Text style={styles.crewText}>
            👨‍🔧 {crew.confirmed ? `නිදහස් කාර්මිකයන් ${crew.free}/${crew.presentIds.length}` : 'අද පැමිණීම තහවුරු කර නැත'}
          </Text>
        </View>
      </View>
      <View style={styles.countTile}>
        <Text style={styles.countNum}>{requests.length}</Text>
        <Text style={styles.countLabel}>නව</Text>
      </View>
    </View>
  ) : (
    <View style={[styles.card, styles.offlineCard]}>
      <GlassIcon emoji="⏸️" />
      <View style={styles.flex1}>
        <Text style={styles.cardTitle}>ඔබ දැන් නොබැඳියි</Text>
        <Text style={styles.sub}>නව SOS ඉල්ලීම් ලැබීමට සබැඳි වන්න.</Text>
      </View>
      <Pressable style={styles.goOnline} onPress={() => setOpen(true)}>
        <Text style={styles.goOnlineText}>සබැඳි වන්න</Text>
      </Pressable>
    </View>
  );

  const requestCard = (r: SOSRequest) => {
    const info = breakdownInfo(r.breakdownId);
    return (
      <View key={r.id} style={styles.card}>
        <View style={styles.row}>
          <GlassIcon emoji={info.icon} />
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>{info.label}</Text>
            <Text style={styles.sub}>
              {vehicleIcon(r.vehicle.type)} {r.vehicle.name} · {r.vehicle.plate}
            </Text>
          </View>
          <View style={styles.agePill}>
            <Text style={styles.ageText}>{ago(now - r.requestedAt)}</Text>
          </View>
        </View>
        {!!r.note && <Text style={styles.note}>“{r.note}”</Text>}
        <View style={styles.chips}>
          <InfoChip text={`👤 ${r.customer.name}`} />
          <InfoChip text={`📍 කි.මී. ${r.distanceKm} · මිනි. ~${etaMinutes(r.distanceKm)}`} />
          <InfoChip text={`🚐 ඔබට පැමිණීමේ ගාස්තුව ${money(r.calloutFee)}`} earn />
        </View>
        <Text style={styles.address} numberOfLines={1}>
          {r.location.address}
        </Text>
        <View style={styles.actions}>
          <ActionButton label="ප්‍රතික්ෂේප" variant="ghost" compact onPress={() => declineRequest(r.id)} />
          <ActionButton label="බලා පිළිගන්න" icon="🚨" variant="sos" compact disabled={!!sosBlocked} onPress={() => accept(r)} />
        </View>
        {!!sosBlocked && isOpen && (
          <Text style={styles.hint}>
            {!crew.confirmed
              ? 'අද පැමිණ සිටින කාර්මිකයන් තහවුරු කළ පසු SOS භාර ගත හැක.'
              : crew.presentIds.length === 0
                ? 'අද කාර්මිකයන් පැමිණ නැති බැවින් SOS භාර ගත නොහැක.'
                : `අද පැමිණ සිටින කාර්මිකයන් ${crew.presentIds.length} දෙනාම SOS රැකියාවල — එකක් අවසන් වූ පසු නව ඉල්ලීමක් භාර ගත හැක.`}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.flex1} onLayout={(e) => setAreaH(e.nativeEvent.layout.height)}>
      {/* Full-screen map; the banner floats over it. */}
      <Animated.View
        style={[
          styles.mapLayer,
          { height: mapH },
        ]}
      >
        {mapH > 0 && (
          <GoogleMap
            style={StyleSheet.absoluteFill}
            center={profile.coords}
            zoom={zoom}
            fallbackColor="#ef4444"
            renderOverlay={(project) => {
              const g = project(profile.coords);
              return (
                <>
                  {selected && <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedId(null)} />}
                  {g && (
                    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
                      <Circle
                        cx={g.x}
                        cy={g.y}
                        r={kmToMapPixels(profile.coverageKm, lat, zoom)}
                        fill={isOpen ? 'rgba(239, 68, 68, 0.08)' : 'rgba(148, 163, 184, 0.08)'}
                        stroke={isOpen ? 'rgba(239, 68, 68, 0.7)' : 'rgba(148, 163, 184, 0.6)'}
                        strokeWidth={1.5}
                        strokeDasharray="6 4"
                      />
                    </Svg>
                  )}
                  {requests.map((r) => {
                    const p = project(r.location.coords);
                    return p ? (
                      <Pressable
                        key={r.id}
                        hitSlop={10}
                        accessibilityLabel={breakdownInfo(r.breakdownId).label}
                        style={[styles.pinAnchor, { left: p.x, top: p.y }, r.id === selectedId && styles.pinRaised]}
                        onPress={() => setSelectedId(r.id === selectedId ? null : r.id)}
                      >
                        <View style={[styles.requestPin, r.id === selectedId && styles.requestPinSelected]}>
                          <Text style={styles.pinEmoji}>{breakdownInfo(r.breakdownId).icon}</Text>
                        </View>
                      </Pressable>
                    ) : null;
                  })}
                  {g && (
                    <View style={[styles.pinAnchor, { left: g.x, top: g.y }]} pointerEvents="none">
                      {isOpen && <Pulse style={styles.garagePulse} maxScale={1.8} />}
                      <View style={styles.garagePin}>
                        <Text style={styles.pinEmoji}>🛠️</Text>
                      </View>
                    </View>
                  )}
                  {selected && renderCallout(project(selected.location.coords), selected)}
                </>
              );
            }}
          />
        )}

        {/* Below the banner: today's attendance prompt and every job in progress. */}
        <View style={[styles.topStack, { top: activeTop }]} onLayout={(e) => setStackH(e.nativeEvent.layout.height)} pointerEvents="box-none">
          {needsAttendance && (
            <Pressable style={({ pressed }) => [styles.attendCard, pressed && styles.pressed]} onPress={() => setAttendanceOpen(true)}>
              <GlassIcon emoji="👨‍🔧" small />
              <View style={styles.flex1}>
                <Text style={styles.attendTitle}>අද පැමිණ සිටින කාර්මිකයන් තහවුරු කරන්න</Text>
                <Text style={styles.sub}>තහවුරු කරන තුරු SOS භාර ගත නොහැක</Text>
              </View>
              <View style={styles.attendPill}>
                <Text style={styles.resumeText}>තහවුරු කරන්න</Text>
              </View>
            </Pressable>
          )}
          {activeJobs.map((job) => (
            <Pressable key={job.id} style={({ pressed }) => [styles.activeCard, pressed && styles.pressed]} onPress={() => resumeDispatch(job.id)}>
              <GlassIcon emoji={breakdownInfo(job.request.breakdownId).icon} small />
              <View style={styles.flex1}>
                <Text style={styles.activeLabel} numberOfLines={1}>
                  ● {STAGE_LABEL[job.stage]}
                </Text>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {breakdownInfo(job.request.breakdownId).label} · {job.request.customer.name}
                </Text>
              </View>
              <View style={styles.resumePill}>
                <Text style={styles.resumeText}>ඉදිරියට ›</Text>
              </View>
            </Pressable>
          ))}
        </View>
        <Animated.View pointerEvents="none" style={[styles.mapDim, { opacity: mapDim }]} />
      </Animated.View>
      <AttendanceSheet visible={attendanceOpen} onClose={() => setAttendanceOpen(false)} />

      {/* Banner slides in from above. */}
      <Animated.View
        pointerEvents={showBanner ? 'auto' : 'none'}
        onLayout={(e) => setBannerH(e.nativeEvent.layout.height)}
        style={[
          styles.bannerLayer,
          {
            opacity: bannerAnim,
            transform: [{ translateY: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [-(bannerOffset + 10), 0] }) }],
          },
        ]}
      >
        {banner}
      </Animated.View>

      {/* Requests sheet: category icons when folded, full list when expanded. */}
      <Animated.View style={[styles.sheet, { height: sheetH }]} {...pan.panHandlers}>
        <Pressable style={styles.handleHit} onPress={() => animateTo(sheet === 'peek' ? 'expanded' : 'peek')} hitSlop={10}>
          <View style={styles.handle} />
        </Pressable>

        <Animated.View
          pointerEvents={sheet === 'peek' ? 'auto' : 'none'}
          style={[styles.chipsLayer, { opacity: chipsOpacity, transform: [{ translateY: chipsShift }, { scale: chipsScale }] }]}
        >
          {groups.length === 0 ? (
            <View style={styles.emptyPeek}>
              <Text style={styles.emptyPeekIcon}>📡</Text>
              <Text style={styles.sub}>{isOpen ? 'නව SOS ඉල්ලීම් බලාපොරොත්තුවෙන්...' : 'සබැඳි වූ පසු SOS ඉල්ලීම් මෙහි පෙන්වනු ඇත.'}</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {groups.map((g) => (
                <CategoryIcon
                  key={g.id}
                  id={g.id}
                  count={g.count}
                  onPress={() => {
                    setFilter(g.id);
                    animateTo('expanded');
                  }}
                />
              ))}
            </ScrollView>
          )}
        </Animated.View>

        <Animated.View
          pointerEvents={sheet === 'expanded' ? 'auto' : 'none'}
          style={[styles.listLayer, { opacity: listOpacity, transform: [{ translateY: listShift }] }]}
        >
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>ලැබුණු ඉල්ලීම් ({requests.length})</Text>
            {filter && (
              <Pressable style={styles.filterPill} onPress={() => setFilter(null)}>
                <Text style={styles.filterText}>
                  {breakdownInfo(filter).icon} {breakdownInfo(filter).label} ✕
                </Text>
              </Pressable>
            )}
            <Pressable style={styles.minimize} onPress={() => animateTo('peek')} hitSlop={8} accessibilityLabel="Minimize">
              <Icon name="chevron-down" size={16} strokeWidth={2.5} color={Colors.primary} />
            </Pressable>
          </View>
          <ScrollView
            ref={listRef}
            style={styles.flex1}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              listY.current = e.nativeEvent.contentOffset.y;
            }}
          >
            {listed.map(requestCard)}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

// A breakdown category in the folded sheet: glass icon with a red count badge
// (same badge style as the tab counters) that pops when a new request arrives.
const CategoryIcon: React.FC<{ id: BreakdownId; count: number; onPress: () => void }> = ({ id, count, onPress }) => {
  const info = breakdownInfo(id);
  const pop = useRef(new Animated.Value(0)).current;
  const prev = useRef(count);

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }).start();
  }, [pop]);

  useEffect(() => {
    if (count > prev.current) {
      pop.setValue(0.6);
      Animated.spring(pop, { toValue: 1, friction: 3, tension: 160, useNativeDriver: true }).start();
    }
    prev.current = count;
  }, [count, pop]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.catItem, pressed && { transform: [{ scale: 0.94 }] }]}>
      <Animated.View style={[styles.catTile, { transform: [{ scale: pop }] }]}>
        <Text style={styles.catEmoji}>{info.icon}</Text>
        <View style={styles.catBadge}>
          <Text style={styles.catBadgeText}>{count}</Text>
        </View>
      </Animated.View>
      <Text style={styles.catLabel} numberOfLines={1}>
        {info.label}
      </Text>
    </Pressable>
  );
};

// earn: money the garage receives (the call-out fee is the technician's, not OnGarage's).
const InfoChip: React.FC<{ text: string; earn?: boolean }> = ({ text, earn }) => (
  <View style={[styles.chip, earn && styles.chipEarn]}>
    <Text style={[styles.chipText, earn && { color: Colors.successText }]}>{text}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    pressed: { transform: [{ scale: 0.98 }] },

    mapLayer: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: Colors.mapBg, overflow: 'hidden' },
    mapDim: { ...StyleSheet.absoluteFill, backgroundColor: '#000' },
    bannerLayer: { position: 'absolute', top: 12, left: 16, right: 16, zIndex: 5 },

    banner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, padding: 16, overflow: 'hidden' },
    sosBanner: { backgroundColor: '#dc2626', shadowColor: '#dc2626', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 18, elevation: 6 },
    bannerGlass: { ...StyleSheet.absoluteFill },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(255, 255, 255, 0.18)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginBottom: 4 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
    liveText: { fontSize: 9.5, fontWeight: '800', color: '#fff' },
    bannerTitle: { fontSize: 17, fontFamily: FONTS.titleBold, color: '#fff' },
    bannerDesc: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 16, marginTop: 2 },
    countTile: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderWidth: 3, borderColor: 'rgba(255, 255, 255, 0.85)', justifyContent: 'center', alignItems: 'center' },
    countNum: { fontSize: 20, fontWeight: '900', color: '#fff', lineHeight: 22 },
    countLabel: { fontSize: 9.5, fontFamily: FONTS.bodyBold, color: '#fff' },

    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 20, padding: 14, gap: 10, ...softShadow() },
    offlineCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    goOnline: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: Colors.success },
    goOnlineText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: '#fff' },
    topStack: { position: 'absolute', left: 16, right: 16, zIndex: 6, gap: 8 },
    crewBadge: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.18)' },
    crewText: { fontSize: 10, fontWeight: '800', color: '#fff' },
    attendCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingLeft: 12, borderRadius: 22, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(245, 158, 11, 0.5)' : 'transparent', ...softShadow() },
    attendTitle: { fontSize: 12.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    attendPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: Colors.warning },
    activeCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingLeft: 12, borderRadius: 22, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(16, 185, 129, 0.5)' : 'transparent', ...softShadow() },
    activeLabel: { fontSize: 10, fontFamily: FONTS.bodySemiBold, color: Colors.success },
    resumePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: Colors.success },
    resumeText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#fff' },
    cardTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },

    pinAnchor: { position: 'absolute', transform: [{ translateX: '-50%' }, { translateY: '-50%' }], alignItems: 'center', justifyContent: 'center' },
    requestPin: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#ef4444', borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#dc2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 5 },
    pinRaised: { zIndex: 3 },
    requestPinSelected: { transform: [{ scale: 1.25 }], shadowOpacity: 0.7, shadowRadius: 16 },
    callout: { position: 'absolute', width: CALLOUT_W, zIndex: 10, padding: 14, gap: 10, borderRadius: 24, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), shadowColor: '#0f172a', shadowOffset: { width: 0, height: 14 }, shadowOpacity: getThemeMode() === 'dark' ? 0.55 : 0.22, shadowRadius: 28, elevation: 14 },
    caret: { position: 'absolute', width: 16, height: 16, borderRadius: 3, backgroundColor: Colors.bgCard, borderColor: softEdge(), transform: [{ rotate: '45deg' }] },
    caretDown: { bottom: -7, borderRightWidth: 1, borderBottomWidth: 1 },
    caretUp: { top: -7, borderLeftWidth: 1, borderTopWidth: 1 },
    calloutClose: { width: 30, height: 30, borderRadius: 15, backgroundColor: softFill(), justifyContent: 'center', alignItems: 'center' },
    garagePulse: { position: 'absolute', width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'rgba(16, 185, 129, 0.6)' },
    garagePin: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.success, borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
    pinEmoji: { fontSize: 14 },

    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: NAV_H,
      userSelect: 'none',
      backgroundColor: Colors.sheetBg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: getThemeMode() === 'dark' ? 0.6 : 0.12,
      shadowRadius: 20,
      elevation: 14,
    },
    handleHit: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 30 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },

    chipsLayer: { position: 'absolute', top: 22, left: 0, right: 0 },
    categoryRow: { paddingHorizontal: 16, gap: 14, paddingTop: 10 },
    catItem: { alignItems: 'center', gap: 6, width: 84 },
    catTile: { width: 60, height: 60, borderRadius: 30, ...softCard(), justifyContent: 'center', alignItems: 'center' },
    catEmoji: { fontSize: 26 },
    catBadge: {
      position: 'absolute',
      top: -7,
      right: -7,
      minWidth: 21,
      height: 21,
      paddingHorizontal: 5,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: Colors.sheetBg,
      backgroundColor: '#ef4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
    catBadgeText: { fontSize: 10.5, fontWeight: '900', color: '#fff' },
    catLabel: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center' },
    emptyPeek: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 22 },
    emptyPeekIcon: { fontSize: 18 },

    listLayer: { position: 'absolute', top: 22, left: 0, right: 0, bottom: 0 },
    listHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
    listTitle: { flex: 1, fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(239, 68, 68, 0.12)' },
    filterText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
    minimize: { width: 34, height: 34, borderRadius: 17, backgroundColor: softFill(), justifyContent: 'center', alignItems: 'center' },
    list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },

    agePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.12)' },
    ageText: { fontSize: 10, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
    note: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, fontStyle: 'italic' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: softFill() },
    chipEarn: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    chipText: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    address: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    actions: { flexDirection: 'row', gap: 10 },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center' },
  })
);
