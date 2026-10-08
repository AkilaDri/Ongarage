import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';
import { CloseCode, Colors, makeCloseCode, RATING_DIMENSIONS, themedStyles, type DimensionRating } from '@ongarage/shared';
import { FONTS } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { BREAKDOWN_TYPES, getThemeMode } from '@ongarage/shared';
import { VehiclePicker } from '../components/Header';
import { GoogleMap, type Project } from '@ongarage/shared';
import { Gradient, GRADIENTS, Pulse } from '@ongarage/shared';
import { ActionButton as SharedButton } from '@ongarage/shared';
import { ModalCard } from '@ongarage/shared';
import { etaMinutes, kmToMapPixels, offsetCoordinate, zoomToFit } from '@ongarage/shared';
import type { LatLng, PickedLocation } from '@ongarage/shared';

// An icon on a soft disc (no outline), in place of the shared bordered glass square.
const GlassIcon: React.FC<{ emoji: string; small?: boolean }> = ({ emoji, small }) => (
  <View style={[styles.softIcon, small && styles.softIconSmall]}>
    <Text style={small ? styles.softIconEmojiSmall : styles.softIconEmoji}>{emoji}</Text>
  </View>
);

// The flow's buttons are pills (the owner app's style).
const ActionButton: React.FC<React.ComponentProps<typeof SharedButton>> = (props) => <SharedButton pill {...props} />;

type Step =
  | 'confirm'
  | 'consent'
  | 'searching'
  | 'bids'
  | 'accepted'
  | 'tracking'
  | 'arrived'
  | 'repairing'
  | 'repairCompleteNotice'
  | 'qrScan'
  | 'rating';

const STEPS: { key: Step; label: string }[] = [
  { key: 'confirm', label: 'විස්තර තහවුරු කිරීම' },
  { key: 'consent', label: 'අනුමැතිය' },
  { key: 'searching', label: 'ගරාජ සෙවීම' },
  { key: 'bids', label: 'ලංසු' },
  { key: 'accepted', label: 'පිළිගත්තා' },
  { key: 'tracking', label: 'පැමිණෙමින්' },
  { key: 'arrived', label: 'පැමිණියා' },
  { key: 'repairing', label: 'අලුත්වැඩියාව' },
  { key: 'repairCompleteNotice', label: 'අවසන් බව දැනුම්දීම' },
  { key: 'qrScan', label: 'QR ස්කෑන්' },
  { key: 'rating', label: 'ශ්‍රේණිගත කිරීම' },
];

type WorkshopSeed = {
  id: string;
  name: string;
  mechanic: string;
  van: string;
  phone: string;
  rating: number;
  bid: number;
  distanceKm: number;
  bearing: number;
};

type Workshop = WorkshopSeed & { coords: LatLng; eta: number };

const SOS_WORKSHOPS: WorkshopSeed[] = [
  {
    id: 'w1',
    name: 'TopCode Mobile Roadside',
    mechanic: 'රොෂාන් පෙරේරා',
    van: 'Toyota Hiace සේවා වෑන්',
    phone: '0771234567',
    rating: 4.9,
    bid: 3500,
    distanceKm: 1.6,
    bearing: 300,
  },
  {
    id: 'w2',
    name: 'Apex Motors Rescue',
    mechanic: 'නිමල් සිල්වා',
    van: 'Nissan Caravan මෙවලම් ට්‍රක්',
    phone: '0779876543',
    rating: 4.6,
    bid: 2800,
    distanceKm: 2.4,
    bearing: 40,
  },
  {
    id: 'w3',
    name: 'Speedy Rescue Galle',
    mechanic: 'සුනිල් ප්‍රනාන්දු',
    van: 'Mitsubishi L300 සේවා වෑන්',
    phone: '0774567890',
    rating: 4.8,
    bid: 4200,
    distanceKm: 3.3,
    bearing: 160,
  },
];

const INITIAL_RADIUS_KM = 1;
const RADIUS_STEP_KM = 1;
// Call-out fee paid to the technician for travelling to the breakdown (OnGarage
// approved); due even if no repair is needed. A wider search means farther travel.
const BASE_FEE = 500;
const SURCHARGE_STEP = 250;
const CYCLE_MS = 6000;
const MAX_CYCLES = 4;
const TRACKING_MS = 20000;

const REWARDS = [
  { title: 'පක්ෂපාතී ත්‍යාගය', description: 'ඊළඟ අලුත්වැඩියාවට රු. 250 ක වට්ටමක්', points: 250 },
  { title: 'ඉක්මන් අලුත්වැඩියා ප්‍රසාද', description: 'නොමිලේ වාහන සෞඛ්‍ය පරීක්ෂාවක්', points: 100 },
  { title: 'මාර්ග වීරයා', description: 'OnGarage ලකුණු 500 ක් එකතු විය', points: 500 },
];

const REPAIR_STAGES = [
  { at: 0, label: 'දෝෂය හඳුනා ගැනීම' },
  { at: 35, label: 'අලුත්වැඩියාව සිදු කිරීම' },
  { at: 75, label: 'පරීක්ෂා කිරීම සහ තහවුරු කිරීම' },
];

const CONFETTI_COLORS = ['#f59e0b', '#38bdf8', '#10b981', '#ef4444', '#a855f7', '#ec4899'];
const CONFETTI = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * Math.PI * 2;
  const dist = 90 + (i % 5) * 22;
  return {
    id: i,
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    rotate: (i * 37) % 360,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + (i % 3) * 3,
  };
});

const ratingLabel = (r: number) =>
  r === 0 ? 'තරුවක් තට්ටු කරන්න' : r === 5 ? 'විශිෂ්ටයි!' : r === 4 ? 'ඉතා හොඳ සේවාවක්!' : r === 3 ? 'හොඳ සේවාවක්' : 'වැඩිදියුණු විය යුතුයි';

const money = (n: number) => `රු. ${n.toLocaleString()}`;

interface SOSFlowScreenProps {
  location: PickedLocation;
  vehicleId: string;
  onVehicleChange: (vehicleId: string) => void;
  onChangeLocation: () => void;
  onClose: () => void;
}

export const SOSFlowScreen: React.FC<SOSFlowScreenProps> = ({
  location,
  vehicleId,
  onVehicleChange,
  onChangeLocation,
  onClose,
}) => {
  const [step, setStep] = useState<Step>('confirm');
  // The owner's closing code: the technician scans the QR or types these six digits.
  const [closeCode] = useState(makeCloseCode);
  const [breakdown, setBreakdown] = useState<string | null>(null);
  const [radius, setRadius] = useState(INITIAL_RADIUS_KM);
  const [surcharge, setSurcharge] = useState(BASE_FEE);
  const [cycle, setCycle] = useState(0);
  const [expansionPrompt, setExpansionPrompt] = useState(false);
  const [selected, setSelected] = useState<Workshop | null>(null);
  const [trackP, setTrackP] = useState(0);
  const [repairP, setRepairP] = useState(0);
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  // The garage is rated on the same four dimensions as a workshop job (its trust score).
  const [dims, setDims] = useState<DimensionRating>({ quality: 0, pricing: 0, onTime: 0, communication: 0 });
  const dimsDone = RATING_DIMENSIONS.every((d) => dims[d.id] > 0);
  const [reward, setReward] = useState(REWARDS[0]);
  const [showCancel, setShowCancel] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const vehicleRef = useRef<View>(null);

  const cycleAnim = useRef(new Animated.Value(0)).current;
  const trackAnim = useRef(new Animated.Value(0)).current;
  const popAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const starScale = useRef(new Animated.Value(1)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const rewardScale = useRef(new Animated.Value(0)).current;

  const vehicle = useVehicles().findVehicle(vehicleId);
  const lat = location.coords.latitude;

  const workshops = useMemo<Workshop[]>(
    () =>
      SOS_WORKSHOPS.map((w) => ({
        ...w,
        coords: offsetCoordinate(location.coords, w.distanceKm, w.bearing),
        eta: etaMinutes(w.distanceKm),
      })),
    [location.coords]
  );
  const responders = workshops.filter((w) => w.distanceKm <= radius);

  const expandSearch = () => {
    setRadius((r) => r + RADIUS_STEP_KM);
    setSurcharge((s) => s + SURCHARGE_STEP);
    setCycle((c) => c + 1);
  };

  const startSearch = () => {
    setRadius(INITIAL_RADIUS_KM);
    setSurcharge(BASE_FEE);
    setCycle(0);
    setExpansionPrompt(false);
    setStep('searching');
  };

  // Step 3: each cycle either surfaces new bids or asks to widen the radius (+1 km, +LKR 250).
  useEffect(() => {
    if (step !== 'searching' || expansionPrompt) return;
    cycleAnim.setValue(0);
    const anim = Animated.timing(cycleAnim, { toValue: 1, duration: CYCLE_MS, easing: Easing.linear, useNativeDriver: false });
    anim.start();
    const timer = setTimeout(() => {
      if (cycle + 1 >= MAX_CYCLES) {
        setStep('bids');
      } else if (workshops.every((w) => w.distanceKm > radius)) {
        setExpansionPrompt(true);
      } else {
        expandSearch();
      }
    }, CYCLE_MS);
    return () => {
      anim.stop();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, cycle, expansionPrompt]);

  useEffect(() => {
    if (step === 'searching' || step === 'repairing') {
      spinAnim.setValue(0);
      const loop = Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }));
      loop.start();
      return () => loop.stop();
    }
  }, [step, spinAnim]);

  useEffect(() => {
    if (step !== 'accepted' && step !== 'arrived') return;
    popAnim.setValue(0);
    Animated.spring(popAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start();
    if (step === 'accepted') {
      const timer = setTimeout(() => setStep('tracking'), 2800);
      return () => clearTimeout(timer);
    }
  }, [step, popAnim]);

  // Step 6: quantised progress so the map overlay re-renders a few times per second, not every frame.
  useEffect(() => {
    if (step !== 'tracking') return;
    trackAnim.setValue(0);
    setTrackP(0);
    const id = trackAnim.addListener(({ value }) => setTrackP(Math.round(value * 50) / 50));
    const anim = Animated.timing(trackAnim, { toValue: 1, duration: TRACKING_MS, easing: Easing.linear, useNativeDriver: false });
    anim.start(({ finished }) => finished && setStep('arrived'));
    return () => {
      anim.stop();
      trackAnim.removeListener(id);
    };
  }, [step, trackAnim]);

  useEffect(() => {
    if (step !== 'repairing') return;
    setRepairP(0);
    const timer = setInterval(() => setRepairP((p) => Math.min(100, p + 2)), 120);
    return () => clearInterval(timer);
  }, [step]);

  useEffect(() => {
    if (step === 'repairing' && repairP >= 100) setStep('repairCompleteNotice');
  }, [step, repairP]);

  useEffect(() => {
    if (!submitted) return;
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [submitted, onClose]);

  const burstConfetti = () => {
    setShowConfetti(true);
    confettiAnim.setValue(0);
    Animated.timing(confettiAnim, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() =>
      setTimeout(() => setShowConfetti(false), 300)
    );
  };

  const pressStar = (star: number) => {
    if (submitted) return;
    setRating(star);
    starScale.setValue(0.6);
    Animated.spring(starScale, { toValue: 1, friction: 3, tension: 180, useNativeDriver: true }).start();
    if (star === 5) burstConfetti();
  };

  const submitRating = () => {
    setSubmitted(true);
    burstConfetti();
    rewardScale.setValue(0);
    Animated.spring(rewardScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
  };

  const requestClose = () => {
    if (step === 'confirm' || submitted) onClose();
    else setShowCancel(true);
  };

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const job = selected ?? workshops[0];
  const mechanicCoords: LatLng = {
    latitude: job.coords.latitude + (location.coords.latitude - job.coords.latitude) * trackP,
    longitude: job.coords.longitude + (location.coords.longitude - job.coords.longitude) * trackP,
  };
  const remainingKm = job.distanceKm * (1 - trackP);
  const baseStep: Step = step === 'consent' ? 'confirm' : step === 'repairCompleteNotice' ? 'repairing' : step;
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  // ---------- Shared map overlays ----------

  const userPin = (project: Project) => {
    const me = project(location.coords);
    return me ? (
      <View key="me" style={[styles.pinAnchor, { left: me.x, top: me.y }]} pointerEvents="none">
        <View style={styles.userPin}>
          <Text style={styles.pinEmoji}>🚗</Text>
        </View>
      </View>
    ) : null;
  };

  const workshopPins = (project: Project, list: Workshop[], dimmed?: (w: Workshop) => boolean) =>
    list.map((w) => {
      const p = project(w.coords);
      if (!p) return null;
      const dim = dimmed?.(w);
      return (
        <View key={w.id} style={[styles.pinAnchor, { left: p.x, top: p.y }]} pointerEvents="none">
          <View style={[styles.workshopPin, dim && styles.workshopPinDim]}>
            <Text style={styles.workshopPinText}>🛠️ {w.distanceKm}km</Text>
          </View>
        </View>
      );
    });

  // Height of the top layer (map or band); measured, so the maps zoom to fit what is visible.
  const [topH, setTopH] = useState(320);
  // Each step opens at the top of the sheet, not where the last one was scrolled to.
  const sheetScroll = useRef<ScrollView>(null);
  useEffect(() => {
    sheetScroll.current?.scrollTo({ y: 0, animated: false });
  }, [baseStep]);

  const renderMap = (height: number, kind: 'confirm' | 'searching' | 'bids' | 'tracking') => {
    if (kind === 'confirm') {
      return (
        <GoogleMap style={styles.mapFull} center={location.coords} zoom={16} fallbackColor="#ef4444" renderOverlay={(p) => userPin(p)} />
      );
    }
    if (kind === 'searching') {
      const zoom = zoomToFit(radius * 2, lat, height);
      return (
        <GoogleMap
          style={styles.mapFull}
          center={location.coords}
          zoom={zoom}
          fallbackColor="#ef4444"
          renderOverlay={(project) => {
            const me = project(location.coords);
            return (
              <>
                {me && (
                  <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
                    <Circle
                      cx={me.x}
                      cy={me.y}
                      r={kmToMapPixels(radius, lat, zoom)}
                      fill="rgba(239, 68, 68, 0.12)"
                      stroke="rgba(239, 68, 68, 0.75)"
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                    />
                  </Svg>
                )}
                {workshopPins(project, workshops, (w) => w.distanceKm > radius)}
                {userPin(project)}
              </>
            );
          }}
        />
      );
    }
    if (kind === 'bids') {
      const far = Math.max(...responders.map((w) => w.distanceKm), 1);
      return (
        <GoogleMap
          style={styles.mapFull}
          center={location.coords}
          zoom={zoomToFit(far * 2, lat, height)}
          renderOverlay={(project) => (
            <>
              {workshopPins(project, responders)}
              {userPin(project)}
            </>
          )}
        />
      );
    }
    const mid: LatLng = {
      latitude: (job.coords.latitude + location.coords.latitude) / 2,
      longitude: (job.coords.longitude + location.coords.longitude) / 2,
    };
    return (
      <GoogleMap
        style={styles.mapFull}
        center={mid}
        zoom={zoomToFit(job.distanceKm, mid.latitude, height)}
        fallbackColor="#10b981"
        renderOverlay={(project) => {
          const a = project(mechanicCoords);
          const b = project(location.coords);
          return (
            <>
              {a && b && (
                <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
                  <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={Colors.success} strokeWidth={3} strokeDasharray="8 6" />
                </Svg>
              )}
              {userPin(project)}
              {a && (
                <View style={[styles.pinAnchor, { left: a.x, top: a.y }]} pointerEvents="none">
                  <View style={styles.mechanicPin}>
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

  const mechanicCard = (lines: { icon: string; text: string }[]) => (
    <View style={styles.card}>
      <View style={styles.rowCenter}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>👨‍🔧</Text>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.cardTitle}>{job.mechanic}</Text>
          <Text style={styles.cardSub}>
            {job.name} · {job.van}
          </Text>
        </View>
        <View style={styles.ratingPill}>
          <Text style={styles.ratingPillText}>★ {job.rating}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      {lines.map((l) => (
        <View key={l.text} style={styles.detailRow}>
          <Text style={styles.detailIcon}>{l.icon}</Text>
          <Text style={styles.detailText}>{l.text}</Text>
        </View>
      ))}
    </View>
  );

  // ---------- Steps ----------

  const renderConfirm = () => (
    <>
      <View style={styles.card}>
        <Pressable ref={vehicleRef} style={styles.selectRow} onPress={() => setShowVehiclePicker(true)}>
          <GlassIcon emoji="🚗" />
          <View style={styles.flex1}>
            <Text style={styles.label}>වාහනය</Text>
            <Text style={styles.cardTitle}>
              {vehicle.name} · {vehicle.plate}
            </Text>
          </View>
          <Text style={styles.linkText}>වෙනස් කරන්න</Text>
        </Pressable>
        <View style={styles.divider} />
        <Pressable style={styles.selectRow} onPress={onChangeLocation}>
          <GlassIcon emoji="📍" />
          <View style={styles.flex1}>
            <Text style={styles.label}>බ්‍රේක්ඩවුන් ස්ථානය</Text>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {location.address}
            </Text>
          </View>
          <Text style={styles.linkText}>වෙනස් කරන්න</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>බ්‍රේක්ඩවුන් වර්ගය තෝරන්න</Text>
      <View style={styles.grid}>
        {BREAKDOWN_TYPES.map((t) => {
          const active = breakdown === t.id;
          return (
            <Pressable
              key={t.id}
              style={({ pressed }) => [styles.gridItem, pressed && { transform: [{ scale: 1.06 }] }]}
              onPress={() => setBreakdown(t.id)}
            >
              <View style={[styles.glassTile, active && styles.glassTileActive]}>
                <Text style={styles.gridEmoji}>{t.icon}</Text>
              </View>
              <Text style={[styles.gridLabel, active && { color: Colors.errorText }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  const renderSearching = () => (
    <>
      <View style={[styles.card, styles.rowCenter]}>
        <View style={styles.radarWrap}>
          <Pulse style={styles.radarRing} maxScale={1.6} />
          <Animated.View style={[styles.radarCore, { transform: [{ rotate: spin }] }]}>
            <Text style={styles.radarEmoji}>📡</Text>
          </Animated.View>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.cardTitle}>ආසන්න ගරාජ සොයමින්...</Text>
          <Text style={styles.cardSub}>කි.මී. {radius} ක් ඇතුළත ගරාජ වෙත දැනුම් දෙමින් පවතී</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>කි.මී. {radius}</Text>
          <Text style={styles.statLabel}>සෙවුම් කලාපය</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.warning }]}>{money(surcharge)}</Text>
          <Text style={styles.statLabel}>පැමිණීමේ ගාස්තුව</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.success }]}>{responders.length}</Text>
          <Text style={styles.statLabel}>ලංසු</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[styles.progressFill, { width: cycleAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
        />
      </View>

      <Text style={styles.sectionLabel}>ප්‍රතිචාර දක්වන ගරාජ</Text>
      {workshops.map((w) => {
        const responded = w.distanceKm <= radius;
        return (
          <View key={w.id} style={[styles.card, styles.rowCenter, !responded && { opacity: 0.45 }]}>
            <GlassIcon emoji="🛠️" small />
            <View style={styles.flex1}>
              <Text style={styles.cardTitle}>{w.name}</Text>
              <Text style={styles.cardSub}>
                කි.මී. {w.distanceKm} · මිනි. {w.eta}
              </Text>
            </View>
            <View style={[styles.statusPill, responded ? styles.statusPillOn : styles.statusPillOff]}>
              <Text style={[styles.statusPillText, { color: responded ? Colors.success : Colors.textMuted }]}>
                {responded ? '✓ ලංසුව ලැබුණා' : 'රැඳී සිටී...'}
              </Text>
            </View>
          </View>
        );
      })}
    </>
  );

  const renderBids = () => (
    <>
      <View style={[styles.card, styles.centerCard]}>
        <GlassIcon emoji="🤝" />
        <Text style={styles.heroTitle}>ලංසු ලැබී ඇත</Text>
        <Text style={styles.heroText}>ගරාජ {responders.length} ක් ඔබගේ වාහනය අලුත්වැඩියා කිරීමට ලංසු තබා ඇත. ඔබ කැමති එක තෝරන්න.</Text>
      </View>
      {responders.map((w) => (
        <View key={w.id} style={styles.card}>
          <View style={styles.rowCenter}>
            <View style={styles.flex1}>
              <Text style={styles.cardTitle}>{w.name}</Text>
              <Text style={styles.cardSub}>
                📍 කි.මී. {w.distanceKm} · ⏱️ මිනි. {w.eta}
              </Text>
            </View>
            <View style={styles.bidPill}>
              <Text style={styles.bidPillText}>{money(w.bid)}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.rowCenter}>
            <View style={[styles.avatar, styles.avatarSmall]}>
              <Text style={styles.avatarEmojiSmall}>👨‍🔧</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.detailStrong}>{w.mechanic}</Text>
              <Text style={styles.cardSub}>{w.van}</Text>
            </View>
            <View style={styles.ratingPill}>
              <Text style={styles.ratingPillText}>★ {w.rating}</Text>
            </View>
          </View>
          <ActionButton
            label="මෙම ගරාජය තෝරන්න"
            icon="✓"
            variant="primary"
            onPress={() => {
              setSelected(w);
              setStep('accepted');
            }}
          />
        </View>
      ))}
    </>
  );

  const renderAccepted = () => (
    <>
      <View style={styles.hero}>
        <Animated.View style={[styles.heroCircle, styles.heroCircleSuccess, { opacity: popAnim, transform: [{ scale: popAnim }] }]}>
          <Text style={styles.heroCircleIcon}>✓</Text>
        </Animated.View>
        <Text style={styles.heroTitle}>ඉල්ලීම පිළිගත්තා!</Text>
        <Text style={styles.heroText}>{job.name} ඔබගේ SOS ඉල්ලීම පිළිගෙන ඇත.</Text>
      </View>
      {mechanicCard([
        { icon: '📞', text: job.phone },
        { icon: '💰', text: `ඇස්තමේන්තුගත ලංසුව: ${money(job.bid)}` },
        { icon: '⏱️', text: `මිනිත්තු ~${job.eta} කින් පැමිණේ` },
      ])}
      <Text style={styles.hint}>සජීවී ලුහුබැඳීම ආරම්භ වෙමින්...</Text>
    </>
  );

  const renderTracking = () => (
    <>
      <View style={styles.card}>
        <View style={styles.rowCenter}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>👨‍🔧</Text>
          </View>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>{job.mechanic}</Text>
            <Text style={styles.cardSub}>{job.van}</Text>
          </View>
          <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${job.phone}`)}>
            <Text style={styles.callBtnText}>📞</Text>
          </Pressable>
        </View>
        <View style={styles.divider} />
        <View style={styles.etaRow}>
          <View style={styles.etaItem}>
            <Text style={styles.etaValue}>{remainingKm.toFixed(2)} km</Text>
            <Text style={styles.statLabel}>ඉතිරි දුර</Text>
          </View>
          <View style={styles.etaDivider} />
          <View style={styles.etaItem}>
            <Text style={styles.etaValue}>මිනි. {Math.max(1, etaMinutes(remainingKm) - 2)}</Text>
            <Text style={styles.statLabel}>පැමිණීමට</Text>
          </View>
        </View>
        <View style={[styles.statusPill, styles.statusPillOn, styles.selfCenter]}>
          <Text style={[styles.statusPillText, { color: Colors.success }]}>🛣️ යාන්ත්‍රිකයා පැමිණෙමින් සිටී</Text>
        </View>
      </View>
    </>
  );

  const renderArrived = () => (
    <>
      <View style={styles.hero}>
        <Animated.View style={[styles.heroCircle, styles.heroCircleSuccess, { opacity: popAnim, transform: [{ scale: popAnim }] }]}>
          <Text style={styles.heroCircleIcon}>🚐</Text>
        </Animated.View>
        <Text style={styles.heroTitle}>යාන්ත්‍රිකයා පැමිණියා!</Text>
        <Text style={styles.heroText}>
          {job.name} හි {job.mechanic} ඔබගේ ස්ථානයට පැමිණ ඇත.
        </Text>
      </View>
      {mechanicCard([
        { icon: '📞', text: job.phone },
        { icon: '💰', text: `එකඟ වූ ලංසුව: ${money(job.bid)}` },
      ])}
    </>
  );

  const renderRepairing = () => (
    <>
      <View style={styles.hero}>
        <View style={[styles.heroCircle, styles.heroCircleGlass]}>
          <Animated.Text style={[styles.heroCircleIcon, { transform: [{ rotate: spin }] }]}>🔧</Animated.Text>
        </View>
        <Text style={styles.heroTitle}>අලුත්වැඩියාව සිදුවෙමින්</Text>
        <Text style={styles.heroText}>
          {job.mechanic} ඔබගේ {vehicle.name} අලුත්වැඩියා කරමින් සිටී.
        </Text>
      </View>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>ප්‍රගතිය</Text>
          <Text style={styles.detailStrong}>{repairP}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, styles.progressFillSuccess, { width: `${repairP}%` }]} />
        </View>
        {REPAIR_STAGES.map((s, i) => {
          const next = REPAIR_STAGES[i + 1]?.at ?? 100;
          const done = repairP >= next;
          const active = repairP >= s.at && !done;
          return (
            <View key={s.label} style={styles.detailRow}>
              <Text style={[styles.detailIcon, { color: done ? Colors.success : active ? Colors.warning : Colors.textMuted }]}>
                {done ? '✓' : active ? '●' : '○'}
              </Text>
              <Text style={[styles.detailText, !done && !active && { color: Colors.textMuted }]}>{s.label}</Text>
            </View>
          );
        })}
      </View>
    </>
  );

  const renderQrScan = () => (
    <>
      <View style={styles.hero}>
        <View style={[styles.heroCircle, styles.heroCircleGlass]}>
          <Text style={styles.heroCircleIcon}>🔳</Text>
        </View>
        <Text style={styles.heroTitle}>QR කේතය ස්කෑන් කරන්න</Text>
        <Text style={styles.heroText}>රැකියාව අවසන් කිරීමට ගරාජ කාර්මිකයාගේ උපාංගයෙන් මෙම QR කේතය ස්කෑන් කරන්න.</Text>
      </View>
      <CloseCode code={closeCode} size={190} caption="ස්කෑන් කළ නොහැකි නම් මෙම ඉලක්කම් 6 කාර්මිකයාට කියන්න." />
      <View style={styles.card}>
        <Text style={styles.label}>බිල්පත් සාරාංශය</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.detailText}>අලුත්වැඩියා ලංසුව</Text>
          <Text style={styles.detailText}>{money(job.bid)}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.detailText}>යාන්ත්‍රිකයාගේ පැමිණීමේ ගාස්තුව</Text>
          <Text style={styles.detailText}>{money(surcharge)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>මුළු එකතුව</Text>
          <Text style={[styles.cardTitle, { color: Colors.success }]}>{money(job.bid + surcharge)}</Text>
        </View>
      </View>
    </>
  );

  const renderRating = () => (
    <>
      <View style={styles.hero}>
        <View style={[styles.heroCircle, styles.heroCircleGlass]}>
          <Text style={styles.heroCircleIcon}>⭐</Text>
        </View>
        <Text style={styles.heroTitle}>ඔබගේ යාන්ත්‍රිකයා ශ්‍රේණිගත කරන්න</Text>
        <Text style={styles.heroText}>{job.mechanic} සමඟ ඔබගේ සේවා අත්දැකීම කෙසේද?</Text>
      </View>

      <View style={[styles.card, styles.centerCard]}>
        <View style={styles.avatarRing}>
          <View style={[styles.avatar, styles.avatarLarge]}>
            <Text style={styles.avatarEmojiLarge}>👨‍🔧</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>{job.mechanic}</Text>
        <Text style={styles.cardSub}>🛠️ {job.name}</Text>
        <Text style={styles.cardSub}>🚐 {job.van}</Text>
      </View>

      <View style={[styles.card, styles.centerCard]}>
        <Text style={styles.detailStrong}>ඔබගේ අත්දැකීම ශ්‍රේණිගත කරන්න</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Pressable key={s} onPress={() => pressStar(s)} hitSlop={6}>
              <Animated.Text style={[styles.star, rating >= s && styles.starOn, { transform: [{ scale: rating === s ? starScale : 1 }] }]}>
                {rating >= s ? '★' : '☆'}
              </Animated.Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.detailStrong, { color: rating >= 4 ? Colors.success : Colors.textMuted }]}>{ratingLabel(rating)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.detailStrong}>🛠️ {job.name} — ගරාජය</Text>
        {RATING_DIMENSIONS.map((d) => (
          <View key={d.id} style={styles.rowBetween}>
            <Text style={styles.detailText}>{d.label}</Text>
            <View style={styles.dimStars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => !submitted && setDims((p) => ({ ...p, [d.id]: n }))} hitSlop={4} accessibilityLabel={`Rate ${d.id} ${n}`}>
                  <Text style={[styles.dimStar, dims[d.id] >= n && styles.dimStarOn]}>★</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </View>

      {submitted && (
        <Animated.View style={[styles.rewardCard, { transform: [{ scale: rewardScale }] }]}>
          <Gradient stops={GRADIENTS.brand} />
          <Text style={styles.rewardIcon}>🎁</Text>
          <Text style={[styles.heroTitle, { color: '#fff' }]}>ස්තූතියි!</Text>
          <Text style={styles.rewardText}>
            {reward.title} — {reward.description}
          </Text>
          <View style={styles.pointsPill}>
            <Text style={styles.pointsText}>💎 +{reward.points} ලකුණු</Text>
          </View>
          <Text style={styles.rewardText}>මුල් පිටුවට යොමු කරමින්...</Text>
        </Animated.View>
      )}
    </>
  );

  const renderBottomBar = () => {
    switch (baseStep) {
      case 'confirm':
        return (
          <ActionButton
            label="SOS ඉල්ලීම දැන් යවන්න"
            icon="🚨"
            variant="sos"
            disabled={!breakdown}
            onPress={() => setStep('consent')}
          />
        );
      case 'searching':
        return (
          <>
            {responders.length > 0 && (
              <ActionButton label={`ලංසු බලන්න (${responders.length})`} icon="🤝" variant="primary" onPress={() => setStep('bids')} />
            )}
            <ActionButton label="ඉල්ලීම අවලංගු කරන්න" variant="ghost" onPress={() => setShowCancel(true)} />
          </>
        );
      case 'bids':
        return <ActionButton label="ඉල්ලීම අවලංගු කරන්න" variant="ghost" onPress={() => setShowCancel(true)} />;
      case 'arrived':
        return <ActionButton label="පැමිණීම තහවුරු කරන්න" icon="✓" variant="success" onPress={() => setStep('repairing')} />;
      case 'qrScan':
        return (
          <ActionButton
            label="ස්කෑන් කිරීම අනුකරණය කරන්න"
            icon="📷"
            variant="success"
            onPress={() => {
              setReward(REWARDS[Math.floor(Math.random() * REWARDS.length)]);
              setRating(0);
              setSubmitted(false);
              setStep('rating');
            }}
          />
        );
      case 'rating':
        return submitted ? null : (
          <ActionButton label="ශ්‍රේණිගත කිරීම යවන්න" icon="✓" variant="primary" disabled={rating === 0 || !dimsDone} onPress={submitRating} />
        );
      default:
        return null;
    }
  };

  const bottomBar = renderBottomBar();
  const mapKind: 'confirm' | 'searching' | 'bids' | 'tracking' | null =
    baseStep === 'confirm' || baseStep === 'searching' || baseStep === 'bids' || baseStep === 'tracking' ? baseStep : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* PickMe-style: the map (or, on steps without one, a red band) fills the top; the controls float over it. */}
      <View style={[styles.topArea, mapKind ? styles.topAreaMap : styles.topAreaBand]} onLayout={(e) => setTopH(Math.round(e.nativeEvent.layout.height))}>
        {mapKind ? renderMap(topH, mapKind) : <Gradient stops={GRADIENTS.sosHeader} />}
        <View style={styles.topBar}>
          <Pressable style={styles.roundBtn} onPress={requestClose} accessibilityLabel="Close SOS">
            <Text style={styles.roundBtnText}>✕</Text>
          </Pressable>
          <View style={styles.stepPill}>
            <View style={styles.stepPillIcon}>
              <Text style={styles.headerIconText}>🚨</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.stepPillTitle} numberOfLines={1}>හදිසි මාර්ග ආධාර (SOS)</Text>
              <Text style={styles.stepPillSub} numberOfLines={1}>
                පියවර {stepIndex + 1}/{STEPS.length} · {STEPS[stepIndex].label}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.stepper}>
          {STEPS.map((s, i) => (
            <View key={s.key} style={[styles.stepSeg, i < stepIndex && styles.stepSegDone, i === stepIndex && styles.stepSegActive]} />
          ))}
        </View>

        <ScrollView ref={sheetScroll} style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {baseStep === 'confirm' && renderConfirm()}
          {baseStep === 'searching' && renderSearching()}
          {baseStep === 'bids' && renderBids()}
          {baseStep === 'accepted' && renderAccepted()}
          {baseStep === 'tracking' && renderTracking()}
          {baseStep === 'arrived' && renderArrived()}
          {baseStep === 'repairing' && renderRepairing()}
          {baseStep === 'qrScan' && renderQrScan()}
          {baseStep === 'rating' && renderRating()}
        </ScrollView>

        {bottomBar && <View style={styles.bottomBar}>{bottomBar}</View>}
      </View>

      {showConfetti && (
        <View pointerEvents="none" style={styles.confettiLayer}>
          {CONFETTI.map((p) => (
            <Animated.View
              key={p.id}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size * 0.6,
                borderRadius: 2,
                backgroundColor: p.color,
                opacity: confettiAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
                transform: [
                  { translateX: confettiAnim.interpolate({ inputRange: [0, 1], outputRange: [0, p.x] }) },
                  { translateY: confettiAnim.interpolate({ inputRange: [0, 1], outputRange: [0, p.y] }) },
                  { rotate: confettiAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rotate}deg`] }) },
                ],
              }}
            />
          ))}
        </View>
      )}

      {step === 'consent' && (
        <ModalCard
          icon="⚠️"
          tone="danger"
          title="SOS ඉල්ලීම තහවුරු කරන්න"
          body={`ඔබගේ ස්ථානයේ සිට කි.මී. ${INITIAL_RADIUS_KM} ක් ඇතුළත ලියාපදිංචි ගරාජ වෙත දැනුම් දෙනු ලැබේ. ඔබ වෙත පැමිණීමේ ගමන් වියදම වෙනුවෙන් OnGarage අනුමත ${money(BASE_FEE)} ක පැමිණීමේ ගාස්තුවක් යාන්ත්‍රිකයාට ගෙවිය යුතුය — අලුත්වැඩියාවක් අවශ්‍ය නොවුණත් මෙය අදාළ වේ.`}
        >
          <ActionButton label="අවලංගු" variant="ghost" compact onPress={() => setStep('confirm')} />
          <ActionButton label="මම එකඟයි" variant="sos" compact onPress={startSearch} />
        </ModalCard>
      )}

      {step === 'searching' && expansionPrompt && (
        <ModalCard
          icon="📡"
          tone="primary"
          title="සෙවුම් කලාපය පුළුල් කරමින්"
          body={`තවම කිසිදු ගරාජයක් ප්‍රතිචාර දක්වා නැත. සෙවුම් කලාපය කි.මී. ${radius + RADIUS_STEP_KM} දක්වා වැඩි කෙරේ. වැඩි දුරක් ගමන් කරන යාන්ත්‍රිකයාට පැමිණීමේ ගාස්තුවට ${money(SURCHARGE_STEP)} ක් එකතු වේ.`}
        >
          <ActionButton label="අවලංගු" variant="ghost" compact onPress={() => setShowCancel(true)} />
          <ActionButton
            label="දිගටම සොයන්න"
            variant="primary"
            compact
            onPress={() => {
              setExpansionPrompt(false);
              expandSearch();
            }}
          />
        </ModalCard>
      )}

      {step === 'repairCompleteNotice' && (
        <ModalCard
          icon="✅"
          tone="success"
          title="අලුත්වැඩියාව අවසන්"
          body={`${job.mechanic} අලුත්වැඩියාව අවසන් බව සලකුණු කර ඇත. කරුණාකර ඔබගේ වාහනය පරීක්ෂා කර තහවුරු කරන්න.`}
        >
          <ActionButton label="හරි, මම පරීක්ෂා කළා" icon="✓" variant="success" compact onPress={() => setStep('qrScan')} />
        </ModalCard>
      )}

      {showCancel && (
        <ModalCard icon="🛑" tone="danger" title="SOS ඉල්ලීම අවලංගු කරන්නද?" body="ඔබගේ ඉල්ලීම සහ ලැබුණු ලංසු සියල්ල ඉවත් කෙරේ.">
          <ActionButton label="නැත" variant="ghost" compact onPress={() => setShowCancel(false)} />
          <ActionButton label="ඔව්, අවලංගු කරන්න" variant="sos" compact onPress={onClose} />
        </ModalCard>
      )}

      <VehiclePicker
        visible={showVehiclePicker}
        activeVehicle={vehicleId}
        anchorRef={vehicleRef}
        onSelect={onVehicleChange}
        onClose={() => setShowVehiclePicker(false)}
      />
    </SafeAreaView>
  );
};

// A stronger shadow for controls floating over the map.
const FLOAT_SHADOW = { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 14, elevation: 5 } as const;

// Soft shadow in place of an outline, like Home and the other tabs.
const SOFT_SHADOW = { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 } as const;

const styles = themedStyles(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBody },
  flex1: { flex: 1 },
  selfCenter: { alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  softIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.subtleFill, justifyContent: 'center', alignItems: 'center' },
  softIconSmall: { width: 40, height: 40, borderRadius: 20 },
  softIconEmoji: { fontSize: 21 },
  softIconEmojiSmall: { fontSize: 18 },
  headerIconText: { fontSize: 18 },
  headerTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: '#fff' },
  headerSubtitle: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: '#fca5a5' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 14, color: '#fff' },
  stepper: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  stepSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },
  stepSegDone: { backgroundColor: 'rgba(239, 68, 68, 0.6)' },
  stepSegActive: { backgroundColor: '#ef4444' },
  body: { padding: 16, paddingTop: 6, gap: 12, paddingBottom: 24 },
  mapFull: { ...StyleSheet.absoluteFill },
  topArea: { overflow: 'hidden' },
  topAreaMap: { height: '42%' },
  topAreaBand: { height: 130 },
  topBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center', ...FLOAT_SHADOW },
  roundBtnText: { fontSize: 16, fontWeight: '700', color: Colors.textMain },
  stepPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard, ...FLOAT_SHADOW },
  stepPillIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: getThemeMode() === 'dark' ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2', justifyContent: 'center', alignItems: 'center' },
  stepPillTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
  stepPillSub: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: '#dc2626' },
  // The step lives in a rounded sheet that overlaps the map, like the location picker's card.
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
  card: {
    backgroundColor: Colors.bgCard,
    borderWidth: getThemeMode() === 'dark' ? 1 : 0,
    borderColor: Colors.borderColor,
    borderRadius: 20,
    padding: 14,
    gap: 10,
    ...SOFT_SHADOW,
  },
  centerCard: { alignItems: 'center' },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { height: 1, backgroundColor: Colors.borderColor },
  label: { fontSize: 10, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4 },
  linkText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  cardTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
  cardSub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
  // Same heading style as the Home screen's sections.
  sectionLabel: { fontSize: 14.5, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 6 },
  hint: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, textAlign: 'center' },


  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  gridItem: { width: '31%', alignItems: 'center', gap: 6 },
  glassTile: { width: 76, height: 76, borderRadius: 38, backgroundColor: Colors.bgCard, borderWidth: getThemeMode() === 'dark' ? 1 : 0, borderColor: Colors.borderColor, justifyContent: 'center', alignItems: 'center', ...SOFT_SHADOW },
  glassTileActive: { backgroundColor: 'rgba(239, 68, 68, 0.14)', borderWidth: 2, borderColor: '#ef4444' },
  gridEmoji: { fontSize: 30 },
  gridLabel: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center' },

  pinAnchor: { position: 'absolute', transform: [{ translateX: '-50%' }, { translateY: '-50%' }] },
  userPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 6,
  },
  mechanicPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.success,
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 6,
  },
  pinEmoji: { fontSize: 15 },
  workshopPin: {
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  workshopPinDim: { backgroundColor: '#334155', borderColor: 'rgba(255, 255, 255, 0.4)' },
  workshopPinText: { fontSize: 9.5, fontWeight: '800', color: '#fff' },

  radarWrap: { width: 52, height: 52, justifyContent: 'center', alignItems: 'center' },
  radarRing: { position: 'absolute', width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: 'rgba(239, 68, 68, 0.6)' },
  radarCore: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
  radarEmoji: { fontSize: 18 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderWidth: getThemeMode() === 'dark' ? 1 : 0,
    borderColor: Colors.borderColor,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    ...SOFT_SHADOW,
  },
  statValue: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
  statLabel: { fontSize: 9.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.subtleBorder, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#ef4444' },
  progressFillSuccess: { backgroundColor: Colors.success },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusPillOn: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.4)' },
  statusPillOff: { backgroundColor: Colors.subtleFill, borderColor: Colors.borderColor },
  statusPillText: { fontSize: 9.5, fontFamily: FONTS.bodySemiBold },

  bidPill: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: Colors.success, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  bidPillText: { fontSize: 12, fontFamily: FONTS.titleBold, color: Colors.success },
  ratingPill: { backgroundColor: 'rgba(245, 158, 11, 0.14)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  ratingPillText: { fontSize: 10.5, fontWeight: '800', color: Colors.warning },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.subtleFill, justifyContent: 'center', alignItems: 'center' },
  avatarSmall: { width: 36, height: 36, borderRadius: 18 },
  avatarLarge: { width: 76, height: 76, borderRadius: 38 },
  avatarRing: { padding: 4, borderRadius: 44, borderWidth: 2, borderColor: Colors.primary },
  avatarEmoji: { fontSize: 22 },
  avatarEmojiSmall: { fontSize: 17 },
  avatarEmojiLarge: { fontSize: 36 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailIcon: { fontSize: 14, width: 20, textAlign: 'center' },
  detailText: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMain },
  detailStrong: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },

  hero: { alignItems: 'center', gap: 6, paddingVertical: 10 },
  heroCircle: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  heroCircleSuccess: { backgroundColor: Colors.success, shadowColor: Colors.success, shadowOpacity: 0.6, shadowRadius: 24, elevation: 8 },
  heroCircleGlass: { backgroundColor: Colors.bgCard, ...SOFT_SHADOW },
  heroCircleIcon: { fontSize: 36, color: '#fff', fontWeight: '900' },
  heroTitle: { fontSize: 17, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
  heroText: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },

  etaRow: { flexDirection: 'row', alignItems: 'center' },
  etaItem: { flex: 1, alignItems: 'center' },
  etaValue: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMain },
  etaDivider: { width: 1, height: 34, backgroundColor: Colors.borderColor },
  callBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center' },
  callBtnText: { fontSize: 18 },


  starsRow: { flexDirection: 'row', gap: 8 },
  star: { fontSize: 40, color: Colors.subtleBorder },
  starOn: { color: Colors.warning },
  rewardCard: { borderRadius: 20, padding: 18, alignItems: 'center', gap: 6, overflow: 'hidden', backgroundColor: '#059669' },
  rewardIcon: { fontSize: 34 },
  rewardText: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: '#ecfdf5', textAlign: 'center' },
  pointsPill: { backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  pointsText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  confettiLayer: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', zIndex: 50 },

  bottomBar: { padding: 16, paddingTop: 10, gap: 8, backgroundColor: Colors.bgBody },
  dimStars: { flexDirection: 'row', gap: 3 },
  dimStar: { fontSize: 20, color: Colors.subtleBorder },
  dimStarOn: { color: Colors.warning },
}));
