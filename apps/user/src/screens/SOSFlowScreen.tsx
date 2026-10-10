import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';
import { CloseCode, Colors, distanceKm, LEVELS, makeCloseCode, martShop, partMarketPrice, themedStyles } from '@ongarage/shared';
import { MOCK_GARAGES } from '../constants/mockData';
import { FONTS } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { useNotice } from '../context/NoticeContext';
import { MartIcon } from '../components/MartBagIcon';
import { useSOSRecords } from '../context/SOSRecordsContext';
import { BREAKDOWN_TYPES, breakdownInfo, getThemeMode } from '@ongarage/shared';
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
  | 'nearby'
  | 'tracking'
  | 'arrived'
  | 'repairing'
  | 'repairCompleteNotice'
  | 'qrScan'
  | 'rating';

const STEPS: { key: Step; label: string }[] = [
  { key: 'confirm', label: 'විස්තර තහවුරු කිරීම' },
  { key: 'consent', label: 'අනුමැතිය' },
  { key: 'searching', label: 'ළඟම ගරාජය සම්බන්ධ කරගැනීම' },
  // Choosing from the nearby list (when nobody answered) and being connected are the same segment of the stepper.
  // Being connected (and picking from the nearby list) and watching them come are one window: the map, their profile and the ETA.
  { key: 'tracking', label: 'ගරාජය / යාන්ත්‍රිකයා සම්බන්ධ විය · පැමිණෙමින්' },
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
  // Profile details (shown when connected).
  reviews: number;
  jobs: number;
  years: number;
  skill: string;
};

type Workshop = WorkshopSeed & { coords: LatLng; eta: number };

/** A registered garage or technician shown with its profile when nobody answered inside the search radius. */
type Candidate = Omit<Workshop, 'jobs' | 'years' | 'skill'> & {
  kind: 'garage' | 'technician';
  reviews: number;
  /** Trust level of a garage (see LEVELS). */
  level?: string;
  verified: boolean;
  /** One line each: what they do, what they have done. */
  facts: string[];
};

type TechnicianSeed = {
  id: string;
  name: string;
  skill: string;
  van: string;
  phone: string;
  rating: number;
  reviews: number;
  jobs: number;
  years: number;
  languages: string;
  responseMin: number;
  distanceKm: number;
  bearing: number;
};

// Technicians registered in the OnGarage app (they take roadside jobs on their own).
const SOS_TECHNICIANS: TechnicianSeed[] = [
  { id: 't1', name: 'කසුන් ජයසිංහ', skill: 'ඉංජින් සහ විදුලි දෝෂ', van: 'සේවා යතුරුපැදිය', phone: '0712223344', rating: 4.8, reviews: 96, jobs: 412, years: 9, languages: 'සිංහල · English', responseMin: 6, distanceKm: 4.1, bearing: 70 },
  { id: 't2', name: 'චමින්ද සිල්වා', skill: 'ටයර්, බැටරි සහ ජම්ප් ස්ටාට්', van: 'Suzuki Every සේවා වෑන්', phone: '0773334455', rating: 4.7, reviews: 128, jobs: 530, years: 12, languages: 'සිංහල · தமிழ்', responseMin: 8, distanceKm: 5.2, bearing: 200 },
  { id: 't3', name: 'රුවන් පෙරේරා', skill: 'බ්‍රේක්, ක්ලච් සහ ටෝවිං', van: 'Toyota Dyna ටෝ ට්‍රක්', phone: '0764445566', rating: 4.9, reviews: 74, jobs: 301, years: 7, languages: 'සිංහල · English', responseMin: 10, distanceKm: 6.4, bearing: 330 },
];

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
    reviews: 142,
    jobs: 618,
    years: 11,
    skill: 'ඉංජින්, විදුලි සහ ඔයිල් සේවා',
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
    reviews: 96,
    jobs: 402,
    years: 8,
    skill: 'බැටරි, ටයර් සහ බ්‍රේක්',
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
    reviews: 181,
    jobs: 755,
    years: 14,
    skill: 'ටෝවිං, ක්ලච් සහ ගියර් දෝෂ',
  },
];

// The steps during which the connected garage / technician is shown at the top.
const CONNECTED_STEPS: Step[] = ['tracking', 'arrived', 'repairing', 'qrScan', 'rating'];

// Sri Lanka's emergency lines, shown while the repair is under way.
const EMERGENCY_NUMBERS = [
  { number: '119', label: 'පොලිස් හදිසි ඇමතුම', icon: '🚓' },
  { number: '1990', label: 'සුව සැරිය ගිලන් රථ සේවය', icon: '🚑' },
  { number: '110', label: 'ගිනි නිවීම් සහ ගලවා ගැනීම්', icon: '🚒' },
  { number: '1969', label: 'අධිවේගී මාර්ග හදිසි ඇමතුම', icon: '🛣️' },
];

// The SOS conditions the owner can read at any time.
const SOS_TERMS = [
  'ඔබගේ SOS ඉල්ලීම ඔබේ ස්ථානයේ සිට සෙවුම් කලාපය (කි.මී. 1 න් ආරම්භ වී, පුළුල් කරන සෑම වාරයකටම කි.මී. 1 බැගින් වැඩි වේ) ඇතුළත ලියාපදිංචි ගරාජ සහ යාන්ත්‍රිකයන් වෙත දැනුම් දෙයි.',
  'පැමිණීමේ ගාස්තුව: OnGarage අනුමත රු. 500 ක්. කලාපය පුළුල් වන සෑම කි.මී. 1 කටම රු. 250 ක් එකතු වේ. අලුත්වැඩියාවක් අවශ්‍ය නොවුණත් මෙය යාන්ත්‍රිකයාට ගෙවිය යුතුය.',
  'අලුත්වැඩියා ගාස්තුව: යාන්ත්‍රිකයා ඇස්තමේන්තුව ඉදිරිපත් කර ඔබ අනුමත කළ පසු පමණක් අලුත්වැඩියාව ආරම්භ වේ. අනුමැතියෙන් ඔබ්බට වැඩ හෝ ගාස්තු කෙරෙන්නේ නැත.',
  'යාන්ත්‍රිකයා පැමිණි බව ඔහුගේ app එකෙන් තහවුරු කරයි. එතැන් සිට මෙම SOS රැකියාව ඔහුට සම්බන්ධ වේ.',
  'රැකියාව අවසන් වන්නේ ඔබගේ ඉලක්කම් 6 ක කේතය (හෝ QR) යාන්ත්‍රිකයා ඇතුළත් කළ පසුවය. කේතය වෙනත් අයට නොදෙන්න.',
  'යාන්ත්‍රිකයා පිටත් වූ පසු ඉල්ලීම අවලංගු කළහොත් පැමිණීමේ ගාස්තුව අය කෙරේ.',
  'ඔබගේ දුරකථන අංකය මෙම රැකියාව සඳහා පමණක් යාන්ත්‍රිකයාට පෙන්වයි. ගෙවීම් සහ සන්නිවේදනය යෙදුම තුළම සිදු කිරීමෙන් OnGarage ආරක්ෂිත රැකියා වගකීම ඔබට හිමි වේ.',
];

// The spare part a technician typically needs for each kind of breakdown (simulated request mid-repair).
const PART_FOR_BREAKDOWN: Record<string, string> = {
  mechanical: 'Spark plug set',
  battery: 'Car battery',
  tire: 'Tyre (tubeless)',
  fuel: 'Fuel filter',
  overheating: 'Radiator hose',
  accident: 'Headlamp',
};
const DEFAULT_PART = 'Brake pad (front)';

type PartState = 'none' | 'requested' | 'ownerBuying' | 'techOrdering' | 'ordered' | 'got';

const INITIAL_RADIUS_KM = 1;
const RADIUS_STEP_KM = 1;
// Call-out fee paid to the technician for travelling to the breakdown (OnGarage
// approved); due even if no repair is needed. A wider search means farther travel.
const BASE_FEE = 500;
const SURCHARGE_STEP = 250;
const CYCLE_MS = 6000;
// How long the radar shows the nearest garage being reached before the owner is connected to it.
const MATCH_MS = 3200;
const MAX_CYCLES = 4;
const TRACKING_MS = 20000;
// The simulated repair takes one minute (the progress bar fills over this).
const REPAIR_MS = 60000;

const REWARDS = [
  { title: 'පක්ෂපාතී ත්‍යාගය', description: 'ඊළඟ අලුත්වැඩියාවට රු. 250 ක වට්ටමක්', points: 250 },
  { title: 'ඉක්මන් අලුත්වැඩියා ප්‍රසාද', description: 'නොමිලේ වාහන සෞඛ්‍ය පරීක්ෂාවක්', points: 100 },
  { title: 'මාර්ග වීරයා', description: 'OnGarage ලකුණු 500 ක් එකතු විය', points: 500 },
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

const GOOD_TAGS = ['වේලාවට පැමිණියා', 'දක්ෂ සේවාව', 'මිල සාධාරණයි', 'කාරුණික හැසිරීම'];
const BAD_TAGS = ['ප්‍රමාද විය', 'මිල වැඩියි', 'වැඩේ අසම්පූර්ණයි', 'නරක හැසිරීම'];

const ratingLabel = (r: number) =>
  r === 0 ? 'තරුවක් තට්ටු කරන්න' : r === 5 ? 'විශිෂ්ටයි!' : r === 4 ? 'ඉතා හොඳ සේවාවක්!' : r === 3 ? 'හොඳ සේවාවක්' : 'වැඩිදියුණු විය යුතුයි';

const money = (n: number) => `රු. ${n.toLocaleString()}`;

interface SOSFlowScreenProps {
  location: PickedLocation;
  vehicleId: string;
  onVehicleChange: (vehicleId: string) => void;
  onChangeLocation: () => void;
  onClose: () => void;
  /** Sends the owner to OnMart to buy a part the technician needs (the SOS job stays open behind it). */
  onOpenMart?: (part: string) => void;
  /** Opens one OnMart shop's page (the SOS job stays open behind it). */
  onOpenShop?: (shopId: string) => void;
}

export const SOSFlowScreen: React.FC<SOSFlowScreenProps> = ({
  location,
  vehicleId,
  onVehicleChange,
  onChangeLocation,
  onClose,
  onOpenMart,
  onOpenShop,
}) => {
  const [step, setStep] = useState<Step>('confirm');
  // The owner's closing code: the technician scans the QR or types these six digits.
  const [closeCode] = useState(makeCloseCode);
  const [breakdown, setBreakdown] = useState<string | null>(null);
  const [radius, setRadius] = useState(INITIAL_RADIUS_KM);
  const [surcharge, setSurcharge] = useState(BASE_FEE);
  const [cycle, setCycle] = useState(0);
  const [expansionPrompt, setExpansionPrompt] = useState(false);
  const [selected, setSelected] = useState<Workshop | Candidate | null>(null);
  const [trackP, setTrackP] = useState(0);
  const [repairP, setRepairP] = useState(0);
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  // Optional one-tap reasons shown after the stars (good ones for 4-5 stars, the problems for fewer).
  const [tags, setTags] = useState<string[]>([]);
  const [reward, setReward] = useState(REWARDS[0]);
  const [showCancel, setShowCancel] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  // The technician confirms arrival in their own app; the owner only sees that it happened (no button here).
  const [techConfirmed, setTechConfirmed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  // A part the technician needs mid-repair: the owner buys it in OnMart, or the technician orders it there (bill comes to the owner).
  const [partState, setPartState] = useState<PartState>('none');
  // The technician's "I need a part" notice from their app, shown to the owner as a pop-up message.
  const [partPopup, setPartPopup] = useState(false);
  // When the technician's OnMart order went through (for the order record).
  const [partOrderedAt, setPartOrderedAt] = useState(0);
  const partBlocked = useRef(false);
  partBlocked.current = partState === 'requested' || partState === 'ownerBuying' || partState === 'techOrdering';
  const { notify } = useNotice();
  const { addRecord } = useSOSRecords();
  const [showConfetti, setShowConfetti] = useState(false);
  const vehicleRef = useRef<View>(null);

  const cycleAnim = useRef(new Animated.Value(0)).current;
  const trackAnim = useRef(new Animated.Value(0)).current;
  const popAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  // Drives the waiting bar's moving highlight while the repair is under way.
  const waitAnim = useRef(new Animated.Value(0)).current;
  const [waitBarW, setWaitBarW] = useState(0);
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

  // The nearest registered garages and technicians, for when nobody inside the radius answered.
  const { nearbyGarages, nearbyTechnicians } = useMemo(() => {
    const garages: Candidate[] = MOCK_GARAGES.map((g) => {
      const km = Number(distanceKm(location.coords, g.coords).toFixed(1));
      return {
        id: `g-${g.id}`,
        name: g.name,
        mechanic: 'ගරාජයේ සේවා කණ්ඩායම',
        van: 'ගරාජයේ සේවා වාහනය',
        phone: g.phone,
        rating: g.rating,
        bid: BASE_FEE + Math.ceil(km) * SURCHARGE_STEP,
        distanceKm: km,
        bearing: 0,
        coords: g.coords,
        eta: etaMinutes(km),
        kind: 'garage' as const,
        reviews: g.reviews,
        level: g.level,
        verified: true,
        facts: [g.specialization, g.address, g.status === 'open' ? 'දැන් විවෘතයි' : 'දැන් වසා ඇත'],
      };
    })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3);
    const technicians: Candidate[] = SOS_TECHNICIANS.map((t) => ({
      id: t.id,
      name: t.name,
      mechanic: t.name,
      van: t.van,
      phone: t.phone,
      rating: t.rating,
      bid: BASE_FEE + Math.ceil(t.distanceKm) * SURCHARGE_STEP,
      distanceKm: t.distanceKm,
      bearing: t.bearing,
      coords: offsetCoordinate(location.coords, t.distanceKm, t.bearing),
      eta: etaMinutes(t.distanceKm),
      kind: 'technician' as const,
      reviews: t.reviews,
      verified: true,
      facts: [t.skill, `රැකියා ${t.jobs} ක් සම්පූර්ණ කර ඇත · අත්දැකීම් වසර ${t.years}`, `භාෂා: ${t.languages} · සාමාන්‍යයෙන් මිනි. ${t.responseMin} කින් පිළිතුරු දෙයි`],
    })).sort((a, b) => a.distanceKm - b.distanceKm);
    return { nearbyGarages: garages, nearbyTechnicians: technicians };
  }, [location.coords]);
  const candidates = [...nearbyGarages, ...nearbyTechnicians];

  const connectTo = (c: Candidate) => {
    setSelected(c);
    setStep('tracking');
  };

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

  // Step 3: search inside the radius and connect the owner to the nearest garage / technician found, straight away (no
  // bids to compare). Nobody inside the radius: ask to widen it (+1 km, +LKR 250) and search again; if nobody answers even
  // at the widest radius, show the nearest registered garages and technicians with their profiles to pick from.
  const connectNearest = (pool: Workshop[]) => {
    const nearest = [...pool].sort((a, b) => a.distanceKm - b.distanceKm)[0];
    if (!nearest) return;
    // The call-out fee follows how far the technician travels.
    setRadius(Math.max(radius, Math.ceil(nearest.distanceKm)));
    setSelected(nearest);
    setStep('tracking');
  };

  useEffect(() => {
    if (step !== 'searching' || expansionPrompt) return;
    const matchNow = responders.length > 0;
    const wait = matchNow ? MATCH_MS : CYCLE_MS;
    cycleAnim.setValue(0);
    const anim = Animated.timing(cycleAnim, { toValue: 1, duration: wait, easing: Easing.linear, useNativeDriver: false });
    anim.start();
    const timer = setTimeout(() => {
      if (matchNow) connectNearest(responders);
      else if (cycle + 1 >= MAX_CYCLES) setStep('nearby');
      else setExpansionPrompt(true);
    }, wait);
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
    if (step !== 'tracking' && step !== 'arrived') return;
    popAnim.setValue(0);
    Animated.spring(popAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start();
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
    if (step !== 'arrived') return;
    setTechConfirmed(false);
    // Simulated: the technician taps "arrived" in their app, the job is attached to them, the owner is told.
    const confirm = setTimeout(() => {
      setTechConfirmed(true);
      notify({ icon: '✅', title: 'යාන්ත්‍රිකයා පැමිණීම තහවුරු කළා', body: `${job.mechanic} ඔහුගේ app එකෙන් පැමිණීම තහවුරු කර ඇත. රැකියාව ඔහුට සම්බන්ධ විය.`, tone: 'success' });
    }, 3500);
    const next = setTimeout(() => setStep('repairing'), 8000);
    return () => {
      clearTimeout(confirm);
      clearTimeout(next);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step !== 'repairing') return;
    waitAnim.setValue(0);
    setPartState('none');
    const partTimer = setTimeout(() => {
      setPartState('requested');
      setPartPopup(true);
    }, 9000);
    const loop = Animated.loop(Animated.timing(waitAnim, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true }), { iterations: -1 });
    loop.start();
    return () => {
      loop.stop();
      clearTimeout(partTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, waitAnim]);

  // The technician orders in OnMart: the bill is sent to the owner's app.
  useEffect(() => {
    if (partState !== 'techOrdering') return;
    const t = setTimeout(() => {
      setPartState('ordered');
      setPartOrderedAt(Date.now());
      notify({ icon: '🧾', title: 'OnMart බිල්පත ලැබුණා', body: 'යාන්ත්‍රිකයා ඇණවුම් කළ කොටසේ බිල්පත ඔබගේ යෙදුමට එක් විය.', tone: 'success' });
    }, 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partState]);

  useEffect(() => {
    if (step !== 'repairing') return;
    setRepairP(0);
    const timer = setInterval(() => {
      if (partBlocked.current) return;
      setRepairP((p) => Math.min(100, p + 1));
    }, REPAIR_MS / 100);
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
    if (star >= 4 !== rating >= 4) setTags([]);
    setRating(star);
    starScale.setValue(0.6);
    Animated.spring(starScale, { toValue: 1, friction: 3, tension: 180, useNativeDriver: true }).start();
    if (star === 5) burstConfetti();
  };

  const submitRating = () => {
    // The finished SOS becomes its own record in Activity.
    const who = profileOf(job);
    const kind = breakdownInfo(breakdown ?? '');
    addRecord({
      id: `sos-${closeCode}`,
      completedAt: Date.now(),
      breakdown: { icon: kind.icon, label: kind.label },
      vehicleName: vehicle.name,
      vehiclePlate: vehicle.plate,
      address: location.address,
      responder: { name: job.name, mechanic: job.mechanic, kind: who.kind, phone: job.phone, rating: job.rating },
      fees: {
        repair: job.bid,
        callout: surcharge,
        part: partCharge > 0 ? { name: partName, shop: partBill.shop, amount: partCharge } : undefined,
      },
      total: job.bid + surcharge + partCharge,
      rating,
      tags,
    });
    setSubmitted(true);
    burstConfetti();
    rewardScale.setValue(0);
    Animated.spring(rewardScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
  };

  const requestClose = () => {
    if (step === 'confirm' || submitted) onClose();
    else setShowCancel(true);
  };

  const partName = (breakdown && PART_FOR_BREAKDOWN[breakdown]) || DEFAULT_PART;
  const partPrice = partMarketPrice(partName, 'OEM');
  const orderShop = martShop('ps1');
  const partBill = { invoice: `INV-${closeCode.slice(0, 4)}`, shop: orderShop?.name ?? 'Galle Auto Parts', qty: 1, unit: partPrice, total: partPrice };
  const partCharge = partState === 'ordered' ? partBill.total : 0;

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const job = selected ?? workshops[0];
  const mechanicCoords: LatLng = {
    latitude: job.coords.latitude + (location.coords.latitude - job.coords.latitude) * trackP,
    longitude: job.coords.longitude + (location.coords.longitude - job.coords.longitude) * trackP,
  };
  const remainingKm = job.distanceKm * (1 - trackP);
  const baseStep: Step = step === 'consent' ? 'confirm' : step === 'repairCompleteNotice' ? 'repairing' : step;
  const stepIndex = STEPS.findIndex((x) => x.key === (step === 'nearby' ? 'tracking' : step));
  const stepLabel = step === 'nearby' ? 'ළඟම ගරාජ සහ යාන්ත්‍රිකයන් අතරින් තෝරන්න' : STEPS[stepIndex].label;

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

  const workshopPins = (project: Project, list: (Workshop | Candidate)[], dimmed?: (w: Workshop | Candidate) => boolean) =>
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

  const renderMap = (height: number, kind: 'confirm' | 'searching' | 'nearby' | 'tracking') => {
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
    if (kind === 'nearby') {
      const far = Math.max(...candidates.map((c) => c.distanceKm), 1);
      return (
        <GoogleMap
          style={styles.mapFull}
          center={location.coords}
          zoom={zoomToFit(far * 2, lat, height)}
          renderOverlay={(project) => (
            <>
              {workshopPins(project, candidates)}
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
          <Text style={styles.cardTitle}>ළඟම ගරාජය / යාන්ත්‍රිකයා සොයමින්...</Text>
          <Text style={styles.cardSub}>කි.මී. {radius} ක් ඇතුළත සොයා ඔබව සම්බන්ධ කරගනිමින් පවතී</Text>
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
          <Text style={styles.statLabel}>ළඟ ඇති</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[styles.progressFill, { width: cycleAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
        />
      </View>

      <Text style={styles.sectionLabel}>ළඟ ඇති ගරාජ</Text>
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
                {responded ? '✓ ළඟයි' : 'කලාපයෙන් පිටත'}
              </Text>
            </View>
          </View>
        );
      })}
    </>
  );

  /** Whoever is connected, as a full profile (a responding workshop and a picked garage / technician look the same). */
  const profileOf = (w: Workshop | Candidate): Candidate =>
    'kind' in w
      ? w
      : {
          ...w,
          kind: 'technician',
          verified: true,
          facts: [w.skill, `රැකියා ${w.jobs} ක් සම්පූර්ණ කර ඇත · අත්දැකීම් වසර ${w.years}`, w.van],
        };

  const profileBody = (c: Candidate) => {
    const levelIcon = c.level ? LEVELS.find((l) => l.id === c.level)?.icon : undefined;
    return (
      <>
        <View style={styles.rowCenter}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>{c.kind === 'garage' ? '🛠️' : '👨‍🔧'}</Text>
          </View>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {levelIcon ? `${levelIcon} ` : ''}
              {c.name}
            </Text>
            <Text style={styles.cardSub}>
              {c.kind === 'garage' ? 'ගරාජය' : 'යාන්ත්‍රිකයා'} · 📍 කි.මී. {c.distanceKm} · ⏱️ මිනි. ~{c.eta}
            </Text>
          </View>
          <View style={styles.ratingPill}>
            <Text style={styles.ratingPillText}>
              ★ {c.rating.toFixed(1)} ({c.reviews})
            </Text>
          </View>
        </View>
        <View style={styles.profileChips}>
          {c.verified && (
            <View style={[styles.statusPill, styles.statusPillOn]}>
              <Text style={[styles.statusPillText, { color: Colors.success }]}>✓ OnGarage ලියාපදිංචි</Text>
            </View>
          )}
          <View style={[styles.statusPill, styles.statusPillOff]}>
            <Text style={[styles.statusPillText, { color: Colors.textMuted }]}>පැමිණීමේ ගාස්තුව ~{money(c.bid)}</Text>
          </View>
        </View>
        {c.facts.map((f) => (
          <Text key={f} style={styles.cardSub}>
            • {f}
          </Text>
        ))}
      </>
    );
  };

  const profileCard = (c: Candidate) => {
    return (
      <View key={c.id} style={styles.card}>
        {profileBody(c)}
        <View style={styles.rowCenter}>
          <View style={styles.flex1}>
            <ActionButton label="සම්බන්ධ වන්න" icon="🤝" variant="primary" onPress={() => connectTo(c)} />
          </View>
          <Pressable style={[styles.callBtn, { marginLeft: 8 }]} onPress={() => Linking.openURL(`tel:${c.phone.replace(/\s/g, '')}`)} accessibilityLabel={`Call ${c.name}`}>
            <Text style={styles.callBtnText}>📞</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderNearby = () => (
    <>
      <View style={[styles.card, styles.centerCard]}>
        <GlassIcon emoji="📍" />
        <Text style={styles.heroTitle}>කි.මී. {radius} ක් ඇතුළත පිළිතුරක් නැත</Text>
        <Text style={styles.heroText}>
          මෙම කලාපය තුළ කිසිදු ගරාජයක් හෝ යාන්ත්‍රිකයෙක් ප්‍රතිචාර දැක්වූයේ නැත. ඔබට ළඟම ඇති OnGarage හි ලියාපදිංචි ගරාජ සහ යාන්ත්‍රිකයන් පහත ඇත — ඔවුන්ගේ ප්‍රොෆයිල් බලා කැමති කෙනෙකු සම්බන්ධ කරගන්න.
        </Text>
      </View>
      <Text style={styles.sectionLabel}>ළඟම ගරාජ</Text>
      {nearbyGarages.map(profileCard)}
      <Text style={styles.sectionLabel}>ළඟම යාන්ත්‍රිකයන්</Text>
      {nearbyTechnicians.map(profileCard)}
    </>
  );

  const renderTracking = () => (
    <>
      <View style={[styles.card, styles.rowCenter]}>
        <Animated.View style={[styles.heroCircle, styles.heroCircleSuccess, styles.heroCircleSmall, { opacity: popAnim, transform: [{ scale: popAnim }] }]}>
          <Text style={styles.heroCircleIconSmall}>✓</Text>
        </Animated.View>
        <View style={styles.flex1}>
          <Text style={styles.cardTitle}>ඉල්ලීම පිළිගත්තා!</Text>
          <Text style={styles.cardSub}>{job.name} ඔබගේ SOS ඉල්ලීම පිළිගෙන ඔබ වෙත පැමිණෙමින් සිටී.</Text>
        </View>
      </View>
      <View style={styles.card}>
        {profileBody(profileOf(job))}
        <View style={styles.divider} />
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📞</Text>
          <Text style={[styles.detailText, styles.flex1]}>{job.phone}</Text>
          <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${job.phone.replace(/\s/g, '')}`)} accessibilityLabel="Call connected">
            <Text style={styles.callBtnText}>📞</Text>
          </Pressable>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>💰</Text>
          <Text style={styles.detailText}>ඇස්තමේන්තුගත ගාස්තුව: {money(job.bid)}</Text>
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
          <Text style={styles.heroCircleIcon}>{techConfirmed ? '✓' : '🚐'}</Text>
        </Animated.View>
        <Text style={styles.heroTitle}>{techConfirmed ? 'පැමිණීම තහවුරු විය!' : 'යාන්ත්‍රිකයා ළඟා වෙමින්...'}</Text>
        <Text style={styles.heroText}>
          {techConfirmed
            ? `${job.mechanic} ඔහුගේ app එකෙන් පැමිණීම තහවුරු කළා. මෙම SOS රැකියාව දැන් ඔහුට සම්බන්ධ කර ඇත.`
            : `${job.name} හි ${job.mechanic} ඔබගේ ස්ථානයට ළඟා විය. ඔහු තමන්ගේ app එකෙන් පැමිණීම තහවුරු කරන තුරු රැඳී සිටින්න — ඔබට කිසිවක් කිරීමට අවශ්‍ය නැත.`}
        </Text>
      </View>
      <View style={styles.card}>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>{techConfirmed ? '✅' : '⏳'}</Text>
          <Text style={styles.detailText}>{techConfirmed ? 'යාන්ත්‍රිකයාගේ app එකෙන් පැමිණීම තහවුරු විය' : 'යාන්ත්‍රිකයාගේ app එකෙන් තහවුරු කරන තෙක් රැඳී සිටී…'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>{techConfirmed ? '🔗' : '⏳'}</Text>
          <Text style={styles.detailText}>{techConfirmed ? 'රැකියාව ඔහුට සම්බන්ධ කර ඇත' : 'රැකියාව ඔහුට සම්බන්ධ කිරීමට සූදානම්'}</Text>
        </View>
      </View>
      {mechanicCard([
        { icon: '📞', text: job.phone },
        { icon: '💰', text: `එකඟ වූ ගාස්තුව: ${money(job.bid)}` },
      ])}
    </>
  );

  const chooseOwnerBuys = () => {
    setPartPopup(false);
    setPartState('ownerBuying');
    onOpenMart?.(partName);
  };
  const chooseTechnicianOrders = () => {
    setPartPopup(false);
    setPartState('techOrdering');
  };

  /** The spare-part function of the repair: what the technician needs, and the two ways to get it through OnMart. */
  const renderPartCard = () => {
    if (partState === 'none')
      return (
        <View style={[styles.card, styles.rowCenter]}>
          <View style={styles.martIconWrap}>
            <MartIcon active size={38} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>කොටසක් අවශ්‍යද?</Text>
          </View>
          <Pressable style={styles.martGo} onPress={() => onOpenMart?.('')} accessibilityLabel="Open OnMart">
            <Text style={styles.martGoText}>OnMart ›</Text>
          </Pressable>
        </View>
      );
    if (partState === 'requested')
      return (
        <View style={[styles.card, styles.partCard]}>
          <View style={styles.rowCenter}>
            <GlassIcon emoji="🔩" />
            <View style={styles.flex1}>
              <Text style={styles.cardTitle}>යාන්ත්‍රිකයාට කොටසක් අවශ්‍යයි</Text>
              <Text style={styles.cardSub}>
                {partName} × 1 · ~{money(partPrice)}
              </Text>
            </View>
          </View>
          <Text style={styles.cardSub}>කොටස ලැබෙන තුරු අලුත්වැඩියාව රැඳී සිටී. කොටස OnMart හරහා ලබාගන්න — ක්‍රමයක් තෝරන්න:</Text>
          <ActionButton
            label="OnMart වෙත ගොස් මමම ගන්නම්"
            icon="🛍️"
            variant="primary"
            onPress={chooseOwnerBuys}
          />
          <ActionButton label="යාන්ත්‍රිකයාට OnMart හරහා ඇණවුම් කිරීමට අවසර දෙන්න (බිල ඔබට)" icon="📦" variant="ghost" onPress={chooseTechnicianOrders} />
        </View>
      );
    if (partState === 'ownerBuying')
      return (
        <View style={[styles.card, styles.partCard]}>
          <View style={styles.rowCenter}>
            <GlassIcon emoji="🛍️" />
            <View style={styles.flex1}>
              <Text style={styles.cardTitle}>OnMart හි කොටස ගනිමින්…</Text>
              <Text style={styles.cardSub}>{partName} · කොටස ලැබුණු විට පහත බොත්තම ඔබන්න.</Text>
            </View>
          </View>
          <ActionButton label="OnMart වෙත යන්න" icon="🛍️" variant="ghost" onPress={() => onOpenMart?.(partName)} />
          <ActionButton label="කොටස ලැබුණා, යාන්ත්‍රිකයාට දුන්නා" icon="✓" variant="success" onPress={() => setPartState('got')} />
        </View>
      );
    if (partState === 'techOrdering')
      return (
        <View style={[styles.card, styles.partCard]}>
          <View style={styles.rowCenter}>
            <GlassIcon emoji="📦" />
            <View style={styles.flex1}>
              <Text style={styles.cardTitle}>යාන්ත්‍රිකයා OnMart හි ඇණවුම් කරමින්…</Text>
              <Text style={styles.cardSub}>{partName} · බිල්පත ඔබගේ යෙදුමට එවයි.</Text>
            </View>
          </View>
        </View>
      );
    return (
      <View style={[styles.card, styles.partCard]}>
        <View style={styles.rowCenter}>
          <GlassIcon emoji="✅" />
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>{partState === 'ordered' ? 'කොටස OnMart හරහා ඇණවුම් කළා' : 'කොටස ලැබුණා'}</Text>
            <Text style={styles.cardSub}>අලුත්වැඩියාව නැවත ආරම්භ විය.</Text>
          </View>
          <Pressable style={styles.martGo} onPress={() => onOpenMart?.('')} accessibilityLabel="Open OnMart">
            <Text style={styles.martGoText}>OnMart ›</Text>
          </Pressable>
        </View>
        {partState === 'ordered' && (
          <>
            <View style={styles.divider} />
            <Text style={styles.label}>🧾 OnMart බිල්පත · {partBill.invoice}</Text>
            <View style={styles.rowBetween}>
              <Text style={styles.detailText}>
                {partName} × {partBill.qty}
              </Text>
              <Text style={styles.detailText}>{money(partBill.total)}</Text>
            </View>
            <Text style={styles.cardSub}>මෙම මුදල ඔබගේ අවසාන බිල්පතට එකතු වේ.</Text>

            {/* The record of where it was ordered, and the way into that shop through the app */}
            <View style={styles.divider} />
            <Text style={styles.label}>🏪 ඇණවුම් කළ වෙළඳසැල</Text>
            <View style={styles.rowCenter}>
              <View style={styles.flex1}>
                <Text style={styles.cardTitle}>{partBill.shop}</Text>
                {!!orderShop && (
                  <Text style={styles.cardSub}>
                    ★ {orderShop.rating.toFixed(1)} ({orderShop.ratingCount}) · {orderShop.address}
                  </Text>
                )}
              </View>
              {!!orderShop && (
                <Pressable style={[styles.callBtn, { marginLeft: 8 }]} onPress={() => Linking.openURL(`tel:${orderShop.phone.replace(/\s/g, '')}`)} accessibilityLabel="Call shop">
                  <Text style={styles.callBtnText}>📞</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🕒</Text>
              <Text style={styles.detailText}>
                ඇණවුම් කළේ {new Date(partOrderedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · යාන්ත්‍රිකයා විසින් · OnMart හරහා
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📦</Text>
              <Text style={styles.detailText}>තත්වය: වෙළඳසැලෙන් කොටස සූදානම් වෙමින්</Text>
            </View>
            <ActionButton label="වෙළඳසැලට ඇතුළු වන්න" icon="🏪" variant="ghost" onPress={() => onOpenShop?.('ps1')} />
          </>
        )}
      </View>
    );
  };

  const renderRepairing = () => {
    // Soft rings pulse out of a glowing core, two dots orbit it and the wrench rocks: the "work is happening" scene.
    const rock = spinAnim.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['-18deg', '18deg', '-18deg', '18deg', '-18deg'] });
    const breathe = spinAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] });
    // Two highlights half a pass apart, so the bar is always moving and never empties between passes.
    const from = -waitBarW * 0.4;
    const to = waitBarW;
    const mid = (from + to) / 2;
    const slide = waitAnim.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
    const slideB = waitAnim.interpolate({ inputRange: [0, 0.5, 0.5, 1], outputRange: [mid, to, from, mid] });
    return (
      <>
        <View style={styles.hero}>
          <View style={styles.repairScene}>
            <Pulse style={styles.repairRing} maxScale={1.9} />
            <Pulse style={styles.repairRing2} maxScale={1.5} />
            <Animated.View style={[styles.orbit, { transform: [{ rotate: spin }] }]}>
              <View style={styles.orbitDot} />
              <View style={[styles.orbitDot, styles.orbitDotAlt]} />
            </Animated.View>
            <Animated.View style={[styles.repairCore, { transform: [{ scale: breathe }] }]}>
              <Animated.Text style={[styles.repairCoreIcon, { transform: [{ rotate: rock }] }]}>🔧</Animated.Text>
            </Animated.View>
          </View>
          <Text style={styles.heroTitle}>අලුත්වැඩියාව සිදුවෙමින්</Text>
          <Text style={styles.heroText}>
            {job.mechanic} ඔබගේ {vehicle.name} අලුත්වැඩියා කරමින් සිටී.
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.waitText}>රැඳී සිටින්න… වැඩේ අවසන් වූ විට අපි ඔබට දැනුම් දෙන්නෙමු</Text>
          <View style={styles.waitTrack} onLayout={(e) => setWaitBarW(e.nativeEvent.layout.width)}>
            <Animated.View style={[styles.waitFill, { width: waitBarW * 0.4, transform: [{ translateX: slide }] }]} />
            <Animated.View style={[styles.waitFill, styles.waitFillB, { width: waitBarW * 0.4, transform: [{ translateX: slideB }] }]} />
          </View>
        </View>

        {renderPartCard()}

        <Text style={styles.sectionLabel}>ඔබේ {profileOf(job).kind === 'garage' ? 'ගරාජය' : 'යාන්ත්‍රිකයා'}</Text>
        <View style={styles.card}>
          {profileBody(profileOf(job))}
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📞</Text>
            <Text style={[styles.detailText, styles.flex1]}>{job.phone}</Text>
            <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${job.phone.replace(/\s/g, '')}`)} accessibilityLabel="Call connected">
              <Text style={styles.callBtnText}>📞</Text>
            </Pressable>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>💰</Text>
            <Text style={styles.detailText}>එකඟ වූ ගාස්තුව: {money(job.bid)}</Text>
          </View>
        </View>

        <Pressable style={[styles.card, styles.rowCenter]} onPress={() => setShowTerms(true)} accessibilityLabel="SOS conditions">
          <GlassIcon emoji="📄" small />
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>SOS කොන්දේසි</Text>
            <Text style={styles.cardSub}>ගාස්තු, අනුමැතිය, අවසන් කිරීම සහ අවලංගු කිරීම ගැන කියවන්න</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>🚨 හදිසි ඇමතුම් අංක</Text>
        <View style={styles.card}>
          {EMERGENCY_NUMBERS.map((e, i) => (
            <React.Fragment key={e.number}>
              {i > 0 && <View style={styles.divider} />}
              <Pressable style={styles.rowCenter} onPress={() => Linking.openURL(`tel:${e.number}`)} accessibilityLabel={`Call ${e.number}`}>
                <Text style={styles.emergencyIcon}>{e.icon}</Text>
                <Text style={[styles.detailText, styles.flex1]}>{e.label}</Text>
                <View style={styles.emergencyNumber}>
                  <Text style={styles.emergencyNumberText}>{e.number}</Text>
                </View>
              </Pressable>
            </React.Fragment>
          ))}
        </View>
      </>
    );
  };

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
          <Text style={styles.detailText}>අලුත්වැඩියා ගාස්තුව</Text>
          <Text style={styles.detailText}>{money(job.bid)}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.detailText}>යාන්ත්‍රිකයාගේ පැමිණීමේ ගාස්තුව</Text>
          <Text style={styles.detailText}>{money(surcharge)}</Text>
        </View>
        {partCharge > 0 && (
          <View style={styles.rowBetween}>
            <Text style={styles.detailText}>OnMart කොටස ({partName}) · {partBill.shop}</Text>
            <Text style={styles.detailText}>{money(partCharge)}</Text>
          </View>
        )}
        <View style={styles.divider} />
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>මුළු එකතුව</Text>
          <Text style={[styles.cardTitle, { color: Colors.success }]}>{money(job.bid + surcharge + partCharge)}</Text>
        </View>
      </View>
    </>
  );

  const renderRating = () => (
    <>
      <View style={[styles.card, styles.centerCard, styles.rateCard]}>
        <View style={styles.avatarRing}>
          <View style={[styles.avatar, styles.avatarLarge]}>
            <Text style={styles.avatarEmojiLarge}>👨‍🔧</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>{job.mechanic}</Text>
        <Text style={styles.cardSub}>{job.name}</Text>
        <Text style={styles.rateQuestion}>සේවාව කෙසේද?</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => pressStar(n)} hitSlop={6} accessibilityLabel={`Rate ${n} stars`}>
              <Animated.Text style={[styles.starBig, rating >= n && styles.starOn, { transform: [{ scale: rating === n ? starScale : 1 }] }]}>
                {rating >= n ? '★' : '☆'}
              </Animated.Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.detailStrong, { color: rating >= 4 ? Colors.success : Colors.textMuted }]}>{ratingLabel(rating)}</Text>

        {rating > 0 && !submitted && (
          <View style={styles.tagWrap}>
            {(rating >= 4 ? GOOD_TAGS : BAD_TAGS).map((t) => {
              const on = tags.includes(t);
              return (
                <Pressable key={t} style={[styles.tag, on && styles.tagOn]} onPress={() => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))} accessibilityLabel={`Tag ${t}`}>
                  <Text style={[styles.tagText, on && styles.tagTextOn]}>{t}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
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
      case 'nearby':
        return <ActionButton label="ඉල්ලීම අවලංගු කරන්න" variant="ghost" onPress={() => setShowCancel(true)} />;
      case 'qrScan':
        return (
          <ActionButton
            label="ස්කෑන් කිරීම අනුකරණය කරන්න"
            icon="📷"
            variant="success"
            onPress={() => {
              setReward(REWARDS[Math.floor(Math.random() * REWARDS.length)]);
              setRating(0);
              setTags([]);
              setSubmitted(false);
              setStep('rating');
            }}
          />
        );
      case 'rating':
        return submitted ? null : (
          <ActionButton label="ශ්‍රේණිගත කිරීම යවන්න" icon="✓" variant="primary" disabled={rating === 0} onPress={submitRating} />
        );
      default:
        return null;
    }
  };

  const bottomBar = renderBottomBar();
  const mapKind: 'confirm' | 'searching' | 'nearby' | 'tracking' | null =
    baseStep === 'confirm' || baseStep === 'searching' || baseStep === 'nearby' || baseStep === 'tracking' ? baseStep : null;

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
                පියවර {stepIndex + 1}/{STEPS.length} · {stepLabel}
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

        {/* While the technician is on the way: the distance left and the time to arrive, right under the map. */}
        {baseStep === 'tracking' && (
          <View style={styles.etaBar} accessibilityLabel="Distance and time to arrive">
            <View style={styles.etaItem}>
              <Text style={styles.etaValue}>{remainingKm.toFixed(2)} km</Text>
              <Text style={styles.statLabel}>ඉතිරි දුර</Text>
            </View>
            <View style={styles.etaDivider} />
            <View style={styles.etaItem}>
              <Text style={styles.etaValue}>මිනි. {Math.max(1, etaMinutes(remainingKm) - 2)}</Text>
              <Text style={styles.statLabel}>බ්‍රේක්ඩවුන් ස්ථානයට පැමිණීමට</Text>
            </View>
          </View>
        )}

        <ScrollView ref={sheetScroll} style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Once connected, whoever took the SOS stays at the top, one tap from their full profile. */}
          {selected && CONNECTED_STEPS.includes(baseStep) && baseStep !== 'tracking' && (
            <Pressable style={styles.connectedBar} onPress={() => setShowProfile(true)} accessibilityLabel="Open connected profile">
              <View style={[styles.avatar, styles.avatarSmall]}>
                <Text style={styles.avatarEmojiSmall}>{profileOf(selected).kind === 'garage' ? '🛠️' : '👨‍🔧'}</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {selected.name}
                </Text>
                <Text style={styles.cardSub} numberOfLines={1}>
                  {profileOf(selected).kind === 'garage' ? 'ගරාජය' : 'යාන්ත්‍රිකයා'} · {selected.mechanic} · ප්‍රොෆයිලය බලන්න ›
                </Text>
              </View>
              <View style={styles.ratingPill}>
                <Text style={styles.ratingPillText}>★ {selected.rating.toFixed(1)}</Text>
              </View>
            </Pressable>
          )}
          {baseStep === 'confirm' && renderConfirm()}
          {baseStep === 'searching' && renderSearching()}
          {baseStep === 'nearby' && renderNearby()}
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

      <Modal visible={showTerms} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowTerms(false)}>
        <Pressable style={styles.profileBackdrop} onPress={() => setShowTerms(false)} accessibilityLabel="Close conditions">
          <Pressable style={[styles.profileSheet, styles.termsSheet]} onPress={() => {}}>
            <Text style={styles.cardTitle}>📄 SOS කොන්දේසි</Text>
            <ScrollView style={styles.termsScroll} showsVerticalScrollIndicator={false}>
              {SOS_TERMS.map((t, i) => (
                <View key={i} style={styles.termRow}>
                  <Text style={styles.termNo}>{i + 1}</Text>
                  <Text style={[styles.detailText, styles.flex1]}>{t}</Text>
                </View>
              ))}
            </ScrollView>
            <ActionButton label="වසන්න" variant="ghost" onPress={() => setShowTerms(false)} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showProfile && !!selected} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowProfile(false)}>
        <Pressable style={styles.profileBackdrop} onPress={() => setShowProfile(false)} accessibilityLabel="Close profile">
          <Pressable style={styles.profileSheet} onPress={() => {}}>
            {selected && (
              <>
                {profileBody(profileOf(selected))}
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>📞</Text>
                  <Text style={styles.detailText}>{selected.phone}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>💰</Text>
                  <Text style={styles.detailText}>ඇස්තමේන්තුගත ගාස්තුව: {money(selected.bid)}</Text>
                </View>
                <View style={styles.rowCenter}>
                  <View style={styles.flex1}>
                    <ActionButton label="වසන්න" variant="ghost" onPress={() => setShowProfile(false)} />
                  </View>
                  <Pressable style={[styles.callBtn, { marginLeft: 8 }]} onPress={() => Linking.openURL(`tel:${selected.phone.replace(/\s/g, '')}`)} accessibilityLabel="Call connected">
                    <Text style={styles.callBtnText}>📞</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {step === 'repairing' && partState === 'requested' && partPopup && (
        <ModalCard
          icon="🔩"
          tone="primary"
          title="යාන්ත්‍රිකයාට කොටසක් අවශ්‍යයි"
          body={`${job.mechanic} ඔහුගේ app එකෙන් දැනුම් දුන්නා: ${partName} × 1 (~${money(partPrice)}) අවශ්‍යයි. ඔහු සමඟ කතා කළ නොහැකි නම් කොටස ඔබම OnMart හි ඇණවුම් කරන්න, නැතහොත් ඔහුට OnMart හරහා ඇණවුම් කිරීමට අවසර දෙන්න (බිල ඔබට එයි).`}
        >
          <ActionButton label="පසුව" variant="ghost" compact onPress={() => setPartPopup(false)} />
          <ActionButton label="යාන්ත්‍රිකයාට අවසර" variant="ghost" compact onPress={chooseTechnicianOrders} />
          <ActionButton label="මමම ගන්නම්" variant="primary" compact onPress={chooseOwnerBuys} />
        </ModalCard>
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
          body={`මෙම කලාපය තුළ තවම ගරාජයක් හෝ යාන්ත්‍රිකයෙක් හමු වී නැත. සෙවුම් කලාපය කි.මී. ${radius + RADIUS_STEP_KM} දක්වා වැඩි කෙරේ. වැඩි දුරක් ගමන් කරන යාන්ත්‍රිකයාට පැමිණීමේ ගාස්තුවට ${money(SURCHARGE_STEP)} ක් එකතු වේ.`}
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
        <ModalCard icon="🛑" tone="danger" title="SOS ඉල්ලීම අවලංගු කරන්නද?" body="ඔබගේ ඉල්ලීම ඉවත් කෙරේ සහ සම්බන්ධ කරගත් ගරාජයට දැනුම් දෙනු ලැබේ.">
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
  body: { paddingHorizontal: 6, paddingTop: 6, gap: 12, paddingBottom: 24 },
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

  ratingPill: { backgroundColor: 'rgba(245, 158, 11, 0.14)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  connectedBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
  profileBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.overlay },
  profileSheet: { gap: 10, padding: 16, paddingBottom: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: Colors.bgCard },
  heroCircleSmall: { width: 44, height: 44, borderRadius: 22, marginBottom: 0 },
  heroCircleIconSmall: { fontSize: 22, color: '#fff', fontWeight: '800' },
  chevron: { fontSize: 24, color: Colors.textMuted },
  repairScene: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center' },
  repairRing: { position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(16, 185, 129, 0.22)' },
  repairRing2: { position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(56, 189, 248, 0.2)' },
  orbit: { position: 'absolute', width: 150, height: 150, alignItems: 'center' },
  orbitDot: { position: 'absolute', top: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#38bdf8' },
  orbitDotAlt: { top: undefined, bottom: 0, backgroundColor: '#10b981' },
  repairCore: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b981', shadowColor: '#10b981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 18, elevation: 8 },
  repairCoreIcon: { fontSize: 42 },
  martIconWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  martGo: { paddingHorizontal: 14, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  martGoText: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  partCard: { gap: 10, borderColor: Colors.primary, borderWidth: 1 },
  waitText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center', marginBottom: 10 },
  waitTrack: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: Colors.subtleBorder },
  waitFill: { position: 'absolute', left: 0, top: 0, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  waitFillB: { backgroundColor: '#38bdf8' },
  emergencyIcon: { fontSize: 22, marginRight: 10 },
  emergencyNumber: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, backgroundColor: '#dc2626' },
  emergencyNumberText: { fontSize: 14, fontFamily: FONTS.titleBold, color: '#ffffff', letterSpacing: 0.5 },
  termsSheet: { maxHeight: '80%' },
  termsScroll: { flexGrow: 0 },
  termRow: { flexDirection: 'row', gap: 10, paddingVertical: 6 },
  termNo: { width: 22, height: 22, borderRadius: 11, textAlign: 'center', lineHeight: 22, fontSize: 11.5, fontFamily: FONTS.bodyBold, color: '#ffffff', backgroundColor: Colors.primary, overflow: 'hidden' },
  profileChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
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

  etaBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 6, marginBottom: 4, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
  etaRow: { flexDirection: 'row', alignItems: 'center' },
  etaItem: { flex: 1, alignItems: 'center' },
  etaValue: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMain },
  etaDivider: { width: 1, height: 34, backgroundColor: Colors.borderColor },
  callBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center' },
  callBtnText: { fontSize: 18 },


  starsRow: { flexDirection: 'row', gap: 8 },
  star: { fontSize: 40, color: Colors.subtleBorder },
  rateCard: { gap: 6, paddingVertical: 20 },
  rateQuestion: { marginTop: 10, fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
  starBig: { fontSize: 46, color: Colors.subtleBorder },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 },
  tag: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
  tagOn: { borderColor: Colors.primary, backgroundColor: 'rgba(56, 189, 248, 0.14)' },
  tagText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
  tagTextOn: { color: Colors.primary },
  starOn: { color: Colors.warning },
  rewardCard: { borderRadius: 20, padding: 18, alignItems: 'center', gap: 6, overflow: 'hidden', backgroundColor: '#059669' },
  rewardIcon: { fontSize: 34 },
  rewardText: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: '#ecfdf5', textAlign: 'center' },
  pointsPill: { backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  pointsText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  confettiLayer: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', zIndex: 50 },

  bottomBar: { padding: 16, paddingTop: 10, gap: 8, backgroundColor: Colors.bgBody },
}));
