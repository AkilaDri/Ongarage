import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActionButton,
  Colors,
  directionsUrl,
  distanceKm,
  FONTS,
  GoogleMap,
  Gradient,
  GRADIENTS,
  Icon,
  Pulse,
  themedStyles,
  vehicleIcon,
  zoomToFit,
  type LatLng,
  softEdge,
  softShadow,
  softFill,
  getThemeMode,
} from '@ongarage/shared';
import { sosTotal, useTech } from '../context/TechContext';
import { DRIVE_MS, SOS_REPAIR_TASK, SOS_TASKS } from '../constants/mockData';
import { money } from '../utils/format';
import type { TechJob } from '../types';

const STAGE_LABEL: Record<string, string> = {
  enroute: 'ගමනේ',
  arrived: 'පැමිණියා',
  inspecting: 'පරීක්ෂාව',
  approval: 'කළමනාකරු අනුමැතිය',
  repairing: 'අලුත්වැඩියාව',
  awaitingConfirm: 'අයිතිකරු පරීක්ෂා කරමින්',
  qr: 'QR / කේතය',
  payment: 'ගෙවීම',
  done: 'අවසන්',
};
const STAGES = Object.keys(STAGE_LABEL);

/** The technician's side of an SOS job, step by step; the garage sees each step live. */
export const SOSJobScreen: React.FC = () => {
  const { openJob: job, closeSOS, markArrived, startInspection, submitInspection, toggleTask, finishRepair, closeWithOwner, collectPayment } = useTech();
  const [trip, setTrip] = useState(0);
  const [needed, setNeeded] = useState(true);
  const [amount, setAmount] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(false);
  const scan = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  const stage = job?.stage ?? 'enroute';
  // Height of the top layer (map or band), measured so the map zooms to fit what is visible.
  const [topH, setTopH] = useState(320);
  // Each step opens at the top of the sheet.
  const sheetScroll = useRef<ScrollView>(null);
  useEffect(() => {
    sheetScroll.current?.scrollTo({ y: 0, animated: false });
  }, [stage]);

  const enrouteAt = job?.enrouteAt;

  useEffect(() => {
    if (stage !== 'enroute' || !enrouteAt) return;
    const tick = () => setTrip(Math.min(1, (Date.now() - enrouteAt) / DRIVE_MS));
    tick();
    const t = setInterval(tick, 300);
    return () => clearInterval(t);
  }, [stage, enrouteAt]);

  useEffect(() => {
    if (stage === 'inspecting' && job?.sos) {
      setNeeded(true);
      setAmount(String(job.sos.quote || ''));
    }
    if (stage === 'qr') {
      setCode('');
      setCodeError(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  useEffect(() => {
    if (stage !== 'qr') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scan, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [stage, scan]);

  useEffect(() => {
    if (stage !== 'arrived' && stage !== 'done') return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }).start();
  }, [stage, pop]);

  if (!job?.sos) return null;
  const sos = job.sos;
  const stageIndex = STAGES.indexOf(stage);
  const repair = job.repair ?? { amount: 0, needed: false };
  const total = sosTotal(job);
  const tasksDone = job.tasks.every((t, i) => t || (i === SOS_REPAIR_TASK && !repair.needed));
  const value = Number(amount) || 0;

  const garage = job.garage.coords;
  const dest = job.location.coords;
  const me: LatLng = { latitude: garage.latitude + (dest.latitude - garage.latitude) * trip, longitude: garage.longitude + (dest.longitude - garage.longitude) * trip };
  const kmLeft = distanceKm(me, dest);

  const map = (h: number) => {
    const mid = { latitude: (garage.latitude + dest.latitude) / 2, longitude: (garage.longitude + dest.longitude) / 2 };
    return (
      <GoogleMap
        style={styles.mapFull}
        center={mid}
        zoom={zoomToFit(distanceKm(garage, dest), mid.latitude, h)}
        fallbackColor="#ef4444"
        renderOverlay={(project) => {
          const c = project(dest);
          const t = project(me);
          return (
            <>
              {c && (
                <View style={[styles.pinAnchor, { left: c.x, top: c.y }]} pointerEvents="none">
                  <View style={styles.customerPin}>
                    <Text style={styles.pinEmoji}>{vehicleIcon(job.vehicle.type)}</Text>
                  </View>
                </View>
              )}
              {t && stage === 'enroute' && (
                <View style={[styles.pinAnchor, { left: t.x, top: t.y }]} pointerEvents="none">
                  <View style={styles.techPin}>
                    <Text style={styles.pinEmoji}>🛵</Text>
                  </View>
                </View>
              )}
            </>
          );
        }}
      />
    );
  };

  const customerCard = (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconTile}>
          <Text style={styles.iconText}>{job.icon}</Text>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.cardTitle}>{job.title}</Text>
          <Text style={styles.sub}>
            {vehicleIcon(job.vehicle.type)} {job.vehicle.name} · {job.vehicle.plate}
          </Text>
        </View>
      </View>
      {!!sos.note && <Text style={styles.note}>“{sos.note}”</Text>}
      <View style={styles.divider} />
      <Text style={styles.detail}>👤 {job.customer.name}</Text>
      <Text style={styles.detail}>📍 {job.location.address}</Text>
      <Text style={styles.detail}>🛠️ {job.garage.name} · ඇස්තමේන්තුව {sos.quote ? money(sos.quote) : 'පරීක්ෂාවෙන් පසු'}</Text>
      <View style={styles.actions}>
        <ActionButton label="අමතන්න" icon="📞" variant="ghost" compact onPress={() => Linking.openURL(`tel:${job.customer.phone}`)} />
        <ActionButton label="ගරාජය" icon="🛠️" variant="ghost" compact onPress={() => Linking.openURL(`tel:${job.garage.phone}`)} />
      </View>
    </View>
  );

  const bill = (
    <View style={styles.card}>
      <Bill label="පැමිණීමේ ගාස්තුව (OnGarage අනුමත)" value={money(sos.calloutFee)} />
      <Bill label="අලුත්වැඩියා ගාස්තුව" value={repair.needed ? money(repair.amount) : 'අවශ්‍ය නොවීය'} />
      <View style={styles.divider} />
      <Bill label="අයිතිකරු ගෙවන මුළු මුදල" value={money(total)} strong />
      <Text style={styles.hint}>
        මෙම රැකියාවට ඔබට {money(job.pay)} ({job.garage.name} අනුපාතය). අයිතිකරු මුදලින් ගෙවුවහොත් එය ගරාජයට භාර දෙන්න.
      </Text>
    </View>
  );

  const body = () => {
    switch (stage) {
      case 'enroute':
        return (
          <>
            <View style={styles.card}>
              <View style={styles.etaRow}>
                <View style={styles.etaItem}>
                  <Text style={styles.etaValue}>{kmLeft.toFixed(2)} km</Text>
                  <Text style={styles.sub}>ඉතිරි දුර</Text>
                </View>
                <View style={styles.etaDivider} />
                <View style={styles.etaItem}>
                  <Text style={styles.etaValue}>මිනි. {Math.max(1, Math.round(sos.etaMin * (1 - trip)))}</Text>
                  <Text style={styles.sub}>පැමිණීමට</Text>
                </View>
              </View>
              <ActionButton label="Google Maps දිශාවන්" icon="🗺️" variant="primary" compact onPress={() => Linking.openURL(directionsUrl(dest, garage))} />
              <Text style={styles.hint}>📡 ඔබගේ සජීවී ස්ථානය අයිතිකරු සහ ගරාජය සමඟ බෙදා ගැනේ.</Text>
            </View>
            {customerCard}
          </>
        );
      case 'arrived':
        return (
          <>
            <Hero anim={pop} icon="📍" title="ඔබ ස්ථානයට පැමිණියා" text={`${job.customer.name} සහ ${job.garage.name} වෙත දැනුම් දුන්නා.`} />
            {customerCard}
          </>
        );
      case 'inspecting':
        return (
          <>
            <Text style={styles.sectionLabel}>පරීක්ෂාවේ ප්‍රතිඵලය</Text>
            <View style={styles.card}>
              <View style={styles.chips}>
                <Pressable style={[styles.choice, needed && styles.choiceActive]} onPress={() => setNeeded(true)}>
                  <Text style={[styles.choiceText, needed && styles.choiceTextActive]}>🔧 අලුත්වැඩියාවක් අවශ්‍යයි</Text>
                </Pressable>
                <Pressable style={[styles.choice, !needed && styles.choiceActive]} onPress={() => setNeeded(false)}>
                  <Text style={[styles.choiceText, !needed && styles.choiceTextActive]}>✓ අවශ්‍ය නැත</Text>
                </Pressable>
              </View>
              {needed ? (
                <>
                  <Text style={styles.label}>අවසන් අලුත්වැඩියා ගාස්තුව</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.currency}>රු.</Text>
                    <TextInput
                      style={styles.priceInput}
                      keyboardType="number-pad"
                      value={amount}
                      onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
                      maxLength={6}
                      placeholder="0"
                      placeholderTextColor={Colors.textMuted}
                      accessibilityLabel="Repair amount"
                    />
                  </View>
                  <Text style={[styles.hint, value > sos.quote && { color: Colors.warning }]}>
                    ගරාජයේ ඇස්තමේන්තුව: {sos.quote ? money(sos.quote) : 'පරීක්ෂාවෙන් පසු'}
                    {value > sos.quote ? ' · මීට වැඩි මිලක් කළමනාකරු අනුමත කළ යුතුයි.' : ''}
                  </Text>
                </>
              ) : (
                <Text style={styles.feeNote}>අලුත්වැඩියාවක් නොමැති නම් අයිතිකරු ගෙවන්නේ පැමිණීමේ ගාස්තුව පමණි.</Text>
              )}
            </View>
            {customerCard}
          </>
        );
      case 'approval':
        return (
          <Waiting
            icon="💬"
            title="කළමනාකරුගේ අනුමැතිය බලාපොරොත්තුවෙන්"
            text={`${money(job.approval?.amount ?? 0)} ඇස්තමේන්තුවට (${money(sos.quote)}) වඩා වැඩි නිසා ${job.garage.name} අනුමත කළ යුතුයි. අනුමත කළ පසුව පමණක් අයිතිකරුට පෙනේ.`}
          />
        );
      case 'repairing': {
        const done = job.tasks.filter((t, i) => t || (i === SOS_REPAIR_TASK && !repair.needed)).length;
        return (
          <>
            {job.approval && job.approval.status !== 'pending' && (
              <View style={[styles.card, job.approval.status === 'approved' ? styles.okCard : styles.warnCard]}>
                <Text style={styles.cardTitle}>{job.approval.status === 'approved' ? '✅ කළමනාකරු අනුමත කළා' : '↩️ කළමනාකරු ඇස්තමේන්තුවම තබා ගත්තා'}</Text>
                <Text style={styles.sub}>අලුත්වැඩියා ගාස්තුව: {money(repair.amount)}</Text>
              </View>
            )}
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.label}>ප්‍රගතිය</Text>
                <Text style={styles.cardTitle}>{Math.round((done / job.tasks.length) * 100)}%</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(done / job.tasks.length) * 100}%` }]} />
              </View>
              {SOS_TASKS.map((t, i) => {
                const skipped = i === SOS_REPAIR_TASK && !repair.needed;
                const ticked = job.tasks[i] && !skipped;
                return (
                  <Pressable key={t} style={[styles.task, skipped && styles.taskSkipped]} disabled={skipped} onPress={() => toggleTask(job.id, i)} accessibilityLabel={`Task ${i + 1}`}>
                    <View style={[styles.check, ticked && styles.checkOn]}>{ticked && <Text style={styles.checkMark}>✓</Text>}</View>
                    <Text style={[styles.taskText, (ticked || skipped) && styles.taskDone]}>{t}</Text>
                    {skipped && <Text style={styles.skipTag}>අවශ්‍ය නැත</Text>}
                  </Pressable>
                );
              })}
            </View>
            {bill}
          </>
        );
      }
      case 'awaitingConfirm':
        return <Waiting icon="🔍" title="අයිතිකරු වාහනය පරීක්ෂා කරමින්" text="ඔවුන් තහවුරු කළ විගස QR කේතය ඔවුන්ගේ දුරකථනයේ පෙනේ." />;
      case 'qr':
        return (
          <>
            <View style={styles.scanner}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <Text style={styles.scannerEmoji}>🔳</Text>
              <Animated.View style={[styles.scanLine, { transform: [{ translateY: scan.interpolate({ inputRange: [0, 1], outputRange: [-80, 80] }) }] }]} />
            </View>
            <Text style={styles.hint}>අයිතිකරුගේ දුරකථනයේ ඇති QR කේතය රාමුව තුළට ගන්න.</Text>
            <View style={styles.card}>
              <Text style={styles.label}>QR ස්කෑන් කළ නොහැකිද? අයිතිකරු පවසන ඉලක්කම් 6 කේතය</Text>
              <View style={styles.codeRow}>
                <TextInput
                  style={[styles.codeInput, codeError && styles.codeError]}
                  value={code}
                  onChangeText={(t) => {
                    setCode(t.replace(/[^0-9]/g, '').slice(0, 6));
                    setCodeError(false);
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="______"
                  placeholderTextColor={Colors.textMuted}
                  accessibilityLabel="Close code"
                />
                <Pressable
                  style={[styles.codeBtn, code.length !== 6 && styles.off]}
                  disabled={code.length !== 6}
                  onPress={() => setCodeError(!closeWithOwner(job.id, code))}
                  accessibilityLabel="Confirm code"
                >
                  <Text style={styles.codeBtnText}>තහවුරු කරන්න</Text>
                </Pressable>
              </View>
              {codeError && <Text style={[styles.hint, { color: Colors.errorText }]}>කේතය නොගැළපේ — අයිතිකරුගෙන් නැවත අසන්න.</Text>}
              <Text style={styles.hint}>(අනුකරණය: අයිතිකරුගේ කේතය {sos.closeCode})</Text>
            </View>
          </>
        );
      case 'payment':
        return (
          <>
            <Hero anim={pop} icon="✓" success title="අයිතිකරු රැකියාව තහවුරු කළා" text="අවසන් බිල්පත අයිතිකරුගෙන් එකතු කරන්න." />
            {bill}
          </>
        );
      case 'done':
        return (
          <>
            <Hero anim={pop} icon="✓" success title="රැකියාව සාර්ථකව අවසන්!" text={`ඔබට ${money(job.pay)} · ${job.garage.name}`} />
            <View style={styles.card}>
              <Bill label="අයිතිකරු ගෙවූ මුළු මුදල" value={money(total)} />
              <Bill label="ගෙවූ ආකාරය" value={job.paidOnline ? 'ඔන්ලයින්' : 'මුදලින් (ඔබ ළඟ)'} />
              {!!job.collected && <Text style={styles.feeNote}>💵 ගරාජයට භාර දිය යුතු මුදල්: {money(job.collected)} — “Earnings” ටැබයේ පෙනේ.</Text>}
            </View>
          </>
        );
      default:
        return null;
    }
  };

  const bottom = () => {
    switch (stage) {
      case 'enroute':
        return (
          <ActionButton
            label={trip >= 1 ? 'ස්ථානයට පැමිණියා' : `ගමනේ… මිනි. ${Math.max(1, Math.round(sos.etaMin * (1 - trip)))}`}
            icon="📍"
            variant="success"
            disabled={trip < 1}
            onPress={() => markArrived(job.id)}
          />
        );
      case 'arrived':
        return <ActionButton label="පරීක්ෂාව අරඹන්න" icon="🔍" variant="primary" onPress={() => startInspection(job.id)} />;
      case 'inspecting':
        return <ActionButton label={needed && value > sos.quote ? 'අනුමැතියට යවන්න' : 'ඉදිරියට'} icon="✓" variant="primary" disabled={needed && value <= 0} onPress={() => submitInspection(job.id, needed, needed ? value : 0)} />;
      case 'repairing':
        return <ActionButton label="රැකියාව අවසන් ලෙස සලකුණු කරන්න" icon="✓" variant="success" disabled={!tasksDone} onPress={() => finishRepair(job.id)} />;
      case 'qr':
        return <ActionButton label="QR ස්කෑන් කිරීම අනුකරණය කරන්න" icon="📷" variant="success" onPress={() => closeWithOwner(job.id)} />;
      case 'payment':
        return (
          <View style={styles.actions}>
            <ActionButton label="ඔන්ලයින් ගෙව්වා" variant="ghost" compact onPress={() => collectPayment(job.id, 'online')} />
            <ActionButton label={`${money(total)} ලැබුණා`} icon="💵" variant="success" compact onPress={() => collectPayment(job.id, 'cash')} />
          </View>
        );
      case 'done':
        return <ActionButton label="රැකියා වෙත" variant="primary" onPress={closeSOS} />;
      default:
        return null;
    }
  };
  const bottomBar = bottom();
  const showMap = stage === 'enroute';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Like the owner SOS flow: the map (or, on steps without one, a red band) fills the top; the controls float over it. */}
      <View style={[styles.topArea, showMap ? styles.topAreaMap : styles.topAreaBand]} onLayout={(e) => setTopH(Math.round(e.nativeEvent.layout.height))}>
        {showMap ? map(topH) : <Gradient stops={GRADIENTS.sosHeader} />}
        <View style={styles.topBar}>
          <Pressable style={styles.roundBtn} onPress={closeSOS} accessibilityLabel="Minimize">
            <Icon name="chevron-down" size={18} strokeWidth={2.5} color={Colors.textMain} />
          </Pressable>
          <View style={styles.stepPill}>
            <View style={styles.stepPillIcon}>
              <Text style={styles.headerIconText}>🚨</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.stepPillTitle} numberOfLines={1}>
                SOS · {job.customer.name}
              </Text>
              <Text style={styles.stepPillSub} numberOfLines={1}>
                පියවර {stageIndex + 1}/{STAGES.length} · {STAGE_LABEL[stage]} · {job.garage.name}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.stepper}>
          {STAGES.map((s, i) => (
            <View key={s} style={[styles.stepSeg, i < stageIndex && styles.stepDone, i === stageIndex && styles.stepActive]} />
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

const Bill: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.rowBetween}>
    <Text style={strong ? styles.cardTitle : styles.detail}>{label}</Text>
    <Text style={strong ? [styles.cardTitle, { color: Colors.success }] : styles.detail}>{value}</Text>
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

/** Used by the tab screens to label an SOS job's step. */
export const sosStageLabel = (j: TechJob) => STAGE_LABEL[j.stage] ?? j.stage;

// A stronger shadow for controls floating over the map.
const FLOAT_SHADOW = { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 14, elevation: 5 } as const;

const styles = themedStyles(() =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bgBody },
    flex1: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    actions: { flexDirection: 'row', gap: 10 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, overflow: 'hidden' },
    headerIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255, 255, 255, 0.18)', justifyContent: 'center', alignItems: 'center' },
    headerIconText: { fontSize: 20 },
    headerTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: '#fff' },
    headerSubtitle: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: 'rgba(255, 255, 255, 0.85)', marginTop: 1 },
    closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(0, 0, 0, 0.25)', justifyContent: 'center', alignItems: 'center' },
    stepper: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
    stepSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },
    stepDone: { backgroundColor: Colors.success },
    stepActive: { backgroundColor: '#ef4444' },
    body: { padding: 16, paddingTop: 4, gap: 12, paddingBottom: 30 },
    sectionLabel: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 20, padding: 14, gap: 10, ...softShadow() },
    okCard: { borderColor: 'rgba(16, 185, 129, 0.5)' },
    warnCard: { borderColor: 'rgba(245, 158, 11, 0.5)' },
    cardTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    note: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, fontStyle: 'italic' },
    detail: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textSoft },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    feeNote: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: Colors.successText, lineHeight: 17 },
    divider: { height: 1, backgroundColor: Colors.borderColor },
    iconTile: { width: 42, height: 42, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), justifyContent: 'center', alignItems: 'center', ...softShadow() },
    iconText: { fontSize: 20 },
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
    customerPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ef4444', borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#dc2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
    techPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#0284c7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
    pinEmoji: { fontSize: 15 },
    etaRow: { flexDirection: 'row', alignItems: 'center' },
    etaItem: { flex: 1, alignItems: 'center' },
    etaValue: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMain },
    etaDivider: { width: 1, height: 34, backgroundColor: Colors.borderColor },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choice: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: 'transparent', backgroundColor: softFill() },
    choiceActive: { borderColor: Colors.primary, backgroundColor: 'rgba(56, 189, 248, 0.14)' },
    choiceText: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    choiceTextActive: { color: Colors.primary, fontFamily: FONTS.bodyBold },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 54, borderRadius: 16, backgroundColor: softFill(), borderWidth: 1, borderColor: 'transparent' },
    currency: { fontSize: 16, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    priceInput: { flex: 1, fontSize: 22, fontWeight: '800', color: Colors.textMain },
    track: { height: 6, borderRadius: 3, backgroundColor: Colors.subtleBorder, overflow: 'hidden' },
    fill: { height: 6, borderRadius: 3, backgroundColor: Colors.success },
    task: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
    taskSkipped: { opacity: 0.55 },
    check: { width: 24, height: 24, borderRadius: 8, borderWidth: 1, borderColor: 'transparent', backgroundColor: softFill(), justifyContent: 'center', alignItems: 'center' },
    checkOn: { backgroundColor: Colors.success, borderColor: Colors.success },
    checkMark: { fontSize: 13, fontWeight: '900', color: '#fff' },
    taskText: { flex: 1, fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textMain },
    taskDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
    skipTag: { fontSize: 10, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    scanner: { height: 230, borderRadius: 22, backgroundColor: '#0b0f17', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    scannerEmoji: { fontSize: 90, opacity: 0.85 },
    scanLine: { position: 'absolute', left: 30, right: 30, height: 3, borderRadius: 2, backgroundColor: '#22c55e' },
    corner: { position: 'absolute', width: 34, height: 34, borderColor: '#22c55e' },
    cornerTL: { top: 20, left: 20, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
    cornerTR: { top: 20, right: 20, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
    cornerBL: { bottom: 20, left: 20, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
    cornerBR: { bottom: 20, right: 20, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
    codeRow: { flexDirection: 'row', gap: 8 },
    codeInput: {
      flex: 1,
      minWidth: 0,
      height: 50,
      paddingHorizontal: 14,
      borderRadius: 16,
      backgroundColor: softFill(),
      borderWidth: 1,
      borderColor: 'transparent',
      color: Colors.textMain,
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: 6,
    },
    codeError: { borderColor: Colors.errorText },
    codeBtn: { paddingHorizontal: 14, height: 50, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center' },
    codeBtnText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#fff' },
    off: { opacity: 0.4 },
    hero: { alignItems: 'center', paddingVertical: 24, gap: 10 },
    heroCircle: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center' },
    heroSuccess: { backgroundColor: Colors.success },
    heroGlass: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), ...softShadow() },
    heroIcon: { fontSize: 40, color: '#fff' },
    heroTitle: { fontSize: 17, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
    heroText: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', lineHeight: 19, paddingHorizontal: 12 },
    radarWrap: { width: 110, height: 110, justifyContent: 'center', alignItems: 'center' },
    radarRing: { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: 'rgba(56, 189, 248, 0.5)' },
    radarCore: { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), justifyContent: 'center', alignItems: 'center', ...softShadow() },
    radarEmoji: { fontSize: 30 },
    bottomBar: { padding: 16, paddingTop: 10, gap: 8, backgroundColor: Colors.bgBody },
  })
);
