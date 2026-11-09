import { VehicleLine } from '@ongarage/shared';
import { elevation1, outline, pageBg } from '../utils/material';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BREAKDOWN_IMAGES } from '../constants/home';

/** The pastel colour of each breakdown type's tile. */
const BREAKDOWN_TINT: Record<string, string> = {
  accident: '#e5675f',
  battery: '#e0a243',
  overheating: '#f0a45a',
  fuel: '#9aa7b8',
  lockout: '#e5b04b',
  mechanical: '#6fb0ea',
  tire: '#8c95a6',
  towing: '#6a7fe0',
  winching: '#75c5d6',
};
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';
import { canCancelSos, CloseCode, cancelFeeFor, Colors, distanceKm, LEVELS, makeCloseCode, martShop, partMarketPrice, pointsForJob, type SosStage, themedStyles } from '@ongarage/shared';
import { MOCK_GARAGES } from '../constants/mockData';
import { FONTS } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { useNotice } from '../context/NoticeContext';
import { MartIcon } from '../components/MartBagIcon';
import { useSOSRecords } from '../context/SOSRecordsContext';
import { usePendingRepairs } from '../context/PendingRepairsContext';
import { useChat } from '../context/ChatContext';
import { jobRecordText } from '@ongarage/shared';
import { TxnTag } from '../components/TxnTag';
import { txnId } from '../utils/txn';
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
  | 'qrScan'
  | 'rating';

// The KITT sweep is sampled at these points of one cycle; the trail lights lag the head by these fractions of a cycle.
const KITT_STEPS = 40;
const KITT_T = Array.from({ length: KITT_STEPS + 1 }, (_, i) => i / KITT_STEPS);
const KITT_LAGS = [0, 0.03, 0.06, 0.09, 0.12];

/** One of the part decisions: a bold action with its result under it. Same size for all three; the recommended one is the filled blue. */
const PartOption: React.FC<{ tone: 'primary' | 'secondary' | 'tertiary'; title: string; sub: string; onPress: () => void }> = ({ tone, title, sub, onPress }) => (
  <Pressable style={[styles.partOption, styles[`partOption_${tone}`]]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`}>
    <Text style={[styles.partOptionTitle, styles[`partOptionTitle_${tone}`]]}>{title}</Text>
    <Text style={[styles.partOptionSub, styles[`partOptionSub_${tone}`]]}>{sub}</Text>
  </Pressable>
);

/** A label with its value set apart on the right: the label muted, the value in bold. */
const FactValue: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.factRow}>
    <Text style={styles.factLabel}>{label}</Text>
    <Text style={styles.factValue}>{value}</Text>
  </View>
);

const STEPS: { key: Step; label: string }[] = [
  { key: 'confirm', label: 'විස්තර තහවුරු කිරීම' },
  { key: 'searching', label: 'ළඟම ගරාජ සෙවීම' },
  // Choosing from the nearby list (when nobody answered) and being connected are the same segment of the stepper.
  // Being connected (and picking from the nearby list) and watching them come are one window: the map, their profile and the ETA.
  // Arrival is a moment inside the same window (the card changes), not a step of its own.
  { key: 'tracking', label: 'කාර්මිකයා පැමිණිමින්' },
  { key: 'repairing', label: 'අලුත්වැඩියාව' },
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
  { id: 't1', name: 'කසුන් ජයසිංහ', skill: 'එන්ජින් සහ විදුලි දෝෂ', van: 'සේවා යතුරුපැදිය', phone: '0712223344', rating: 4.8, reviews: 96, jobs: 412, years: 9, languages: 'සිංහල · English', responseMin: 6, distanceKm: 4.1, bearing: 70 },
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
    skill: 'එන්ජින්, විදුලි සහ ඔයිල් සේවා',
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
  { number: '119', label: 'පොලිස් හදිසි ඇමතුම', icon: '👮' },
  { number: '1990', label: 'සුව සැරිය ගිලන් රථ සේවය', icon: '🚑' },
  { number: '110', label: 'ගිනි නිවීම් සහ ගලවා ගැනීම්', icon: '🔥' },
  { number: '1969', label: 'අධිවේගී මාර්ග හදිසි ඇමතුම', icon: '🛣️' },
];

// The SOS conditions the owner can read at any time.
const SOS_TERM_GROUPS: { title: string; items: { key: string; text: string }[] }[] = [
  {
    title: 'ඉල්ලීම',
    items: [
      { key: 'සෙවුම් කලාපය', text: 'ඔබගේ SOS ඉල්ලීම ඔබේ ස්ථානයේ සිට සෙවුම් කලාපය (km 1 න් ආරම්භ වී, පුළුල් කරන සෑම වාරයකටම km 1 බැගින් වැඩි වේ) ඇතුළත ලියාපදිංචි ගරාජ සහ කාර්මිකයන් වෙත දැනුම් දෙයි.' },
      { key: 'තහවුරු කිරීම', text: 'කාර්මිකයා පැමිණි බව ඔහුගේ app එකෙන් තහවුරු කරයි. එතැන් සිට මෙම SOS රැකියාව ඔහුට සම්බන්ධ වේ.' },
    ],
  },
  {
    title: 'ගාස්තු',
    items: [
      { key: 'පැමිණීමේ ගාස්තුව', text: 'OnGarage අනුමත රු. 500 ක්. කලාපය පුළුල් වන සෑම km 1 කටම රු. 250 ක් එකතු වේ. අලුත්වැඩියාවක් අවශ්‍ය නොවුණත් මෙය කාර්මිකයාට ගෙවිය යුතුය.' },
      { key: 'අලුත්වැඩියා ගාස්තුව', text: 'කාර්මිකයා ඇස්තමේන්තුව ඉදිරිපත් කර ඔබ අනුමත කළ පසු පමණක් අලුත්වැඩියාව ආරම්භ වේ. අනුමැතියෙන් ඔබ්බට වැඩ හෝ ගාස්තු කෙරෙන්නේ නැත.' },
      { key: 'අවලංගු කිරීම', text: 'කාර්මිකයා පිටත් වූ පසු ඉල්ලීම අවලංගු කළහොත් පැමිණීමේ ගාස්තුව අය කෙරේ.' },
    ],
  },
  {
    title: 'අවසන් කිරීම',
    items: [
      { key: 'කේතය', text: 'රැකියාව අවසන් වන්නේ ඔබගේ ඉලක්කම් 6 ක කේතය (හෝ QR) කාර්මිකයා ඇතුළත් කළ පසුවය. කේතය වෙනත් අයට නොදෙන්න.' },
      { key: 'දුරකථන අංකය', text: 'ඔබගේ දුරකථන අංකය මෙම රැකියාව සඳහා පමණක් කාර්මිකයාට පෙන්වයි. ගෙවීම් සහ සන්නිවේදනය යෙදුම තුළම සිදු කිරීමෙන් OnGarage ආරක්ෂිත රැකියා වගකීම ඔබට හිමි වේ.' },
    ],
  },
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
// Parts that keep the car safe to drive: the owner is warned before they are put aside.
const SAFETY_PARTS = new Set<string>([DEFAULT_PART, 'Tyre (tubeless)', 'Headlamp']);

type PartState = 'none' | 'requested' | 'ownerBuying' | 'techOrdering' | 'ordered' | 'got' | 'deferred';

const INITIAL_RADIUS_KM = 1;
const RADIUS_STEP_KM = 1;
// Call-out fee paid to the technician for travelling to the breakdown (OnGarage
// approved); due even if no repair is needed. A wider search means farther travel.
const BASE_FEE = 500;
// "රු." and the amount stay on one line in running text (no break between them).
const feeText = () => money(BASE_FEE).replace(' ', '\u00A0');
const SURCHARGE_STEP = 250;
/** The call-out fee for a helper that is `km` away: OnGarage's Rs. 500, plus Rs. 250 for every km the search had to be widened beyond the first one. */
const calloutFeeFor = (km: number) => BASE_FEE + Math.max(0, Math.ceil(km) - INITIAL_RADIUS_KM) * SURCHARGE_STEP;
const CYCLE_MS = 6000;
// How long the radar shows the nearest garage being reached before the owner is connected to it.
const MATCH_MS = 3200;
const MAX_CYCLES = 4;
const TRACKING_MS = 20000;
// The simulated repair takes one minute (the progress bar fills over this).
const REPAIR_MS = 60000;


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
const MID_TAGS = ['වේලාවට පැමිණියා', 'මිල සාධාරණයි', 'වැඩේ නිම විය'];
// Three tiers: 1–2 stars, 3 stars, 4–5 stars. A change of tier clears the tags picked for the old tier.
const ratingTier = (r: number) => (r >= 4 ? 'good' : r === 3 ? 'mid' : 'bad');

const ratingLabel = (r: number) =>
  r === 0 ? 'තරුවක් තට්ටු කරන්න' : r === 5 ? 'විශිෂ්ටයි!' : r === 4 ? 'ඉතා හොඳ සේවාවක්!' : r === 3 ? 'හොඳ සේවාවක්' : r === 2 ? 'වැඩිදියුණු විය යුතුයි' : 'ඉතා දුර්වලයි';

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
  /** Puts the SOS job away while it runs on in the background (the owner can go back from the status line). */
  onMinimize?: () => void;
  /** What the job is doing now, for the status line outside the flow; needsAction brings the owner back to it. */
  onStatus?: (status: { label: string; needsAction: boolean }) => void;
}

export const SOSFlowScreen: React.FC<SOSFlowScreenProps> = ({
  location,
  vehicleId,
  onVehicleChange,
  onChangeLocation,
  onClose,
  onOpenMart,
  onOpenShop,
  onMinimize,
  onStatus,
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
  const [reward, setReward] = useState({ title: '', description: '', points: 0 });
  const [showCancel, setShowCancel] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  // The technician confirms arrival in their own app; the owner only sees that it happened (no button here).
  const [techConfirmed, setTechConfirmed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  // A part the technician needs mid-repair: the owner buys it in OnMart, or the technician orders it there (bill comes to the owner).
  const [partState, setPartState] = useState<PartState>('none');
  // The technician's "I need a part" notice from their app, shown to the owner as a pop-up message.
  const [partPopup, setPartPopup] = useState(false);
  // "Not now" asks once more before the part is put aside (a warning for the safety parts).
  const [deferAsk, setDeferAsk] = useState(false);
  // A safety part can be put aside only after the mechanic says the car is safe without it.
  const [techCheck, setTechCheck] = useState(false);
  const { addRepair } = usePendingRepairs();
  // When the technician's OnMart order went through (for the order record).
  const [partOrderedAt, setPartOrderedAt] = useState(0);
  const partBlocked = useRef(false);
  partBlocked.current = partState === 'requested' || partState === 'ownerBuying' || partState === 'techOrdering';
  const { notify } = useNotice();
  const { addRecord } = useSOSRecords();
  const chat = useChat();
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
      facts: [t.skill, `රැකියා ${t.jobs} · අත්දැකීම් වසර ${t.years}`],
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
    notify({ icon: '✅', title: `${nearest.name} ඉල්ලීම පිළිගත්තා`, body: 'ඔබ වෙත පැමිණෙමින් සිටී.', tone: 'success' });
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
    return () => clearTimeout(partTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, waitAnim]);

  // The scanner runs while the job waits, and stops while the owner has a decision to make (UX 33: animation must not compete with a required choice).
  const scannerPaused = step === 'repairing' && (partPopup || deferAsk);
  // JS-driven, not native: the scanner's parts are rebuilt when the part popup appears, and a native-driven loop stopped following them.
  useEffect(() => {
    if (step !== 'repairing' || scannerPaused) return;
    const loop = Animated.loop(Animated.timing(waitAnim, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: false }), { iterations: -1 });
    loop.start();
    return () => loop.stop();
  }, [step, scannerPaused, waitAnim]);

  // The technician orders in OnMart: the bill is sent to the owner's app.
  useEffect(() => {
    if (partState !== 'techOrdering') return;
    const t = setTimeout(() => {
      setPartState('ordered');
      setPartOrderedAt(Date.now());
      notify({ icon: '🧾', title: 'OnMart බිල්පත ලැබුණා', body: 'කාර්මිකයා ඇණවුම් කළ කොටසේ බිල්පත ඔබගේ යෙදුමට එක් විය.', tone: 'success' });
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
    if (step === 'repairing' && repairP >= 100) setStep('qrScan');
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
    if (ratingTier(star) !== ratingTier(rating)) setTags([]);
    setRating(star);
    starScale.setValue(0.6);
    Animated.spring(starScale, { toValue: 1, friction: 3, tension: 180, useNativeDriver: true }).start();
    if (star === 5) burstConfetti();
  };

  const submitRating = () => {
    // The finished SOS becomes its own record in Activity.
    const who = profileOf(job);
    const kind = breakdownInfo(breakdown ?? '');
    // The points the rule gives this job: finishing it earns the base, a rating (any stars) adds the bonus once.
    const pts = pointsForJob({ closed: true, rated: rating > 0 });
    setReward({
      title: 'OnGarage ලකුණු',
      description: rating > 0 ? 'රැකියාව සහ ශ්‍රේණිගත කිරීම' : 'රැකියාව අවසන් කිරීම',
      points: pts.total,
    });
    addRecord({
      id: `sos-${closeCode}`,
      completedAt: Date.now(),
      breakdown: { icon: kind.icon, label: kind.label, id: kind.id },
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
      points: { base: pts.base, ratingBonus: pts.ratingBonus },
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
  const partBill = { invoice: txnId('ORD', `part-${closeCode}`), shop: orderShop?.name ?? 'Galle Auto Parts', qty: 1, unit: partPrice, total: partPrice };
  const partCharge = partState === 'ordered' ? partBill.total : 0;

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const job = selected ?? workshops[0];
  // Once a garage or technician has taken the SOS, a chat with them is in OnChat (the same thread the finished record keeps).
  const takenBy = selected?.name;
  useEffect(() => {
    if (!selected) return;
    chat.start({ id: `sos-${closeCode}`, title: selected.name, subtitle: `SOS · ${breakdownInfo(breakdown ?? '').label}`, phone: selected.phone, vehicle, profile: 'sos', record: jobRecordText({ title: `SOS · ${breakdownInfo(breakdown ?? '').label}`, who: { label: 'සහායකයා', name: selected.name, phone: selected.phone }, vehicle, place: location.address, price: surcharge, priceLabel: 'ඇමතුම් ගාස්තුව' }) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takenBy]);
  const mechanicCoords: LatLng = {
    latitude: job.coords.latitude + (location.coords.latitude - job.coords.latitude) * trackP,
    longitude: job.coords.longitude + (location.coords.longitude - job.coords.longitude) * trackP,
  };
  const remainingKm = job.distanceKm * (1 - trackP);
  const baseStep: Step = step === 'consent' ? 'confirm' : step;
  // The cancel rule by stage (marketplace/sosCancel): free while searching, the call-out fee once the technician is on the way, locked after he arrives.
  const cancelStage: SosStage | null =
    baseStep === 'confirm' ? null : baseStep === 'searching' || baseStep === 'nearby' ? 'searching' : baseStep === 'tracking' ? 'enRoute' : baseStep === 'arrived' ? 'arrived' : baseStep === 'repairing' ? 'repairing' : 'completed';
  const canClose = submitted || cancelStage === null || canCancelSos(cancelStage);
  const cancelFee = cancelStage ? cancelFeeFor(cancelStage, surcharge) : 0;
  // The status line outside the flow: a decision (part, price, QR) brings the owner back to the job on its own.
  const sosStatusLabel =
    baseStep === 'searching' || baseStep === 'nearby'
      ? 'ළඟම ගරාජ සොයමින්...'
      : baseStep === 'tracking'
        ? 'කාර්මිකයා පැමිණෙමින් සිටී'
        : baseStep === 'arrived'
          ? 'කාර්මිකයා ළඟා විය'
          : baseStep === 'repairing'
            ? 'අලුත්වැඩියාව සිදුවෙමින්'
            : baseStep === 'qrScan'
              ? 'QR කේතය පෙන්වන්න'
              : baseStep === 'rating'
                ? 'ශ්‍රේණිගත කිරීම'
                : 'SOS ඉල්ලීම';
  const sosNeedsAction = partPopup || deferAsk || expansionPrompt || baseStep === 'qrScan';
  useEffect(() => {
    onStatus?.({ label: sosStatusLabel, needsAction: sosNeedsAction });
  }, [sosStatusLabel, sosNeedsAction]);
  const cancelBody =
    cancelFee > 0
      ? `ඔබගේ ඉල්ලීම ඉවත් කෙරේ. කාර්මිකයා දැනටමත් ගමනාරම්භ කර ඇති නිසා පැමිණීමේ ගාස්තුව ${money(cancelFee)} ගෙවිය යුතුයි.`
      : 'ඔබගේ ඉල්ලීම ඉවත් කෙරේ සහ සම්බන්ධ කරගත් ගරාජයට දැනුම් දෙනු ලැබේ.';
  const stepIndex = STEPS.findIndex((x) => x.key === (step === 'consent' ? 'confirm' : step === 'nearby' || step === 'arrived' ? 'tracking' : step));
  const stepLabel = step === 'nearby' ? 'ළඟම ගරාජ සහ කාර්මිකයන් අතරින් තෝරන්න' : step === 'arrived' ? 'කාර්මිකයා පැමිණියා' : STEPS[stepIndex].label;

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
            <Text style={styles.workshopPinText}>🛠️</Text>
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

  const mechanicCard = (lines: { icon: string; text: string; value?: string }[]) => (
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
          {l.value ? <FactValue label={l.text} value={l.value} /> : <Text style={styles.detailText}>{l.text}</Text>}
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
            <VehicleLine vehicle={vehicle} textStyle={styles.cardTitle} />
          </View>
          <Text style={styles.linkText}>වෙනස් කරන්න</Text>
        </Pressable>
        <View style={styles.divider} />
        <Pressable style={styles.selectRow} onPress={onChangeLocation}>
          <GlassIcon emoji="📍" />
          <View style={styles.flex1}>
            <Text style={styles.label}>ස්ථානය</Text>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {location.address}
            </Text>
          </View>
          <Text style={styles.linkText}>වෙනස් කරන්න</Text>
        </Pressable>
      </View>

      {step === 'consent' && (
        <>
          <Text style={[styles.sectionLabel, { color: Colors.textMain }]}>SOS ඉල්ලීම තහවුරු කරන්න</Text>
          <View style={styles.card}>
            <FactValue label="Call-out fee" value={money(BASE_FEE)} />
          </View>
          <Text style={styles.consentBody}>
            {`ඔබගේ ස්ථානයේ සිට km ${INITIAL_RADIUS_KM} ක් ඇතුළත ගරාජ වලට දැනුම් දෙයි.\nඅලුත්වැඩියාවක් නොවුණත්, කාර්මිකයාගේ ගමන් වියදම වෙනුවෙන් `}
            <Text style={styles.consentStrong}>{`${feeText()} ක`}</Text>
            {' ගාස්තුව ගෙවිය යුතුයි.'}
          </Text>
          <View style={styles.consentActions}>
            <View style={styles.flex1}>
              <ActionButton label="අවලංගු" variant="ghost" compact onPress={() => setStep('confirm')} />
            </View>
            <View style={styles.flex1}>
              <ActionButton label="SOS යවන්න" variant="sos" compact onPress={startSearch} />
            </View>
          </View>
        </>
      )}
      {step !== 'consent' && (
        <>
      {renderEmergencyChip()}
      <Text style={[styles.sectionLabel, { color: Colors.textMain }]}>Breakdown වර්ගය කුමක් ද ?</Text>
      {/* Three to a row, three rows: a big illustration on a soft pastel tile, the name under it. */}
      <View style={styles.breakGrid}>
        {BREAKDOWN_TYPES.map((t) => {
          const active = breakdown === t.id;
          return (
            <Pressable key={t.id} style={({ pressed }) => [styles.breakItem, pressed && { transform: [{ scale: 0.96 }] }]} onPress={() => setBreakdown(t.id)} accessibilityLabel={`Breakdown ${t.id}`}>
              <View style={[styles.breakTile, { backgroundColor: (BREAKDOWN_TINT[t.id] ?? '#9aa7b8') + (active ? '55' : '33') }, active && styles.breakTileActive]}>
                {BREAKDOWN_IMAGES[t.id] ? <Image source={BREAKDOWN_IMAGES[t.id]} style={styles.breakImage} resizeMode="contain" /> : <Text style={styles.gridEmoji}>{t.icon}</Text>}
                {active && (
                  <View style={styles.breakTick}>
                    <Text style={styles.breakTickText}>✓</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.breakLabel, active && { color: Colors.errorText }]} numberOfLines={1}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
          {breakdown === 'accident' && (
            <Pressable style={styles.accidentNote} onPress={() => Linking.openURL('tel:119')} accessibilityLabel="Call 119">
              <Text style={styles.accidentNoteText}>ජීවිතයට හානියක් නම් 119 අමතන්න.</Text>
            </Pressable>
          )}
        </>
      )}
    </>
  );

  /** The emergency numbers, one tap away on the first step and while the owner waits for a garage. */
  const renderEmergencyChip = () => (
    <Pressable style={styles.emergencyChip} onPress={() => setShowEmergency(true)} accessibilityLabel="Emergency numbers">
      <Text style={styles.emergencyChipText}>🚨 හදිසි ඇමතුම් අංක ›</Text>
    </Pressable>
  );

  const renderSearching = () => (
    <>
      {renderEmergencyChip()}
      <View style={[styles.card, styles.rowCenter]}>
        <View style={styles.radarWrap}>
          <Pulse style={styles.radarRing} maxScale={1.6} />
          <Animated.View style={[styles.radarCore, { transform: [{ rotate: spin }] }]}>
            <Text style={styles.radarEmoji}>📡</Text>
          </Animated.View>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.cardTitle}>ළඟම ගරාජය / කාර්මිකයා සොයමින්...</Text>
          <Text style={styles.cardSub}>km {radius} ක් ඇතුළත සොයා ඔබව සම්බන්ධ කරනු ඇත.</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>km {radius}</Text>
          <Text style={styles.statLabel}>සෙවුම් කලාපය</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.warning }]}>{money(surcharge)}</Text>
          <Text style={styles.statLabel}>පැමිණීමේ ගාස්තුව</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{responders.length}</Text>
          <Text style={styles.statLabel}>ළඟ ඇති</Text>
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: Colors.textMain }]}>ළඟ ඇති ගරාජ</Text>
      {workshops.map((w) => {
        const responded = w.distanceKm <= radius;
        return (
          <View key={w.id} style={[styles.card, styles.rowCenter]}>
            <GlassIcon emoji="🛠️" small />
            <View style={styles.flex1}>
              <Text style={styles.cardTitle}>{w.name}</Text>
              <Text style={styles.cardSub}>
                {w.distanceKm} km · {w.eta} min
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
          facts: [w.skill, `රැකියා ${w.jobs} · අත්දැකීම් වසර ${w.years}`, w.van],
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
            <Text style={styles.cardTitle} numberOfLines={2}>
              {levelIcon ? `${levelIcon} ` : ''}
              {c.name}
            </Text>
            <Text style={styles.cardSub}>
              {c.kind === 'garage' ? 'ගරාජය' : 'කාර්මිකයා'} · 📍 {c.distanceKm} km · ⏱️ ~{c.eta} min
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
            <Text style={[styles.statusPillText, { color: Colors.textMuted }]}>පැමිණීමේ ගාස්තුව {money(calloutFeeFor(c.distanceKm))}</Text>
          </View>
        </View>
        {c.facts.length > 0 && (
          <View style={styles.factList}>
            {c.facts.map((f) => (
              <Text key={f} style={styles.factText}>
                {f}
              </Text>
            ))}
          </View>
        )}
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
        <Text style={styles.heroTitle}>km {radius} ක් ඇතුළත පිළිතුරක් නැත</Text>
        <Text style={styles.heroText}>මෙම කලාපයේ කිසිවෙක් ප්‍රතිචාර දැක්වූයේ නැත.</Text>
        <Text style={styles.heroNote}>ළඟම OnGarage ලියාපදිංචි ගරාජ සහ කාර්මිකයන් පහතින්. ප්‍රොෆයිල් බලා කැමති කෙනෙකු සම්බන්ධ කරගන්න.</Text>
      </View>
      <Text style={styles.sectionLabel}>ළඟම ගරාජ</Text>
      {nearbyGarages.map(profileCard)}
      <Text style={styles.sectionLabel}>ළඟම කාර්මිකයන්</Text>
      {nearbyTechnicians.map(profileCard)}
    </>
  );

  /** One window for the whole wait: on the way (the ETA sits above it), then arrived, waiting for the technician to confirm. */
  const renderTracking = () => {
    const arrived = baseStep === 'arrived';
    return (
      <>
        {arrived ? (
          <View style={styles.hero}>
            <Animated.View style={[styles.heroCircle, styles.heroCircleSmall, styles.heroCircleSuccess, { opacity: popAnim, transform: [{ scale: popAnim }] }]}>
              <Text style={styles.heroCircleIconSmall}>{techConfirmed ? '✓' : '📍'}</Text>
            </Animated.View>
            <Text style={styles.heroTitle}>{techConfirmed ? 'පැමිණීම තහවුරු විය!' : 'කාර්මිකයා ළඟා විය'}</Text>
            <Text style={styles.arrivedLine}>
              {techConfirmed
                ? 'මෙම SOS රැකියාව දැන් ඔහුට සම්බන්ධ කර ඇත.'
                : `${job.name} හි ${job.mechanic} ඔබගේ ස්ථානයට ළඟා විය.`}
            </Text>
          </View>
        ) : (
          <View style={styles.acceptedRow}>
            <Text style={styles.acceptedIcon}>✓</Text>
            <Text style={styles.acceptedText}>{job.name} ඉල්ලීම පිළිගත්තා</Text>
          </View>
        )}
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
            <View style={styles.flex1}>
              <Text style={styles.statLabel}>ඇස්තමේන්තුගත අලුත්වැඩියා ගාස්තුව</Text>
              <Text style={styles.estimateValue}>{money(job.bid)}</Text>
            </View>
          </View>
          {!techConfirmed && (
            <View style={[styles.statusPill, arrived ? styles.statusPillWait : styles.statusPillOn, styles.selfCenter]}>
              <Text style={[styles.statusPillText, { color: arrived ? Colors.warning : Colors.success }]}>
                {arrived ? '⏳ තහවුරු කරන තුරු රැඳී සිටින්න' : '🛣️ කාර්මිකයා පැමිණෙමින් සිටී'}
              </Text>
            </View>
          )}
          <View style={styles.mutedTag}>
            <TxnTag kind="SOS" source={`sos-${closeCode}`} />
          </View>
        </View>
      </>
    );
  };

  const chooseOwnerBuys = () => {
    setPartPopup(false);
    setPartState('ownerBuying');
    onOpenMart?.(partName);
  };
  const chooseTechnicianOrders = () => {
    setPartPopup(false);
    setPartState('techOrdering');
  };
  /** Not now: the job goes on without the part, and the vehicle remembers it until it is fitted. */
  const deferPart = () => {
    setDeferAsk(false);
    setTechCheck(false);
    setPartPopup(false);
    setPartState('deferred');
    addRepair({
      id: `pr-${closeCode}`,
      vehicleId: vehicle.id,
      vehiclePlate: vehicle.plate,
      vehicleName: vehicle.name,
      sosId: `sos-${closeCode}`,
      part: partName,
      price: partPrice,
      safety: SAFETY_PARTS.has(partName),
      reason: 'මුදල් දැනට නැහැ',
      noticedAt: Date.now(),
    });
    notify({ icon: '🕓', title: 'කොටස වාහනයේ වාර්තාවට එකතු විය', body: `${partName} පසුවට දමා ඇත. වාහනයට එය අවශ්‍ය බව ඔබට මතක් කරන්නෙමු.`, tone: 'success' });
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
              <Text style={styles.cardTitle}>කාර්මිකයාට කොටසක් අවශ්‍යයි</Text>
              <Text style={styles.cardSub}>
                {partName} × 1 · ~{money(partPrice)}
              </Text>
            </View>
          </View>
          <View style={{ gap: 2 }}>
            <Text style={styles.cardSub}>කාර්මිකයා මෙම කොටස ලැබෙන තුරු රැඳී සිටී.</Text>
            <Text style={styles.cardSub}>ඔබ මෙම කොටස කෙසේ ලබාගැනීමට කැමතිද?</Text>
          </View>
          <PartOption tone="primary" title="මම ගන්නම්" sub="OnMart හි ඔබම ඇණවුම් කරන්න" onPress={chooseOwnerBuys} />
          <PartOption tone="secondary" title="කාර්මිකයා ඇණවුම් කරයි" sub="බිල ඔබට එයි" onPress={chooseTechnicianOrders} />
          <PartOption tone="tertiary" title="පසුව ගන්නම්" sub="OnGarage සේවා වාර්තාවේ සටහන් වේ" onPress={() => setDeferAsk(true)} />
        </View>
      );
    if (partState === 'deferred')
      return (
        <View style={[styles.card, styles.partCard]}>
          <View style={styles.rowCenter}>
            <GlassIcon emoji="🕓" />
            <View style={styles.flex1}>
              <Text style={styles.cardTitle}>කොටස පසුව මාරු කරගනී</Text>
              <Text style={styles.cardSub}>
                {partName} · ඇස්තමේන්තුව {money(partPrice)}
              </Text>
            </View>
          </View>
          <View style={styles.attention}>
            <Text style={styles.attentionText}>⚠️ මෙම කොටස තවමත් වාහනයට අවශ්‍යයි</Text>
          </View>
          <Text style={styles.cardSub}>මෙම කොටස බිල්පතට එකතු නොවේ.</Text>
          <ActionButton label="OnMart වෙත යන්න" icon="🛍️" variant="primary" onPress={() => onOpenMart?.(partName)} />
        </View>
      );
    if (partState === 'ownerBuying')
      return (
        <View style={[styles.card, styles.partCard]}>
          <View style={styles.rowCenter}>
            <GlassIcon emoji="🛍️" />
            <View style={styles.flex1}>
              <Text style={styles.cardTitle}>OnMart හි කොටස ගන්න</Text>
              <Text style={styles.cardSub}>{partName} · තවම ඇණවුම් කර නැහැ.</Text>
            </View>
          </View>
          <ActionButton label="OnMart වෙත යන්න" icon="🛍️" variant="primary" onPress={() => onOpenMart?.(partName)} />
          <Pressable style={styles.otherWayRow} onPress={() => setPartState('requested')} accessibilityLabel="Choose another way">
            <Text style={styles.linkText}>වෙනත් ක්‍රමයක්</Text>
          </Pressable>
        </View>
      );
    if (partState === 'techOrdering')
      return (
        <View style={[styles.card, styles.partCard]}>
          <View style={styles.rowCenter}>
            <GlassIcon emoji="⏳" />
            <View style={styles.flex1}>
              <Text style={styles.cardTitle}>කාර්මිකයා කොටස ඇණවුම් කරයි</Text>
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
            <Text style={styles.cardSub}>{partState === 'ordered' ? 'කොටස ලැබුණු විට අලුත්වැඩියාව නැවත ආරම්භ වෙයි.' : 'අලුත්වැඩියාව නැවත ආරම්භ විය.'}</Text>
          </View>
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
              <View style={styles.flex1}>
                <FactValue label="ඇණවුම් කළේ" value={`${new Date(partOrderedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · කාර්මිකයා විසින්`} />
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📦</Text>
              <View style={styles.flex1}>
                <FactValue label="තත්වය" value="වෙළඳසැලෙන් කොටස සූදානම් වෙමින්" />
              </View>
            </View>
            <ActionButton label="වෙළඳසැලට ඇතුළු වන්න" icon="🏪" variant="primary" onPress={() => onOpenShop?.('ps1')} />
          </>
        )}
      </View>
    );
  };

  const renderRepairing = () => {
    // Soft rings pulse out of a glowing core, two dots orbit it and the wrench rocks: the "work is happening" scene.
    const rock = spinAnim.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['-18deg', '18deg', '-18deg', '18deg', '-18deg'] });
    const breathe = spinAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] });
    // KITT's scanner: one red light sweeps to the end and back with eased turns, and a fading trail follows it.
    // Each trail light is the same sweep, a little behind the one before it (cosine phase, so the ends ease in and out).
    const segW = waitBarW * 0.16;
    const sweepX = (lag: number) =>
      waitAnim.interpolate({
        inputRange: KITT_T,
        outputRange: KITT_T.map((t) => ((1 - Math.cos(2 * Math.PI * (t - lag))) / 2) * (waitBarW - segW)),
      });
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
        <Text style={[styles.sectionLabel, { color: Colors.textMain }]}>{profileOf(job).kind === 'garage' ? 'ඔබේ ගරාජයේ විස්තර' : 'ඔබේ කාර්මිකයාගේ විස්තර'}</Text>
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
            <View style={styles.flex1}>
              <Text style={styles.statLabel}>ඇස්තමේන්තුගත අලුත්වැඩියා ගාස්තුව</Text>
              <Text style={styles.estimateValue}>{money(job.bid)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.waitHead}>
            <Text style={styles.waitSub}>වැඩේ අවසන් වූ විට අපි ඔබට දැනුම් දෙන්නෙමු</Text>
          </View>
          <View style={styles.waitTrack} onLayout={(e) => setWaitBarW(e.nativeEvent.layout.width)}>
            {KITT_LAGS.map((lag, i) => (
              <Animated.View
                key={i}
                style={[styles.kittLight, i === 0 && styles.kittHead, { width: segW, opacity: 1 - i * 0.22, transform: [{ translateX: sweepX(lag) }] }]}
              />
            ))}
          </View>
        </View>

        {renderPartCard()}

        <Pressable style={[styles.card, styles.rowCenter]} onPress={() => setShowTerms(true)} accessibilityLabel="SOS conditions">
          <GlassIcon emoji="📄" small />
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>SOS කොන්දේසි</Text>
            <Text style={styles.cardSub}>ගාස්තු, අනුමැතිය, අවසන් කිරීම සහ අවලංගු කිරීම ගැන කියවන්න</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        {renderEmergencyChip()}
      </>
    );
  };

  const renderQrScan = () => (
    <>
      <View style={styles.hero}>
        <View style={[styles.heroCircle, styles.heroCircleSuccess]}>
          <Text style={styles.heroCircleIcon}>✓</Text>
        </View>
        <Text style={styles.heroTitle}>අලුත්වැඩියාව අවසන්</Text>
        <Text style={styles.arrivedLine}>{job.mechanic} අලුත්වැඩියාව අවසන් කළා. වාහනය පරීක්ෂා කරන්න.</Text>
      </View>
      <View style={styles.codeBlock}>
        <CloseCode code={closeCode} size={190} />
        <Text style={styles.codeCaption}>ස්කෑන් කළ නොහැකි නම් මෙම කේතය කාර්මිකයාට කියන්න.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>බිල්පත් සාරාංශය</Text>
        <TxnTag kind="SOS" source={`sos-${closeCode}`} />
        <FactValue label="අලුත්වැඩියා ගාස්තුව" value={money(job.bid)} />
        <FactValue label="පැමිණීමේ ගාස්තුව" value={money(surcharge)} />
        {partCharge > 0 && <FactValue label={`OnMart කොටස (${partName}) · ${partBill.shop}`} value={money(partCharge)} />}
        <View style={styles.divider} />
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>මුළු එකතුව</Text>
          <Text style={styles.cardTitle}>{money(job.bid + surcharge + partCharge)}</Text>
        </View>
      </View>
    </>
  );

  const renderRating = () => (
    <>
      <View style={[styles.card, styles.centerCard, styles.rateCard]}>
        <View style={[styles.avatarRing, { borderColor: Colors.subtleBorder }]}>
          <View style={[styles.avatar, styles.avatarLarge]}>
            <Text style={styles.avatarEmojiLarge}>👨‍🔧</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>{job.mechanic}</Text>
        <Text style={styles.cardSub}>{job.name}</Text>
        <Text style={styles.rateQuestion}>සේවාව කෙසේද?</Text>
        <Animated.View style={[styles.starsRow, { transform: [{ scale: starScale }] }]}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => pressStar(n)} hitSlop={6} accessibilityLabel={`Rate ${n} stars`}>
              <Animated.Text style={[styles.starBig, rating >= n && styles.starOn]}>
                {rating >= n ? '★' : '☆'}
              </Animated.Text>
            </Pressable>
          ))}
        </Animated.View>
        {/* The label's space is kept from the start, so the tags do not jump when the first star is tapped. */}
        <View style={styles.ratingLabelSlot}>
          {rating > 0 && <Text style={[styles.detailStrong, { color: rating >= 4 ? Colors.success : Colors.textMuted }]}>{ratingLabel(rating)}</Text>}
        </View>

        {rating > 0 && !submitted && (
          <View style={styles.tagWrap}>
            {(rating >= 4 ? GOOD_TAGS : rating === 3 ? MID_TAGS : BAD_TAGS).map((t) => {
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
    if (step === 'consent') return null;
    switch (baseStep) {
      case 'confirm':
        return (
          <ActionButton
            label={breakdown ? 'SOS ඉල්ලීම දැන් යවන්න' : 'වර්ගයක් තෝරන්න'}
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
            label="කාර්මිකයා ස්කෑන් කළා"
            icon="📷"
            variant="success"
            onPress={() => {
              setRating(0);
              setTags([]);
              setSubmitted(false);
              setStep('rating');
            }}
          />
        );
      case 'rating':
        return submitted ? null : (
          <ActionButton label={rating === 0 ? 'ශ්‍රේණිගත නොකර අවසන් කරන්න' : 'ශ්‍රේණිගත කිරීම යවන්න'} icon="✓" variant="primary" onPress={submitRating} />
        );
      default:
        return null;
    }
  };

  const bottomBar = renderBottomBar();
  const mapKind: 'confirm' | 'searching' | 'nearby' | 'tracking' | null =
    baseStep === 'searching' || baseStep === 'nearby' || baseStep === 'tracking' ? baseStep : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* PickMe-style: the map (or, on steps without one, a red band) fills the top; the controls float over it. */}
      <View style={[styles.topArea, mapKind ? styles.topAreaMap : styles.topAreaBand]} onLayout={(e) => setTopH(Math.round(e.nativeEvent.layout.height))}>
        {mapKind ? renderMap(topH, mapKind) : <Gradient stops={GRADIENTS.sosHeader} />}
        <View style={styles.topBar}>
          {/* Fixed slots: the pill keeps its place when a control is not offered on a step. */}
          <View style={styles.topSlot}>
            {canClose && (
              <Pressable style={styles.roundBtn} onPress={requestClose} accessibilityLabel="Close SOS">
                <Text style={styles.roundBtnText}>✕</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.stepPill}>
            <View style={styles.stepPillIcon}>
              <Text style={styles.headerIconText}>🚨</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.stepPillTitle} numberOfLines={1}>Ongarage SOS</Text>
              <View style={styles.stepPillRow}>
                <Text style={styles.stepPillCount}>{stepIndex + 1}/{STEPS.length}</Text>
                <Text style={styles.stepPillSub} numberOfLines={1}>{stepLabel}</Text>
              </View>
            </View>
          </View>
          {/* The slot exists only while minimise is offered: otherwise the pill runs to the right edge, as the towing pill does. */}
          {baseStep !== 'confirm' && onMinimize && (
            <View style={styles.topSlot}>
              <Pressable style={styles.roundBtn} onPress={onMinimize} accessibilityLabel="Minimise SOS">
                <Text style={styles.roundBtnText}>⌄</Text>
              </Pressable>
            </View>
          )}
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
              <Text style={styles.etaLabel}>ඉතිරි වී ඇති දුර</Text>
              <Text style={styles.etaValue}>{remainingKm.toFixed(2)} km</Text>
            </View>
            <View style={styles.etaDivider} />
            <View style={styles.etaItem}>
              <Text style={styles.etaLabel}>Breakdown ස්ථානයට තව</Text>
              <Text style={styles.etaValue}>{Math.max(1, etaMinutes(remainingKm) - 2)} min</Text>
            </View>
          </View>
        )}

        <ScrollView ref={sheetScroll} style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Once connected, whoever took the SOS stays at the top, one tap from their full profile. */}
          {selected && CONNECTED_STEPS.includes(baseStep) && baseStep !== 'tracking' && baseStep !== 'arrived' && baseStep !== 'repairing' && baseStep !== 'rating' && (
            <Pressable style={styles.connectedBar} onPress={() => setShowProfile(true)} accessibilityLabel="Open connected profile">
              <View style={[styles.avatar, styles.avatarSmall]}>
                <Text style={styles.avatarEmojiSmall}>{profileOf(selected).kind === 'garage' ? '🛠️' : '👨‍🔧'}</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {selected.name}
                </Text>
                <Text style={styles.cardSub} numberOfLines={1}>
                  {profileOf(selected).kind === 'garage' ? 'ගරාජය' : 'කාර්මිකයා'} · {selected.mechanic} · ප්‍රොෆයිලය බලන්න ›
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
          {(baseStep === 'tracking' || baseStep === 'arrived') && renderTracking()}
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
              {SOS_TERM_GROUPS.map((g) => (
                <View key={g.title} style={styles.termGroup}>
                  <Text style={styles.termGroupTitle}>{g.title}</Text>
                  {g.items.map((t) => (
                    <View key={t.key} style={[styles.termItem, t.key === 'කේතය' && styles.termItemHighlight]}>
                      <Text style={styles.termKey}>{t.key}</Text>
                      <Text style={styles.termText}>{t.text}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
            <ActionButton label="වසන්න" variant="primary" onPress={() => setShowTerms(false)} />
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
          title="කාර්මිකයාට කොටසක් අවශ්‍යයි"
          rows={[
            { label: 'කොටස', value: `${partName} × 1` },
            { label: 'මිල', value: `${money(partPrice)} ක් පමණ` },
          ]}
          body={`\nකාර්මිකයා මෙම කොටස ලැබෙන තුරු රැඳී සිටී.\nඔබ මෙම කොටස කෙසේ ලබාගැනීමට කැමතිද?`}
        >
          <View style={styles.partActions}>
            <PartOption tone="primary" title="මම ගන්නම්" sub="OnMart හි ඔබම ඇණවුම් කරන්න" onPress={chooseOwnerBuys} />
            <PartOption tone="secondary" title="කාර්මිකයා ඇණවුම් කරයි" sub="බිල ඔබට එයි" onPress={chooseTechnicianOrders} />
            <PartOption tone="tertiary" title="පසුව ගන්නම්" sub="OnGarage සේවා වාර්තාවේ සටහන් වේ" onPress={() => { setPartPopup(false); setDeferAsk(true); }} />
          </View>
        </ModalCard>
      )}

      {step === 'repairing' && deferAsk && !techCheck && (
        <ModalCard
          icon={SAFETY_PARTS.has(partName) ? '⚠️' : '🕓'}
          tone={SAFETY_PARTS.has(partName) ? 'danger' : 'primary'}
          title="කොටස පසුව මාරු කරනව ද ?"
          highlight={SAFETY_PARTS.has(partName) ? 'ආරක්ෂාවට අදාළ කොටසකි' : 'කාර්මිකයාගේ අනුමැතිය මත'}
          body={
            SAFETY_PARTS.has(partName)
              ? `\n${partName} වාහනයේ ආරක්ෂාවට අදාළ කොටසකි. මෙය පසුවට දැමුවහොත් වාහනය ධාවනය කිරීමට පෙර කාර්මිකයා සමග නැවත පරීක්ෂා කරන්න. ගරාජය මෙම තීරණය වාර්තා කරගනී.`
              : `\n${partName} දැනට ගැනීමට නොහැකි නම් පසුව මාරු කර ගන්න. කාර්මිකයාගේ අනුමැතිය මත වාහනය ආරක්ෂිතව ධාවනය කළ හැකි නම් පමණක් මෙය සිදු කරන්න.\nවාහනයට මෙම කොටස අවශ්‍ය බව Ongarage වාර්තාවේ සටහන් කර ගනී.`
          }
        >
          <View style={styles.deferStack}>
            <ActionButton label="ආපසු" variant="primary" compact onPress={() => setDeferAsk(false)} />
            {SAFETY_PARTS.has(partName) ? (
              <ActionButton label="මම දනිමි, පසුවට" variant="ghost" compact onPress={() => setTechCheck(true)} />
            ) : (
              <ActionButton label="ඔව්, පසුව මාරු කරන්නම්" variant="ghost" compact onPress={deferPart} />
            )}
          </View>
        </ModalCard>
      )}

      {step === 'repairing' && deferAsk && techCheck && (
        <ModalCard
          icon="⚠️"
          tone="danger"
          title="කාර්මිකයා තහවුරු කරන්න"
          highlight="ආරක්ෂිතව ධාවනය කළ හැකිද?"
          body={`\n${partName} නොමැතිව වාහනය ආරක්ෂිතව ධාවනය කළ හැකිද? කාර්මිකයා සමග එකඟ වූ පසු පමණක් තහවුරු කරන්න.`}
        >
          <View style={styles.deferStack}>
            <ActionButton label="ඔව්, ආරක්ෂිතයි" variant="primary" compact onPress={deferPart} />
            <ActionButton
              label="නැහැ, ආරක්ෂිත නොවේ"
              variant="ghost"
              compact
              onPress={() => {
                setTechCheck(false);
                setDeferAsk(false);
                setPartPopup(true);
              }}
            />
          </View>
        </ModalCard>
      )}

      {step === 'searching' && expansionPrompt && (
        <ModalCard
          icon="📡"
          tone="primary"
          title="සෙවුම් කලාපය පුළුල් කරමින්"
          rows={[
            { label: 'Search radius', value: `km ${radius} → km ${radius + RADIUS_STEP_KM}` },
            { label: 'Call-out fee', value: `${money(calloutFeeFor(radius))} → ${money(calloutFeeFor(radius + RADIUS_STEP_KM))}` },
          ]}
          body={`\nමෙම කලාපයේ ගරාජයක් හෝ කාර්මිකයෙක් නැත. ඒ නිසා සෙවුම් කලාපය වැඩි කරන්න ද ?`}
        >
          <ActionButton label="නැහැ, නැවත සොයන්න" variant="ghost" compact onPress={() => setExpansionPrompt(false)} />
          <ActionButton
            label="ඔව්, වැඩි කරන්න"
            variant="primary"
            compact
            onPress={() => {
              setExpansionPrompt(false);
              expandSearch();
            }}
          />
        </ModalCard>
      )}

      {showEmergency && (
        <ModalCard icon="🚨" tone="danger" title="හදිසි ඇමතුම් අංක" body="">
          <View style={styles.deferStack}>
            {EMERGENCY_NUMBERS.map((e) => (
              <Pressable
                key={e.number}
                style={styles.emergencyRow}
                onPress={() => Linking.openURL(`tel:${e.number}`)}
                accessibilityLabel={`Call ${e.number}`}
              >
                <GlassIcon emoji={e.icon} small />
                <Text style={[styles.detailText, styles.flex1]}>{e.label}</Text>
                <View style={styles.emergencyNumber}>
                  <Text style={styles.emergencyNumberBig}>📞 {e.number}</Text>
                </View>
              </Pressable>
            ))}
            <ActionButton label="වසන්න" variant="primary" compact onPress={() => setShowEmergency(false)} />
          </View>
        </ModalCard>
      )}

      {showCancel && (
        <ModalCard icon="🛑" tone="danger" title="SOS ඉල්ලීම අවලංගු කරන්නද?" body={cancelBody}>
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
  container: { flex: 1, backgroundColor: pageBg() },
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
  partActions: { flex: 1, gap: 8 },
  stepSeg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.subtleBorder },
  stepSegDone: { backgroundColor: '#ef4444' },
  stepSegActive: { backgroundColor: '#ef4444' },
  body: { paddingHorizontal: 6, paddingTop: 6, gap: 12, paddingBottom: 24 },
  mapFull: { ...StyleSheet.absoluteFill },
  topArea: { overflow: 'hidden' },
  topAreaMap: { height: '42%' },
  topAreaBand: { height: 130 },
  topBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  topSlot: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center', ...FLOAT_SHADOW },
  roundBtnText: { fontSize: 16, fontWeight: '700', color: Colors.textMain },
  stepPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard, ...FLOAT_SHADOW },
  stepPillIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: getThemeMode() === 'dark' ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2', justifyContent: 'center', alignItems: 'center' },
  stepPillTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
  // The title sits on top; under it the step count as a small tinted tag, then the step's name in a calmer weight.
  stepPillRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  stepPillCount: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: '#dc2626', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: getThemeMode() === 'dark' ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2' },
  stepPillSub: { flexShrink: 1, fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textSoft },
  // The step lives in a rounded sheet that overlaps the map, like the location picker's card.
  sheet: { flex: 1, marginTop: -24, backgroundColor: pageBg(), borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', shadowColor: '#3c4043', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 8 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder, marginTop: 10 },
  card: { backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: outline(), ...elevation1(), padding: 16, gap: 12 },
  centerCard: { alignItems: 'center' },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { height: 1, backgroundColor: Colors.borderColor },
  label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4 },
  linkText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  cardTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
  cardSub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
  // The facts under a candidate: short lines, one per fact, set apart from the header above them.
  factList: { gap: 4, paddingTop: 10, marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderColor },
  factText: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 18 },
  // Same heading style as the Home screen's sections.
  sectionLabel: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary, letterSpacing: 0.2, marginTop: 6 },
  hint: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, textAlign: 'center' },


  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  gridItem: { width: '31%', alignItems: 'center', gap: 6 },
  glassTile: { width: 76, height: 76, borderRadius: 38, backgroundColor: Colors.bgCard, borderWidth: getThemeMode() === 'dark' ? 1 : 0, borderColor: Colors.borderColor, justifyContent: 'center', alignItems: 'center', ...SOFT_SHADOW },
  glassTileActive: { backgroundColor: 'rgba(239, 68, 68, 0.14)', borderWidth: 2, borderColor: '#ef4444' },
  gridEmoji: { fontSize: 30 },
  gridImage: { width: 60, height: 60 },
  breakGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  breakItem: { width: '33.33%', alignItems: 'center', gap: 4 },
  breakTile: { width: 84, height: 80, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  breakTileActive: { borderColor: '#ef4444', borderWidth: 3 },
  breakTick: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  breakTickText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#fff' },
  breakImage: { width: 80, height: 80 },
  breakLabel: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center', lineHeight: 22, height: 24, paddingTop: 2, paddingHorizontal: 2 },
  gridLabel: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center' },

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
  statBox: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: outline(), ...elevation1(), paddingVertical: 14, alignItems: 'center' },
  statValue: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
  statLabel: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.subtleBorder, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#ef4444' },
  progressFillSuccess: { backgroundColor: Colors.success },
  statusPill: { paddingHorizontal: 10, height: 24, justifyContent: 'center', borderRadius: 6, borderWidth: 1 },
  statusPillOn: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.4)' },
  statusPillOff: { backgroundColor: Colors.subtleFill, borderColor: Colors.borderColor },
  statusPillText: { fontSize: 11, fontFamily: FONTS.bodySemiBold },

  ratingPill: { backgroundColor: 'rgba(245, 158, 11, 0.14)', borderRadius: 6, paddingHorizontal: 8, height: 22, justifyContent: 'center' },
  connectedBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard },
  profileBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.overlay },
  profileSheet: { gap: 12, padding: 24, paddingBottom: 28, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: Colors.bgCard },
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
  otherWayRow: { alignSelf: 'center', paddingVertical: 4 },
  martGo: { paddingHorizontal: 16, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  martGoText: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  partCard: { gap: 10, borderColor: Colors.primary, borderWidth: 1 },
  waitText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center', marginBottom: 10 },
  waitTrack: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: Colors.subtleBorder },
  // KITT's light: red, with a glow on the head and a fading trail behind it.
  kittLight: { position: 'absolute', left: 0, top: 0, height: 8, borderRadius: 4, backgroundColor: '#ff2a2a' },
  kittHead: { backgroundColor: '#ff4d4d', shadowColor: '#ff2a2a', shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  emergencyIcon: { fontSize: 22, marginRight: 10 },
  emergencyNumber: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(100, 116, 139, 0.14)' },
  emergencyNumberText: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain, letterSpacing: 0.5 },
  termsSheet: { maxHeight: '80%' },
  termsScroll: { flexGrow: 0 },
  emergencyChip: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: 'rgba(100, 116, 139, 0.14)' },
  emergencyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(100, 116, 139, 0.10)' },
  emergencyNumberBig: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain, letterSpacing: 0.5 },
  emergencyChipText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain },
  accidentNote: { alignSelf: 'stretch', padding: 12, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.12)' },
  accidentNoteText: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.errorText, textAlign: 'center' },
  consentBody: { fontSize: 14, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 21, paddingHorizontal: 4 },
  consentStrong: { fontFamily: FONTS.bodyBold, color: Colors.textMain },
  consentActions: { flexDirection: 'row', gap: 10 },
  codeBlock: { alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  codeCaption: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMain, textAlign: 'center', lineHeight: 19, paddingHorizontal: 12 },
  termGroup: { gap: 10, marginBottom: 18 },
  termGroupTitle: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain, letterSpacing: 0.3 },
  termItem: { gap: 4, marginBottom: 12 },
  termItemHighlight: { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderRadius: 12, padding: 10 },
  termKey: { fontSize: 13.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
  termText: { fontSize: 13.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 20 },
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
  factRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  factLabel: { flexShrink: 1, fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
  factValue: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
  detailIcon: { fontSize: 14, width: 20, textAlign: 'center' },
  detailText: { fontSize: 13.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain },
  // A status row: the state in bold, where it came from in a smaller muted line under it.
  detailTitle: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
  waitHead: { alignItems: 'center', gap: 2, marginBottom: 14 },
  waitTitle: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center' },
  waitSub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
  detailSub: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
  detailStrong: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },

  hero: { alignItems: 'center', gap: 6, paddingVertical: 10 },
  heroCircle: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  heroCircleSuccess: { backgroundColor: Colors.success, shadowColor: Colors.success, shadowOpacity: 0.6, shadowRadius: 24, elevation: 8 },
  heroCircleGlass: { backgroundColor: Colors.bgCard, ...SOFT_SHADOW },
  heroCircleIcon: { fontSize: 36, color: '#fff', fontWeight: '900' },
  heroTitle: { fontSize: 20, lineHeight: 28, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
  heroText: { fontSize: 14, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', lineHeight: 21 },
  arrivedLine: { fontSize: 14, fontFamily: FONTS.bodyRegular, color: Colors.textMain, textAlign: 'center', lineHeight: 21 },
  statusPillWait: { backgroundColor: 'rgba(245, 158, 11, 0.14)' },
  heroNote: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', lineHeight: 18, marginTop: 6 },

  etaBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 6, marginTop: 6, marginBottom: 4, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard, ...elevation1() },
  etaRow: { flexDirection: 'row', alignItems: 'center' },
  etaItem: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  etaValue: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMain },
  // The Sinhala minutes draw larger than the Latin km at the same size, so they get a smaller size to look the same.
  etaValueSinhala: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain },
  // The three part decisions share one size; only the recommended one is filled.
  partOption: { width: '100%', minHeight: 58, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 2 },
  deferStack: { width: '100%', gap: 8 },
  acceptedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  acceptedIcon: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.success },
  acceptedText: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.textMain },
  mutedTag: { alignSelf: 'center', opacity: 0.6 },
  estimateValue: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 2 },
  partOption_primary: { backgroundColor: '#1a73e8' },
  partOption_secondary: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#eaf1fb' },
  partOption_tertiary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: outline() },
  partOptionTitle: { fontSize: 14, fontFamily: FONTS.bodyBold },
  partOptionTitle_primary: { color: '#ffffff' },
  partOptionTitle_secondary: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a56b0' },
  partOptionTitle_tertiary: { color: Colors.textMain },
  partOptionSub: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, textAlign: 'center' },
  partOptionSub_primary: { color: 'rgba(255, 255, 255, 0.9)' },
  partOptionSub_secondary: { color: Colors.textMuted },
  partOptionSub_tertiary: { color: Colors.textMuted },
  attention: { padding: 10, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(245, 158, 11, 0.12)' : '#fef7e0' },
  attentionText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.warning },
  // A fixed two-line box, so the values of both columns sit on the same line whatever the label's length.
  etaLabel: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2, textAlign: 'center', minHeight: 28, textAlignVertical: 'bottom' },
  etaDivider: { width: 1, height: 34, backgroundColor: Colors.borderColor },
  callBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center' },
  callBtnText: { fontSize: 18 },


  starsRow: { flexDirection: 'row', gap: 8 },
  star: { fontSize: 40, color: Colors.subtleBorder },
  rateCard: { gap: 6, paddingVertical: 20 },
  rateQuestion: { marginTop: 10, fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
  starBig: { fontSize: 46, color: Colors.subtleBorder },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 },
  ratingLabelSlot: { minHeight: 24, alignItems: 'center', justifyContent: 'center' },
  tag: { paddingHorizontal: 14, height: 32, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard },
  tagOn: { borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
  tagText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
  tagTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  starOn: { color: Colors.warning },
  rewardCard: { borderRadius: 12, padding: 18, alignItems: 'center', gap: 6, overflow: 'hidden', backgroundColor: '#059669' },
  rewardIcon: { fontSize: 34 },
  rewardText: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: '#ecfdf5', textAlign: 'center' },
  pointsPill: { backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  pointsText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  confettiLayer: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', zIndex: 50 },

  bottomBar: { padding: 16, paddingTop: 12, gap: 8, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: outline() },
}));
