import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';
import {
  ActionButton,
  breakdownInfo,
  Colors,
  directionsUrl,
  etaMinutes,
  FONTS,
  GlassIcon,
  glassStyle,
  GoogleMap,
  Gradient,
  GRADIENTS,
  Icon,
  Pulse,
  themedStyles,
  vehicleIcon,
  zoomToFit,
  type BreakdownId,
  type LatLng,
  softEdge,
  softShadow,
  softFill,
  getThemeMode,
} from '@ongarage/shared';
import { isCommitted, useGarage } from '../context/GarageContext';
import { VANS } from '../constants/mockData';
import { money } from '../utils/format';
import type { DispatchStage } from '../types';

export const STAGE_LABEL: Record<DispatchStage, string> = {
  review: 'ඉල්ලීම සමාලෝචනය',
  quote: 'මිල ගණන් යැවීම',
  awaitingCustomer: 'පාරිභෝගිකයාගේ තේරීම',
  assign: 'කණ්ඩායම පැවරීම',
  techAccept: 'තාක්ෂණිකයාගේ පිළිගැනීම',
  enroute: 'ගමනේ',
  arrived: 'පැමිණියා',
  repairing: 'පරීක්ෂාව සහ අලුත්වැඩියාව',
  awaitingConfirm: 'පාරිභෝගික තහවුරු කිරීම',
  qr: 'QR ස්කෑන්',
  done: 'සම්පූර්ණයි',
};
const STAGES = Object.keys(STAGE_LABEL) as DispatchStage[];

// Typical roadside charge (LKR) per breakdown, used to suggest the quote.
const ROADSIDE_PRICE: Record<BreakdownId, number> = {
  mechanical: 4500,
  battery: 3000,
  tire: 2500,
  fuel: 1500,
  towing: 6000,
  lockout: 2500,
  overheating: 3500,
  winching: 5000,
  accident: 7500,
};

const REPAIR_TASKS = ['ස්ථානයේ පරීක්ෂා කර දෝෂය හඳුනා ගැනීම', 'අලුත්වැඩියාව / කොටස් මාරු කිරීම', 'වාහනය භාර දීමට සූදානම් කිරීම'];
const REPAIR_TASK_INDEX = 1; // skipped when the inspection finds nothing to repair
const DRIVE_MS = 18000;

export const SOSDispatchScreen: React.FC = () => {
  const { dispatch, activeJobs, crew, profile, team, reviews, setStage, sendQuote, assignCrew, toggleTask, setRepair, completeRepair, confirmQrScan, closeDispatch, leaveDispatch, approveRepairPrice, takeOverDispatch } = useGarage();
  const request = dispatch?.request;
  const info = breakdownInfo(request?.breakdownId ?? 'mechanical');
  const suggested = ROADSIDE_PRICE[info.id as BreakdownId] ?? 3500;
  const baseEta = etaMinutes(request?.distanceKm ?? 1);

  const [price, setPrice] = useState(String(suggested));
  const [eta, setEta] = useState(baseEta);
  const [mechanicId, setMechanicId] = useState<string | null>(null);
  const [vanId, setVanId] = useState<string | null>(null);
  const [trip, setTrip] = useState(0);
  const scanAnim = useRef(new Animated.Value(0)).current;
  const popAnim = useRef(new Animated.Value(0)).current;

  const stage = dispatch?.stage ?? 'review';
  // Height of the top layer (map or band), measured so the map zooms to fit what is visible.
  const [topH, setTopH] = useState(320);
  // Each step opens at the top of the sheet.
  const sheetScroll = useRef<ScrollView>(null);
  useEffect(() => {
    sheetScroll.current?.scrollTo({ y: 0, animated: false });
  }, [stage]);

  const stageIndex = STAGES.indexOf(stage);

  // Trip progress comes from when the van left, so it survives closing this screen.
  const enrouteAt = dispatch?.enrouteAt;
  const appMode = dispatch?.techMode === 'app';
  useEffect(() => {
    if (stage !== 'enroute' || !enrouteAt) return;
    const tick = () => {
      const p = Math.min(1, (Date.now() - enrouteAt) / DRIVE_MS);
      setTrip(Math.round(p * 50) / 50);
      if (p >= 1 && !appMode) setStage('arrived');
    };
    tick();
    const t = setInterval(tick, 300);
    return () => clearInterval(t);
  }, [stage, enrouteAt, setStage, appMode]);

  useEffect(() => {
    if (stage !== 'qr') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [stage, scanAnim]);

  useEffect(() => {
    if (stage !== 'arrived' && stage !== 'done') return;
    popAnim.setValue(0);
    Animated.spring(popAnim, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }).start();
  }, [stage, popAnim]);

  const vanCoords: LatLng | null = useMemo(() => {
    if (!request) return null;
    const a = profile.coords;
    const b = request.location.coords;
    return { latitude: a.latitude + (b.latitude - a.latitude) * trip, longitude: a.longitude + (b.longitude - a.longitude) * trip };
  }, [request, profile.coords, trip]);

  if (!dispatch || !request) return null;

  const mechanic = team.find((m) => m.id === (dispatch.mechanicId ?? mechanicId));
  const van = VANS_LOOKUP(dispatch.vanId ?? vanId);
  const quotePrice = dispatch.quote?.price ?? (Number(price) || 0);
  // The call-out fee is the technician's travel compensation (OnGarage approved),
  // paid even when the inspection finds no repair is needed.
  const repair = dispatch.repair ?? { amount: quotePrice, needed: quotePrice > 0 };
  const total = request.calloutFee + (repair.needed ? repair.amount : 0);
  const tasksDone = dispatch.tasks.every((t, i) => t || (i === REPAIR_TASK_INDEX && !repair.needed));
  const canComplete = tasksDone && (!repair.needed || repair.amount > 0);
  const remainingKm = request.distanceKm * (1 - trip);
  const doneReview = reviews.find((r) => r.id === `r-${request.id}`);
  // Done: close for good. Committed: minimise, the job stays active. Otherwise
  // (review/quote) the request goes back to the inbox untouched.
  const committed = isCommitted(dispatch);
  const leave = leaveDispatch;
  // Crew status for this job: free, on another SOS job, or not at work today.
  const otherJobs = activeJobs.filter((j) => j.id !== dispatch.id);
  const memberStatus = (id: string) =>
    otherJobs.some((j) => j.mechanicId === id) ? 'busy' : !crew.presentIds.includes(id) ? 'absent' : crew.breakIds.includes(id) ? 'break' : 'free';
  const vanBusy = (id: string) => otherJobs.some((j) => j.vanId === id);

  const renderMap = (height: number) => {
    const mid = {
      latitude: (profile.coords.latitude + request.location.coords.latitude) / 2,
      longitude: (profile.coords.longitude + request.location.coords.longitude) / 2,
    };
    return (
      <GoogleMap
        style={styles.mapFull}
        center={mid}
        zoom={zoomToFit(request.distanceKm, mid.latitude, height)}
        fallbackColor="#ef4444"
        renderOverlay={(project) => {
          const g = project(profile.coords);
          const c = project(request.location.coords);
          const vp = stage === 'enroute' && vanCoords ? project(vanCoords) : null;
          return (
            <>
              {g && c && (
                <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
                  <Line x1={(vp ?? g).x} y1={(vp ?? g).y} x2={c.x} y2={c.y} stroke={Colors.success} strokeWidth={3} strokeDasharray="8 6" />
                </Svg>
              )}
              {g && (
                <View style={[styles.pinAnchor, { left: g.x, top: g.y }]} pointerEvents="none">
                  <View style={styles.garagePin}>
                    <Text style={styles.pinEmoji}>🛠️</Text>
                  </View>
                </View>
              )}
              {c && (
                <View style={[styles.pinAnchor, { left: c.x, top: c.y }]} pointerEvents="none">
                  <View style={styles.customerPin}>
                    <Text style={styles.pinEmoji}>{vehicleIcon(request.vehicle.type)}</Text>
                  </View>
                </View>
              )}
              {vp && (
                <View style={[styles.pinAnchor, { left: vp.x, top: vp.y }]} pointerEvents="none">
                  <View style={styles.vanPin}>
                    <Text style={styles.pinEmoji}>🚐</Text>
                  </View>
                </View>
              )}
            </>
          );
        }}
      />
    );
  };

  const requestCard = (
    <View style={styles.card}>
      <View style={styles.row}>
        <GlassIcon emoji={info.icon} />
        <View style={styles.flex1}>
          <Text style={styles.cardTitle}>{info.label}</Text>
          <Text style={styles.sub}>
            {vehicleIcon(request.vehicle.type)} {request.vehicle.name} · {request.vehicle.plate}
          </Text>
        </View>
        <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${request.customer.phone}`)}>
          <Text style={styles.callText}>📞</Text>
        </Pressable>
      </View>
      {!!request.note && <Text style={styles.note}>“{request.note}”</Text>}
      <View style={styles.divider} />
      <Detail icon="👤" text={request.customer.name} />
      <Detail icon="📍" text={`${request.location.address} · කි.මී. ${request.distanceKm}`} />
      <Detail icon="🚐" text={`ඔබට ලැබෙන පැමිණීමේ ගාස්තුව (OnGarage අනුමත): ${money(request.calloutFee)}`} />
      <Text style={styles.feeNote}>ගමන් වියදම වෙනුවෙන් — අලුත්වැඩියාවක් අවශ්‍ය නොවුණත් ලැබේ.</Text>
    </View>
  );

  const crewCard = mechanic && (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>👨‍🔧</Text>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.cardTitle}>{mechanic.name}</Text>
          <Text style={styles.sub}>{van ? `${van.name} · ${van.plate}` : mechanic.role}</Text>
        </View>
      </View>
    </View>
  );

  // While the technician app drives the job, this screen follows it live.
  const LIVE_STAGES: DispatchStage[] = ['techAccept', 'enroute', 'arrived', 'repairing', 'awaitingConfirm', 'qr'];
  const following = appMode && LIVE_STAGES.includes(stage);
  const approval = dispatch.priceApproval;
  const liveBanner = following && mechanic && (
    <View style={[styles.card, styles.liveCard]}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>📱</Text>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.cardTitle}>{mechanic.name} · සජීවීව</Text>
          <Text style={styles.sub}>තාක්ෂණික යෙදුමෙන් පියවර යාවත්කාලීන වේ — ඔබට බලා සිටීමට පමණි.</Text>
        </View>
        <Pressable style={styles.liveCall} onPress={() => Linking.openURL(`tel:${mechanic.phone}`)} accessibilityLabel="Call technician">
          <Text style={styles.liveCallText}>📞</Text>
        </Pressable>
      </View>
      <Pressable onPress={takeOverDispatch} hitSlop={6}>
        <Text style={styles.takeOver}>යෙදුම භාවිතා කළ නොහැකිද? අතින් පාලනය කරන්න ›</Text>
      </Pressable>
    </View>
  );
  const approvalCard = approval && approval.status === 'pending' && (
    <View style={[styles.card, styles.approvalCard]}>
      <Text style={styles.cardTitle}>💬 මිල අනුමැතිය අවශ්‍යයි</Text>
      <Text style={styles.sub}>
        {mechanic?.name ?? 'තාක්ෂණිකයා'} අවසන් අලුත්වැඩියා ගාස්තුව {money(approval.amount)} ලෙස ඉල්ලයි — ඔබගේ ඇස්තමේන්තුව {quotePrice > 0 ? money(quotePrice) : 'පරීක්ෂාවෙන් පසු'}. අනුමත කළ පසුව පමණක් පාරිභෝගිකයාට පෙනේ.
      </Text>
    </View>
  );

  const body = () => (
    <>
      {liveBanner}
      {approvalCard}
      {stageBody()}
    </>
  );

  const stageBody = () => {
    switch (stage) {
      case 'review':
        return (
          <>
            {requestCard}
            <Text style={styles.hint}>ආසන්න ගමන් කාලය: මිනි. ~{baseEta}</Text>
          </>
        );
      case 'quote':
        return (
          <>
            {requestCard}
            <Text style={styles.sectionLabel}>ඇස්තමේන්තුගත අලුත්වැඩියා ගාස්තුව</Text>
            <View style={styles.card}>
              <View style={styles.priceRow}>
                <Text style={styles.currency}>රු.</Text>
                <TextInput
                  style={styles.priceInput}
                  keyboardType="number-pad"
                  value={price}
                  onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ''))}
                  maxLength={6}
                />
              </View>
              <View style={styles.chips}>
                {[0, suggested - 500, suggested, suggested + 500].map((p) => (
                  <Pressable key={p} style={[styles.choice, (Number(price) || 0) === p && styles.choiceActive]} onPress={() => setPrice(String(p))}>
                    <Text style={[styles.choiceText, (Number(price) || 0) === p && styles.choiceTextActive]}>
                      {p === 0 ? 'පරීක්ෂාවෙන් පසු' : money(p)}
                      {p === suggested ? ' · යෝජිත' : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.hint}>
                පැමිණීමේ ගාස්තුවට අමතරවයි. {info.label} සඳහා සාමාන්‍ය අලුත්වැඩියා ගාස්තුව {money(suggested)} පමණ වේ. අවසන් ගාස්තුව පරීක්ෂාවෙන් පසු තහවුරු කෙරේ.
              </Text>
            </View>
            <Text style={styles.sectionLabel}>පැමිණීමට ගතවන කාලය</Text>
            <View style={styles.chips}>
              {[baseEta, baseEta + 5, baseEta + 10].map((m) => (
                <Pressable key={m} style={[styles.choice, eta === m && styles.choiceActive]} onPress={() => setEta(m)}>
                  <Text style={[styles.choiceText, eta === m && styles.choiceTextActive]}>මිනි. {m}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>ඔබට ලැබෙන ඇස්තමේන්තුගත මුදල</Text>
              <BillRow label="පැමිණීමේ ගාස්තුව (OnGarage අනුමත)" value={money(request.calloutFee)} />
              <BillRow label="ඇස්තමේන්තුගත අලුත්වැඩියාව" value={Number(price) > 0 ? money(Number(price)) : 'පරීක්ෂාවෙන් පසු'} />
              <View style={styles.divider} />
              <BillRow label="ඇස්තමේන්තුගත එකතුව" value={money((Number(price) || 0) + request.calloutFee)} strong />
            </View>
          </>
        );
      case 'awaitingCustomer':
        return (
          <Waiting
            icon="⏳"
            title="පාරිභෝගිකයා මිල ගණන් සසඳමින්"
            text={`පැමිණීමේ ගාස්තුව ${money(request.calloutFee)} + අලුත්වැඩියාව ${quotePrice > 0 ? money(quotePrice) : 'පරීක්ෂාවෙන් පසු'} සහ මිනි. ${dispatch.quote?.etaMin} පැමිණීමේ කාලය ${request.customer.name} වෙත යවා ඇත.`}
          />
        );
      case 'assign':
        return (
          <>
            <Text style={styles.sectionLabel}>යාන්ත්‍රිකයා තෝරන්න</Text>
            {team.map((m) => {
              const active = mechanicId === m.id;
              const status = memberStatus(m.id);
              const free = status === 'free';
              return (
                <Pressable
                  key={m.id}
                  disabled={!free}
                  style={[styles.card, styles.row, active && styles.selected, !free && styles.disabledCard]}
                  onPress={() => setMechanicId(m.id)}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarEmoji}>👨‍🔧</Text>
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.cardTitle}>{m.name}</Text>
                    <Text style={styles.sub}>
                      {m.role} · {m.hasApp ? '📱 තාක්ෂණික යෙදුම' : 'යෙදුම නැත — ඔබ පියවර සටහන් කරයි'}
                    </Text>
                  </View>
                  <Text style={[styles.status, { color: free ? Colors.success : status === 'busy' ? Colors.primary : Colors.textMuted }]}>
                    {free ? (active ? '✓ තෝරා ඇත' : 'ලබා ගත හැක') : status === 'busy' ? '🚐 වෙනත් SOS රැකියාවක' : status === 'break' ? '☕ විවේකයේ' : 'අද නොපැමිණේ'}
                  </Text>
                </Pressable>
              );
            })}
            <Text style={styles.sectionLabel}>සේවා වාහනය</Text>
            {[...VANS, OWN_VEHICLE].map((v) => {
              const active = vanId === v.id;
              const busy = v.id !== OWN_VEHICLE.id && vanBusy(v.id);
              return (
                <Pressable
                  key={v.id}
                  disabled={busy}
                  style={[styles.card, styles.row, active && styles.selected, busy && styles.disabledCard]}
                  onPress={() => setVanId(v.id)}
                >
                  <GlassIcon emoji={v.id === OWN_VEHICLE.id ? '🏍️' : '🚐'} small />
                  <View style={styles.flex1}>
                    <Text style={styles.cardTitle}>{v.name}</Text>
                    <Text style={styles.sub}>{v.plate}</Text>
                  </View>
                  {busy ? (
                    <Text style={[styles.status, { color: Colors.primary }]}>භාවිතයේ</Text>
                  ) : (
                    active && <Text style={[styles.status, { color: Colors.success }]}>✓ තෝරා ඇත</Text>
                  )}
                </Pressable>
              );
            })}
          </>
        );
      case 'techAccept':
        return (
          <>
            <Waiting icon="📱" title={`${mechanic?.name ?? 'තාක්ෂණිකයා'} වෙත යැව්වා`} text="තාක්ෂණික යෙදුමෙන් රැකියාව පිළිගත් විගස ගමන ආරම්භ වේ." />
            {requestCard}
          </>
        );
      case 'enroute':
        return (
          <>
            <View style={styles.card}>
              <View style={styles.etaRow}>
                <View style={styles.etaItem}>
                  <Text style={styles.etaValue}>{remainingKm.toFixed(2)} km</Text>
                  <Text style={styles.sub}>ඉතිරි දුර</Text>
                </View>
                <View style={styles.etaDivider} />
                <View style={styles.etaItem}>
                  <Text style={styles.etaValue}>මිනි. {Math.max(1, Math.round((dispatch.quote?.etaMin ?? baseEta) * (1 - trip)))}</Text>
                  <Text style={styles.sub}>පැමිණීමට</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <ActionButton label="අමතන්න" icon="📞" variant="ghost" compact onPress={() => Linking.openURL(`tel:${request.customer.phone}`)} />
                <ActionButton
                  label="Google Maps"
                  icon="🗺️"
                  variant="primary"
                  compact
                  onPress={() => Linking.openURL(directionsUrl(request.location.coords, profile.coords))}
                />
              </View>
              <Text style={styles.hint}>ඔබගේ සජීවී ස්ථානය පාරිභෝගිකයා සමඟ බෙදා ගැනේ.</Text>
            </View>
            {crewCard}
          </>
        );
      case 'arrived':
        return (
          <>
            <Hero anim={popAnim} icon="📍" title="ඔබ ස්ථානයට පැමිණියා" text={`${request.customer.name} වෙත ඔබ පැමිණි බව දැනුම් දෙන ලදී.`} />
            {requestCard}
          </>
        );
      case 'repairing': {
        const tasks = dispatch.tasks;
        const done = tasks.filter((t, i) => t || (i === REPAIR_TASK_INDEX && !repair.needed)).length;
        return (
          <View pointerEvents={following ? 'none' : 'auto'} style={styles.stack}>
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.label}>ප්‍රගතිය</Text>
                <Text style={styles.cardTitle}>{Math.round((done / tasks.length) * 100)}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${(done / tasks.length) * 100}%` }]} />
              </View>
              {REPAIR_TASKS.map((t, i) => {
                const skipped = i === REPAIR_TASK_INDEX && !repair.needed;
                const ticked = tasks[i] && !skipped;
                return (
                  <Pressable key={t} style={[styles.task, skipped && styles.taskSkipped]} disabled={skipped} onPress={() => toggleTask(i)}>
                    <View style={[styles.check, ticked && styles.checkOn]}>{ticked && <Text style={styles.checkMark}>✓</Text>}</View>
                    <Text style={[styles.taskText, (ticked || skipped) && styles.taskDone]}>{t}</Text>
                    {skipped && <Text style={styles.skipTag}>අවශ්‍ය නැත</Text>}
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>පරීක්ෂාවේ ප්‍රතිඵලය</Text>
            <View style={styles.card}>
              <View style={styles.chips}>
                <Pressable style={[styles.choice, repair.needed && styles.choiceActive]} onPress={() => setRepair(repair.amount || quotePrice || suggested, true)}>
                  <Text style={[styles.choiceText, repair.needed && styles.choiceTextActive]}>🔧 අලුත්වැඩියාවක් කළා</Text>
                </Pressable>
                <Pressable style={[styles.choice, !repair.needed && styles.choiceActive]} onPress={() => setRepair(repair.amount, false)}>
                  <Text style={[styles.choiceText, !repair.needed && styles.choiceTextActive]}>✓ අලුත්වැඩියාවක් අවශ්‍ය නොවීය</Text>
                </Pressable>
              </View>
              {repair.needed ? (
                <>
                  <Text style={styles.label}>අවසන් අලුත්වැඩියා ගාස්තුව</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.currency}>රු.</Text>
                    <TextInput
                      style={styles.priceInput}
                      keyboardType="number-pad"
                      value={repair.amount ? String(repair.amount) : ''}
                      placeholder="0"
                      placeholderTextColor={Colors.textMuted}
                      onChangeText={(t) => setRepair(Number(t.replace(/[^0-9]/g, '')) || 0, true)}
                      maxLength={6}
                    />
                  </View>
                  <Text style={styles.hint}>ඇස්තමේන්තුව: {quotePrice > 0 ? money(quotePrice) : 'පරීක්ෂාවෙන් පසු'}</Text>
                </>
              ) : (
                <Text style={styles.feeNote}>බරපතල දෝෂයක් නොවූ බැවින් අලුත්වැඩියා ගාස්තුවක් අය නොකෙරේ — ඔබට පැමිණීමේ ගාස්තුව ලැබේ.</Text>
              )}
              <View style={styles.divider} />
              <BillRow label="පැමිණීමේ ගාස්තුව" value={money(request.calloutFee)} />
              <BillRow label="අලුත්වැඩියා ගාස්තුව" value={repair.needed ? money(repair.amount) : 'අවශ්‍ය නොවීය'} />
              <BillRow label="ඔබට ලැබෙන මුළු මුදල" value={money(total)} strong />
            </View>
            <Text style={styles.hint}>
              {following ? 'තාක්ෂණිකයා පියවර සම්පූර්ණ කරන විට මෙහි සජීවීව පෙනේ.' : 'පියවර සම්පූර්ණ කර අවසන් ගාස්තුව තහවුරු කළ පසු රැකියාව අවසන් ලෙස සලකුණු කළ හැක.'}
            </Text>
            {crewCard}
          </View>
        );
      }
      case 'awaitingConfirm':
        return <Waiting icon="🔍" title="පාරිභෝගිකයා වාහනය පරීක්ෂා කරමින්" text="අලුත්වැඩියාව අවසන් බව පාරිභෝගිකයා තහවුරු කළ පසු QR ස්කෑන් කිරීම ආරම්භ වේ." />;
      case 'qr':
        return (
          <>
            <View style={styles.scanner}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <Text style={styles.scannerEmoji}>🔳</Text>
              <Animated.View
                style={[styles.scanLine, { transform: [{ translateY: scanAnim.interpolate({ inputRange: [0, 1], outputRange: [-80, 80] }) }] }]}
              />
            </View>
            <Text style={styles.hint}>පාරිභෝගිකයාගේ දුරකථනයේ ඇති QR කේතය රාමුව තුළට ගන්න.</Text>
            <View style={styles.card}>
              <Text style={styles.label}>බිල්පත</Text>
              <BillRow label="පැමිණීමේ ගාස්තුව (OnGarage අනුමත)" value={money(request.calloutFee)} />
              <BillRow label="අලුත්වැඩියා ගාස්තුව" value={repair.needed ? money(repair.amount) : 'අවශ්‍ය නොවීය'} />
              <View style={styles.divider} />
              <BillRow label="පාරිභෝගිකයා ගෙවන මුළු මුදල" value={money(total)} strong />
              <Text style={styles.feeNote}>මෙම සම්පූර්ණ මුදලම ඔබට (තාක්ෂණ ශිල්පියාට) ලැබේ.</Text>
            </View>
          </>
        );
      case 'done':
        return (
          <>
            <Hero anim={popAnim} icon="✓" success title="රැකියාව සාර්ථකව අවසන්!" text={`${money(total)} ඔබගේ ආදායමට එක් විය (පැමිණීමේ ගාස්තුව ${money(request.calloutFee)}${repair.needed ? ` + අලුත්වැඩියාව ${money(repair.amount)}` : ''}).`} />
            {doneReview && (
              <View style={[styles.card, styles.centerCard]}>
                <Text style={styles.label}>{doneReview.customer} ගේ ශ්‍රේණිගත කිරීම</Text>
                <Text style={styles.stars}>{'★'.repeat(doneReview.rating)}{'☆'.repeat(5 - doneReview.rating)}</Text>
                <Text style={styles.note}>“{doneReview.text}”</Text>
              </View>
            )}
          </>
        );
    }
  };

  const bottom = () => {
    if (approval?.status === 'pending') {
      return (
        <View style={styles.actions}>
          <ActionButton label="ඇස්තමේන්තුවම" variant="ghost" compact onPress={() => approveRepairPrice(false)} />
          <ActionButton label={`${money(approval.amount)} අනුමත කරන්න`} icon="✓" variant="success" compact onPress={() => approveRepairPrice(true)} />
        </View>
      );
    }
    if (following) return null;
    switch (stage) {
      case 'review':
        return (
          <View style={styles.actions}>
            <ActionButton
              label="ප්‍රතික්ෂේප"
              variant="ghost"
              compact
              onPress={() => {
                closeDispatch();
              }}
            />
            <ActionButton label="පිළිගන්න" icon="✓" variant="sos" compact onPress={() => setStage('quote')} />
          </View>
        );
      case 'quote':
        return <ActionButton label="මිල ගණන් යවන්න" icon="📨" variant="sos" onPress={() => sendQuote(Number(price) || 0, eta)} />;
      case 'awaitingCustomer':
        return (
          <ActionButton
            label="මිල ගණන් ඉවත් කරන්න"
            variant="ghost"
            onPress={() => {
              closeDispatch();
            }}
          />
        );
      case 'assign':
        return <ActionButton label="ගමන අරඹන්න" icon="🚐" variant="success" disabled={!mechanicId || !vanId} onPress={() => assignCrew(mechanicId!, vanId!)} />;
      case 'arrived':
        return <ActionButton label="පරීක්ෂාව අරඹන්න" icon="🔍" variant="primary" onPress={() => setStage('repairing')} />;
      case 'repairing':
        return <ActionButton label="රැකියාව අවසන් ලෙස සලකුණු කරන්න" icon="✓" variant="success" disabled={!canComplete} onPress={completeRepair} />;
      case 'qr':
        return <ActionButton label="QR ස්කෑන් කිරීම අනුකරණය කරන්න" icon="📷" variant="success" onPress={confirmQrScan} />;
      case 'done':
        return (
          <ActionButton
            label="ඉන්බොක්ස් වෙත"
            variant="primary"
            onPress={() => {
              closeDispatch();
            }}
          />
        );
      default:
        return null;
    }
  };

  const bottomBar = bottom();
  const showMap = stage === 'review' || stage === 'enroute';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Like the owner SOS flow: the map (or, on steps without one, a red band) fills the top; the controls float over it. */}
      <View style={[styles.topArea, showMap ? styles.topAreaMap : styles.topAreaBand]} onLayout={(e) => setTopH(Math.round(e.nativeEvent.layout.height))}>
        {showMap ? renderMap(topH) : <Gradient stops={GRADIENTS.sosHeader} />}
        <View style={styles.topBar}>
          <Pressable style={styles.roundBtn} onPress={leave} accessibilityLabel={committed ? 'Minimize' : 'Close'}>
            <Icon name={committed ? 'chevron-down' : 'x'} size={18} strokeWidth={2.5} color={Colors.textMain} />
          </Pressable>
          <View style={styles.stepPill}>
            <View style={styles.stepPillIcon}>
              <Text style={styles.headerIconText}>🚨</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.stepPillTitle} numberOfLines={1}>
                SOS රැකියාව · {request.customer.name}
              </Text>
              <Text style={styles.stepPillSub} numberOfLines={1}>
                පියවර {stageIndex + 1}/{STAGES.length} · {STAGE_LABEL[stage]}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.stepper}>
          {STAGES.map((s, i) => (
            <View key={s} style={[styles.stepSeg, i < stageIndex && styles.stepSegDone, i === stageIndex && styles.stepSegActive]} />
          ))}
        </View>
        <ScrollView ref={sheetScroll} style={styles.flex1} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {body()}
        </ScrollView>
        {bottomBar && <View style={styles.bottomBar}>{bottomBar}</View>}
      </View>
    </SafeAreaView>
  );
};

// ---------- Small pieces ----------

// A mechanic can also go on their own bike/vehicle, so a busy van never blocks a second job.
const OWN_VEHICLE = { id: 'own', name: 'යතුරුපැදිය / පුද්ගලික වාහනය', plate: 'කාර්මිකයාගේම වාහනය' };
const VANS_LOOKUP = (id?: string | null) => [...VANS, OWN_VEHICLE].find((v) => v.id === id);

const Detail: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailIcon}>{icon}</Text>
    <Text style={styles.detailText}>{text}</Text>
  </View>
);

const BillRow: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.rowBetween}>
    <Text style={strong ? styles.cardTitle : styles.detailText}>{label}</Text>
    <Text style={strong ? [styles.cardTitle, { color: Colors.success }] : styles.detailText}>{value}</Text>
  </View>
);

const Waiting: React.FC<{ icon: string; title: string; text: string }> = ({ icon, title, text }) => (
  <View style={styles.hero}>
    <View style={styles.radarWrap}>
      <Pulse style={styles.radarRing} maxScale={1.6} />
      <View style={styles.radarCore}>
        <Text style={styles.radarEmoji}>{icon}</Text>
      </View>
    </View>
    <Text style={styles.heroTitle}>{title}</Text>
    <Text style={styles.heroText}>{text}</Text>
  </View>
);

const Hero: React.FC<{ anim: Animated.Value; icon: string; title: string; text: string; success?: boolean }> = ({ anim, icon, title, text, success }) => (
  <View style={styles.hero}>
    <Animated.View style={[styles.heroCircle, success ? styles.heroSuccess : styles.heroGlass, { opacity: anim, transform: [{ scale: anim }] }]}>
      <Text style={styles.heroIcon}>{icon}</Text>
    </Animated.View>
    <Text style={styles.heroTitle}>{title}</Text>
    <Text style={styles.heroText}>{text}</Text>
  </View>
);

// A stronger shadow for controls floating over the map.
const FLOAT_SHADOW = { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 14, elevation: 5 } as const;

const styles = themedStyles(() =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bgBody },
    flex1: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      overflow: 'hidden',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(239, 68, 68, 0.3)',
    },
    headerIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)', justifyContent: 'center', alignItems: 'center' },
    headerIconText: { fontSize: 18 },
    headerTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: '#fff' },
    headerSubtitle: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: '#fca5a5' },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepper: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
    stepSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },
    stepSegDone: { backgroundColor: 'rgba(239, 68, 68, 0.6)' },
    stepSegActive: { backgroundColor: '#ef4444' },
    body: { padding: 16, paddingTop: 6, gap: 12, paddingBottom: 24 },
    stack: { gap: 12 },
    liveCard: { borderColor: 'rgba(56, 189, 248, 0.5)', backgroundColor: 'rgba(56, 189, 248, 0.06)' },
    liveCall: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(16, 185, 129, 0.14)', justifyContent: 'center', alignItems: 'center' },
    liveCallText: { fontSize: 16 },
    takeOver: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    approvalCard: { borderColor: 'rgba(245, 158, 11, 0.55)', backgroundColor: 'rgba(245, 158, 11, 0.08)' },
    mapFull: { ...StyleSheet.absoluteFill },
    topArea: { overflow: 'hidden', backgroundColor: Colors.mapBg },
    topAreaMap: { height: '42%' },
    topAreaBand: { height: 130 },
    topBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center', ...FLOAT_SHADOW },
    stepPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard, ...FLOAT_SHADOW },
    stepPillIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: getThemeMode() === 'dark' ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2', justifyContent: 'center', alignItems: 'center' },
    stepPillTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    stepPillSub: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: '#dc2626' },
    // The step lives in a rounded sheet that overlaps the map.
    sheet: {
      flex: 1,
      marginTop: -24,
      backgroundColor: Colors.bgBody,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      overflow: 'hidden',
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 12,
    },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder, marginTop: 10 },
    pinAnchor: { position: 'absolute', transform: [{ translateX: '-50%' }, { translateY: '-50%' }] },
    garagePin: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.success, borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
    customerPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ef4444', borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#dc2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
    vanPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#0284c7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
    pinEmoji: { fontSize: 15 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 20, padding: 14, gap: 10, ...softShadow() },
    centerCard: { alignItems: 'center' },
    selected: { borderColor: Colors.success, backgroundColor: 'rgba(16, 185, 129, 0.08)' },
    disabledCard: { opacity: 0.5 },
    cardTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    label: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sectionLabel: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    hint: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center' },
    note: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, fontStyle: 'italic', textAlign: 'center' },
    divider: { height: 1, backgroundColor: Colors.borderColor },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    detailIcon: { fontSize: 14, width: 20, textAlign: 'center' },
    detailText: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMain, flexShrink: 1 },
    callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center' },
    callText: { fontSize: 17 },
    avatar: { width: 44, height: 44, borderRadius: 22, ...glassStyle(), justifyContent: 'center', alignItems: 'center' },
    avatarEmoji: { fontSize: 21 },
    status: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    currency: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMuted },
    priceInput: { flex: 1, fontSize: 28, fontWeight: '800', color: Colors.textMain, paddingVertical: 2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choice: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'transparent', backgroundColor: softFill() },
    choiceActive: { borderColor: Colors.success, backgroundColor: 'rgba(16, 185, 129, 0.14)' },
    choiceText: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    choiceTextActive: { color: Colors.successText, fontFamily: FONTS.bodyBold },
    etaRow: { flexDirection: 'row', alignItems: 'center' },
    etaItem: { flex: 1, alignItems: 'center' },
    etaValue: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMain },
    etaDivider: { width: 1, height: 34, backgroundColor: Colors.borderColor },
    actions: { flexDirection: 'row', gap: 10 },
    progressTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.subtleBorder, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3, backgroundColor: Colors.success },
    task: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
    check: { width: 24, height: 24, borderRadius: 8, borderWidth: 1, borderColor: 'transparent', backgroundColor: softFill(), justifyContent: 'center', alignItems: 'center' },
    checkOn: { backgroundColor: Colors.success, borderColor: Colors.success },
    checkMark: { fontSize: 13, fontWeight: '900', color: '#fff' },
    taskText: { flex: 1, fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textMain },
    taskDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
    taskSkipped: { opacity: 0.6 },
    skipTag: { fontSize: 10, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: Colors.subtleFill },
    feeNote: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.successText, lineHeight: 16 },
    scanner: {
      alignSelf: 'center',
      width: 220,
      height: 220,
      borderRadius: 24,
      backgroundColor: Colors.bgCard,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    scannerEmoji: { fontSize: 90, opacity: 0.25 },
    scanLine: { position: 'absolute', left: 20, right: 20, height: 2, backgroundColor: Colors.success, shadowColor: Colors.success, shadowOpacity: 1, shadowRadius: 8 },
    corner: { position: 'absolute', width: 36, height: 36, borderColor: Colors.success },
    cornerTL: { top: 12, left: 12, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
    cornerTR: { top: 12, right: 12, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
    cornerBL: { bottom: 12, left: 12, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
    cornerBR: { bottom: 12, right: 12, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },
    hero: { alignItems: 'center', gap: 6, paddingVertical: 16 },
    heroCircle: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    heroSuccess: { backgroundColor: Colors.success, shadowColor: Colors.success, shadowOpacity: 0.6, shadowRadius: 24, elevation: 8 },
    heroGlass: { ...glassStyle() },
    heroIcon: { fontSize: 36, color: '#fff', fontWeight: '900' },
    heroTitle: { fontSize: 17, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
    heroText: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
    radarWrap: { width: 84, height: 84, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    radarRing: { position: 'absolute', width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: 'rgba(239, 68, 68, 0.6)' },
    radarCore: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
    radarEmoji: { fontSize: 28 },
    stars: { fontSize: 30, color: Colors.warning, letterSpacing: 4 },
    bottomBar: { padding: 16, paddingTop: 10, gap: 8, backgroundColor: Colors.bgBody },
  })
);
