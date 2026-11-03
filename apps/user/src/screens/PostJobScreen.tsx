import { CategoryStrip, shortCategoryName } from '../components/home/CategoryStrip';
import { VehicleLine } from '@ongarage/shared';
import { elevation1, outline, pageBg } from '../utils/material';
import { jobDescription, problemTold } from '../utils/jobText';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, TextStyle, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, getThemeMode, themedStyles } from '@ongarage/shared';
import { FONTS } from '@ongarage/shared';
import { MOCK_GARAGES } from '../constants/mockData';
import { bidSubServices, FITTING_SUPPLY, PARTS_FITTING_CATEGORY_ID, SERVICE_CATEGORIES, type PartsFitting, type PartType } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { VehicleOptions } from '../components/VehicleOptions';
import { GoogleMap } from '@ongarage/shared';
import { Gradient, GRADIENTS } from '@ongarage/shared';
import { ActionButton, GlassIcon, glassStyle } from '@ongarage/shared';
import { Slider } from '@ongarage/shared';
import { useUserLocation } from '../context/LocationContext';
import { useBids } from '../context/BidsContext';
import type { JobDraft, VoiceNote } from '@ongarage/shared';
import { MediaAttachments } from '../components/MediaAttachments';
import { SPARE_PARTS } from '../constants/labels';
import { CategoryPhoto } from '../components/home/CategoryPhoto';

type Question = { id: string; question: string; options: string[] };
type Profile = {
  keywords: string[];
  questions: Question[];
  categoryId: string;
  technician: string;
  summary: string;
  unsafe?: boolean;
};

// Offline keyword matcher standing in for the remote diagnosis model.
const PROFILES: Profile[] = [
  {
    keywords: ['rattle', 'knock', 'noise', 'sound', 'tick', 'vibration', 'shake', 'ශබ්ද', 'සද්ද', 'ගැට', 'තට්ටු', 'කම්පන'],
    questions: [
      { id: 'q1', question: 'ශබ්දය එන්නේ කොහි සිටද?', options: ['එන්ජින් කොටස', 'ඉදිරි රෝද', 'පසු රෝද', 'වාහනය යටින්'] },
      { id: 'q2', question: 'ශබ්දය ඇති වන්නේ කවදාද?', options: ['පණගන්වන විට', 'ධාවනය කරන විට', 'බ්‍රේක් කරන විට', 'නිෂ්ක්‍රීයව ඇති විට'] },
      { id: 'q3', question: 'ශබ්දය විස්තර කරන්නේ කෙසේද?', options: ['ගැටෙන', 'තට්ටු කරන', 'කෑගසන', 'ඇඹරෙන'] },
    ],
    categoryId: '1',
    technician: 'එන්ජින් / රෝග විනිශ්චය විශේෂඥ',
    summary: 'ඔබගේ රෝග ලක්ෂණ යාන්ත්‍රික හෝ සස්පෙන්ෂන් දෝෂයක් පෙන්නුම් කරයි.',
  },
  {
    keywords: ['tyre', 'tire', 'wheel', 'puncture', 'flat', 'steering', 'align', 'ටයර', 'රෝද', 'පන්චර්', 'ස්ටියරින්'],
    questions: [
      { id: 'q1', question: 'බලපෑමට ලක් වූ රෝදය කුමක්ද?', options: ['ඉදිරි වම', 'ඉදිරි දකුණ', 'පසු වම', 'පසු දකුණ'] },
      { id: 'q2', question: 'ටයරයේ වාතය හදිසියේම බැස්සාද?', options: ['ඔව්, ක්ෂණිකව', 'නැත, සෙමින්', 'විශ්වාස නැත'] },
      { id: 'q3', question: 'ස්ටියරින් එක පැත්තකට අදීද?', options: ['ඔව්', 'නැත', 'බ්‍රේක් කරන විට පමණි'] },
    ],
    categoryId: '6',
    technician: 'ටයර් / සස්පෙන්ෂන් විශේෂඥ',
    summary: 'ඔබගේ රෝග ලක්ෂණ ටයර් හෝ රෝද ඇලයින්මන්ට් ගැටලුවක් පෙන්නුම් කරයි.',
  },
  {
    keywords: ['battery', 'jump', 'dead', 'crank', 'dim', 'බැටරි', 'පණගන්', 'ස්ටාර්ට්'],
    questions: [
      { id: 'q1', question: 'ඩෑෂ්බෝඩ් ලයිට් දැල්වේද?', options: ['ඔව්, නමුත් අඳුරුයි', 'නැත, කිසිවක් නැත', 'ඔව්, සාමාන්‍ය ලෙස'] },
      { id: 'q2', question: 'පණගැන්වීමට උත්සාහ කරන විට කුමක් සිදුවේද?', options: ['එක් ක්ලික් ශබ්දයක්', 'සෙමින් කැරකේ', 'කිසිදු ශබ්දයක් නැත'] },
      { id: 'q3', question: 'බැටරිය කොපමණ පැරණිද?', options: ['වසරකට අඩු', 'වසර 1–3', 'වසර 3 ට වැඩි'] },
    ],
    categoryId: '11',
    technician: 'ඔටෝ ඉලෙක්ට්‍රීෂියන්',
    summary: 'ඔබගේ රෝග ලක්ෂණ බැටරි හෝ චාජින් පද්ධතියේ දෝෂයක් පෙන්නුම් කරයි.',
  },
  {
    keywords: ['overheat', 'heat', 'temperature', 'smoke', 'steam', 'coolant', 'radiator', 'රත්', 'දුම', 'හුමාල', 'රේඩියේටර්', 'කූලන්ට්'],
    questions: [
      { id: 'q1', question: 'රත් වන්නේ කවදාද?', options: ['තදබදයේදී', 'අධිවේගී මාර්ගයේදී', 'සැමවිටම', 'කලාතුරකින්'] },
      { id: 'q2', question: 'කිසියම් ද්‍රවයක් කාන්දු වනවාද?', options: ['කොළ පැහැති කූලන්ට්', 'ජලය', 'කාන්දුවක් නැත', 'විශ්වාස නැත'] },
      { id: 'q3', question: 'බොනට් එකෙන් හුමාලය එනවාද?', options: ['ඔව්', 'නැත', 'දුම පමණි'] },
    ],
    categoryId: '1',
    technician: 'සිසිලන පද්ධති විශේෂඥ',
    summary: 'ඔබගේ රෝග ලක්ෂණ සිසිලන පද්ධතියේ හෝ එන්ජිම රත්වීමේ දෝෂයක් පෙන්නුම් කරයි.',
    unsafe: true,
  },
  {
    keywords: ['brake', 'squeak', 'screech', 'pedal', 'abs', 'බ්‍රේක්', 'තිරිංග'],
    questions: [
      { id: 'q1', question: 'බ්‍රේක් කරන විට ඔබ දකින්නේ කුමක්ද?', options: ['කෑගසන ශබ්දය', 'ඇඹරෙන ශබ්දය', 'මෘදු පෙඩලය', 'වාහනය අදී'] },
      { id: 'q2', question: 'බ්‍රේක් පෑඩ් කොපමණ පැරණිද?', options: ['මෑතකදී මාරු කළා', 'වසරකට වැඩි', 'විශ්වාස නැත'] },
      { id: 'q3', question: 'අනතුරු ඇඟවීමේ ලයිට් එකක් දැල්වී තිබේද?', options: ['ඔව්, ABS', 'ඔව්, බ්‍රේක් ලයිට්', 'ලයිට් නැත'] },
    ],
    categoryId: '7',
    technician: 'බ්‍රේක් විශේෂඥ',
    summary: 'ඔබගේ රෝග ලක්ෂණ බ්‍රේක් පද්ධතියේ දෝෂයක් පෙන්නුම් කරයි.',
    unsafe: true,
  },
  {
    keywords: ['ac', 'a/c', 'aircon', 'air conditioning', 'blower', 'ඒසී', 'වායු සමීකරණ', 'සීතල'],
    questions: [
      { id: 'q1', question: 'හුළඟ උණුසුම්ද සීතලද?', options: ['උණුසුම් හුළඟ', 'මඳක් සීතල', 'හුළඟ නැත'] },
      { id: 'q2', question: 'බ්ලෝවර් ෆෑන් එක ක්‍රියා කරයිද?', options: ['ඔව්', 'නැත', 'ඔව්, නමුත් දුර්වලයි'] },
      { id: 'q3', question: 'අසාමාන්‍ය ගඳක් තිබේද?', options: ['ඔව්, තෙත් ගඳ', 'ඔව්, පිළිස්සුණු ගඳ', 'ගඳක් නැත'] },
    ],
    categoryId: '4',
    technician: 'A/C කාර්මික',
    summary: 'ඔබගේ රෝග ලක්ෂණ වායු සමීකරණ පද්ධතියේ දෝෂයක් පෙන්නුම් කරයි.',
  },
];

const DEFAULT_PROFILE: Profile = {
  keywords: [],
  questions: [
    { id: 'q1', question: 'බලපෑමට ලක් වූ කොටස කුමක්ද?', options: ['එන්ජිම', 'රෝද / ටයර්', 'විදුලි පද්ධතිය', 'ඇතුළත / A/C'] },
    { id: 'q2', question: 'ගැටලුව මුලින්ම දුටුවේ කවදාද?', options: ['අද', 'මේ සතියේ', 'මේ මාසයේ', 'කලකට පෙර'] },
    { id: 'q3', question: 'වාහනය තවමත් සාමාන්‍ය ලෙස ධාවනය වේද?', options: ['ඔව්', 'නැත, අපහසුවෙන්', 'නැත, කිසිසේත් නැත'] },
  ],
  categoryId: '5',
  technician: 'සාමාන්‍ය කාර්මිකයා',
  summary: 'සාමාන්‍ය කාර්මිකයෙකු ඔබගේ වාහනය පරීක්ෂා කරනු ඇත.',
};

const VOICE_SAMPLES = [
  'එන්ජින් කොටසින් ගැටෙන ශබ්දයක් ධාවනය කරන විට ඇසේ.',
  'ඉදිරි ටයරය පන්චර් වෙලා ස්ටියරින් එක පැත්තකට අදිනවා.',
  'බැටරිය බැහැලා වාහනය පණගන්නේ නැහැ.',
  'එන්ජිම රත් වෙලා බොනට් එකෙන් හුමාලය එනවා.',
];

const hits = (text: string, keyword: string) =>
  /^[a-z/ ]+$/.test(keyword) ? new RegExp(`\\b${keyword.replace('/', '\\/')}\\b`).test(text) : text.includes(keyword);

function diagnose(input: string): { profile: Profile; confidence: number } {
  const text = input.toLowerCase();
  let best = DEFAULT_PROFILE;
  let bestHits = 0;
  for (const p of PROFILES) {
    const n = p.keywords.filter((k) => hits(text, k)).length;
    if (n > bestHits) {
      best = p;
      bestHits = n;
    }
  }
  return { profile: best, confidence: bestHits ? Math.min(0.95, 0.45 + bestHits * 0.2) : 0.3 };
}

/** Latin words inside Sinhala text (recording, OnGarage) are set a step larger, so they read at the same visual size as the Sinhala. */
const MixedText: React.FC<{ text: string; style: any }> = ({ text, style }) => {
  const size = StyleSheet.flatten(style)?.fontSize ?? 12;
  return (
    <Text style={style}>
      {text.split(/([A-Za-z]+)/).map((piece, i) => (i % 2 ? <Text key={i} style={{ fontSize: size * 1.2 }}>{piece}</Text> : piece))}
    </Text>
  );
};

/** One numbered step of the form: a rounded card with a step badge that turns into a tick once the step is filled in. */
const TAB_LABEL: Record<string, string> = { service: 'සේවාව', details: 'විස්තර', parts: 'කොටස්', vehicle: 'වාහනය', timer: 'කාලය' };

const ReviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.reviewRow}>
    <Text style={styles.reviewLabel}>{label}</Text>
    <Text style={styles.reviewValue}>{value}</Text>
  </View>
);

const StepCard: React.FC<{ step: number; title: string; done: boolean; hint?: string; optional?: boolean; requiredNote?: string; children: React.ReactNode }> = ({ step, title, done, hint, optional, requiredNote, children }) => (
  <View style={styles.stepCard}>
    <View style={styles.stepHead}>
      {/* The number is not needed: the progress bar shows the order, and a finished step shows a tick. */}
      {done && (
        <View style={[styles.stepBadge, styles.stepBadgeDone]}>
          <Text style={[styles.stepBadgeText, styles.stepBadgeTextDone]}>✓</Text>
        </View>
      )}
      <View style={styles.flex1}>
        <Text style={styles.stepTitle}>{title}</Text>
        {!!hint && <Text style={styles.cardSub}>{hint}</Text>}
        {!optional && !done && (
          <View style={styles.requiredPill} accessibilityLabel={done ? 'Required, done' : 'Required'}>
            <Text style={[styles.requiredText, done && styles.requiredTextDone]}>{done ? (requiredNote ? '✓ තෝරා ඇත' : '✓ අත්‍යවශ්‍ය') : requiredNote ?? '* අත්‍යවශ්‍යයි'}</Text>
          </View>
        )}
      </View>
    </View>
    {children}
  </View>
);

type BuddyMode ='idle' | 'input' | 'analyzing' | 'questions' | 'result';

interface PostJobScreenProps {
  draft: JobDraft | null;
  defaultVehicleId: string;
  onClose: () => void;
  onSubmitted: () => void;
  onOpenSOS: () => void;
}

export const PostJobScreen: React.FC<PostJobScreenProps> = ({ draft, defaultVehicleId, onClose, onSubmitted, onOpenSOS }) => {
  const user = useUserLocation();
  const { postJob } = useBids();
  const { findVehicle } = useVehicles();
  const [vehicleId, setVehicleId] = useState(draft?.vehicleId ?? defaultVehicleId);
  const [categoryId, setCategoryId] = useState<string | null>(draft?.categoryId ?? null);
  const [subService, setSubService] = useState<string | null>(null);
  const [description, setDescription] = useState(draft?.description ?? '');
  // Republishing keeps the fault details but asks for parts and timer again.
  const [sparePart, setSparePart] = useState<PartType | null>(draft?.fitting?.supply === 'owner' ? 'GarageChoice' : null);
  // Parts Fitting: the part to fit and who supplies it.
  const [fitPart, setFitPart] = useState(draft?.fitting?.partName ?? '');
  const [fitSupply, setFitSupply] = useState<PartsFitting['supply']>(draft?.fitting?.supply ?? 'owner');
  const [biddingHours, setBiddingHours] = useState<number | null>(null);
  const [doorstep, setDoorstep] = useState(false);
  // The form is five tabs, filled in this order: the service, the details, the parts and the place, the vehicle, then how long bids may come in.
  const [tab, setTab] = useState<'service' | 'vehicle' | 'details' | 'parts' | 'timer'>('service');
  const [showMap, setShowMap] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);

  const [buddy, setBuddy] = useState<BuddyMode>('idle');
  const [buddyInput, setBuddyInput] = useState('');
  const [buddyFocus, setBuddyFocus] = useState(false);
  const [listening, setListening] = useState(false);
  // While recording, the mic sends out a slow ring, so the owner sees it is listening without any extra text.
  const micPulse = useRef(new Animated.Value(0)).current;
  // The sound wave beside the mic moves while recording: bars rise and fall out of step.
  const wave = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!listening) return;
    micPulse.setValue(0);
    wave.setValue(0);
    const pulse = Animated.loop(Animated.timing(micPulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    const bars = Animated.loop(Animated.timing(wave, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    pulse.start();
    bars.start();
    return () => {
      pulse.stop();
      bars.stop();
    };
  }, [listening, micPulse, wave]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [qIndex, setQIndex] = useState(0);
  // The description box grows with its text (derived from the text, so it cannot loop): about 38 characters and one line per row.
  const descriptionH = Math.max(88, (Math.ceil(description.length / 38) + description.split('\n').length) * 21 + 32);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const buddyFloat = useRef(new Animated.Value(0)).current;

  const vehicle = findVehicle(vehicleId);
  const fitting = categoryId === PARTS_FITTING_CATEGORY_ID;
  const ORDER = ['service', 'details', 'parts', 'vehicle', 'timer'] as const;
  const tabIndex = ORDER.indexOf(tab);
  const lastTab = tabIndex === ORDER.length - 1;
  const tabDone = {
    service: categoryId !== null,
    vehicle: true,
    details: problemTold(description, voiceNotes) && (!fitting || fitPart.trim().length > 0),
    parts: sparePart !== null || (fitting && fitSupply === 'owner'),
    timer: biddingHours !== null,
  };
  // The job can be posted once every part of the form is filled in (there is no percentage any more: the five parts used to be counted as 25% each, so a
  // complete form read 125% and was never taken as complete).
  const isComplete = ORDER.every((id) => tabDone[id]);
  const firstMissing = ORDER.find((id) => !tabDone[id]);
  const next = () => setTab(ORDER[Math.min(ORDER.length - 1, tabIndex + 1)]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(buddyFloat, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(buddyFloat, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [buddyFloat]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  const analyze = (text: string) => {
    if (!text.trim()) return;
    setBuddy('analyzing');
    later(() => {
      const result = diagnose(text);
      setProfile(result.profile);
      setConfidence(result.confidence);
      setAnswers({});
      setQIndex(0);
      setBuddy('questions');
    }, 900);
  };

  const startVoice = () => {
    setListening(true);
    later(() => {
      const sample = VOICE_SAMPLES[Math.floor(Math.random() * VOICE_SAMPLES.length)];
      setBuddyInput(sample);
      setListening(false);
    }, 1800);
  };

  const closeBuddy = () => {
    setBuddy('idle');
    setProfile(null);
    setAnswers({});
    setQIndex(0);
    setBuddyInput('');
    setListening(false);
  };

  const applyRecommendation = () => {
    if (!profile) return;
    setCategoryId(profile.categoryId);
    setDescription(`${buddyInput.trim()}\n${profile.summary}\nඅවශ්‍ය කාර්මිකයා: ${profile.technician}\n(OnGarage Buddy මගින් හඳුනා ගන්නා ලදී)`);
    closeBuddy();
  };

  // The sub-service picked in the first tab is written into the job's text (the job has no field of its own for it).
  const withSub = (text: string) => (subService ? `🔧 ${subService}\n${text}` : text);

  const submit = () => {
    if (!isComplete || !categoryId || (!sparePart && !(fitting && fitSupply === 'owner')) || biddingHours === null) return;
    const fittingInfo: PartsFitting | undefined = fitting ? { partName: fitPart.trim(), supply: fitSupply } : undefined;
    postJob({
      categoryId,
      description: withSub(fittingInfo ? `${jobDescription(description)}\n🔩 සවි කළ යුතු කොටස: ${fittingInfo.partName} (${FITTING_SUPPLY.find((x) => x.id === fittingInfo.supply)?.short})` : jobDescription(description)),
      fitting: fittingInfo,
      vehicleId,
      sparePart: sparePart ?? 'GarageChoice',
      doorstep,
      biddingHours,
      address: user.address,
      coords: user.coords,
      replacesJobId: draft?.replacesJobId,
      photos,
      voiceNotes,
    });
    onSubmitted();
  };

  const recommended = profile ? SERVICE_CATEGORIES.find((c) => c.id === profile.categoryId) : null;
  // Confidence in words, not a percentage: this is a keyword match, not a measured probability.
  const confidenceWord = confidence >= 0.8 ? 'හොඳ විශ්වාසය' : confidence >= 0.5 ? 'සාධාරණ විශ්වාසය' : 'අඩු විශ්වාසය';
  const editDescription = () => {
    setBuddy('input');
    setProfile(null);
    setAnswers({});
    setQIndex(0);
  };
  const pickAnswer = (qid: string, opt: string, total: number) => {
    setAnswers((a) => ({ ...a, [qid]: opt }));
    // One question at a time: the next one comes on its own; after the last, the result.
    if (qIndex < total - 1) setQIndex(qIndex + 1);
    else setBuddy('result');
  };
  const allAnswered = profile ? profile.questions.every((q) => answers[q.id]) : false;

  // Analyse waits for something to analyse: typed text or a voice note.
  const buddyReady = buddyInput.trim().length > 0 || voiceNotes.length > 0;

  const renderBuddy = () => {
    if (buddy === 'idle') {
      return (
        <Pressable style={styles.buddyBanner} onPress={() => setBuddy('input')}>
          <Gradient stops={GRADIENTS.issue} />
          <View style={styles.rowCenter}>
            <Animated.Text style={[styles.buddyEmoji, { transform: [{ translateY: buddyFloat.interpolate({ inputRange: [0, 1], outputRange: [-2, 2] }) }] }]}>
              🤖
            </Animated.Text>
            <Text style={styles.buddyTitle}>OnBuddy සේවාව ලබාගන්න</Text>
          </View>
          <Text style={styles.buddySub}>
            ඔබගේ අලුත්වැඩියාව අයත්වන සේවා අංශය නොදනී නම්, OnBuddy ගේ සහයෙන් ඔබගේ සේවා අංශය සොයා ගන්න.
          </Text>
          <Text style={styles.buddyCta}>විස්තරය ලියන්න ›</Text>
        </Pressable>
      );
    }
    return (
      <View style={[styles.card, styles.buddyOpen]}>
        <View style={styles.rowBetween}>
          <View style={styles.rowCenter}>
            <Text style={styles.buddyEmoji}>🤖</Text>
            <Text style={[styles.buddyTitle, { color: Colors.textMain }]}>OnBuddy</Text>
          </View>
          <Pressable style={styles.buddyCollapse} onPress={closeBuddy} accessibilityLabel="Collapse OnBuddy">
            <Text style={styles.buddyCollapseText}>⌃</Text>
          </Pressable>
        </View>

        {buddy === 'input' && (
        <>
        <Text style={styles.buddyHint}>AI සහායක: විස්තරය ලියන්න, අපි සේවා අංශය යෝජනා කරමු.</Text>
        <Text style={styles.buddyExample}>උදා: "එන්ජින් ශබ්දයක්"</Text>
        {/* One input: the text on top, and one toolbar under it: the voice on the left, the analyse button on the right, the same height. */}
        <View style={[styles.buddyField, buddyFocus && styles.buddyFieldFocus]}>
          <TextInput
            style={[styles.buddyInput, NO_FOCUS_RING]}
            multiline
            autoFocus={buddy === 'input'}
            placeholder="විස්තරය මෙහි ලියන්න"
            placeholderTextColor={Colors.textSoft}
            value={buddyInput}
            onChangeText={setBuddyInput}
            onFocus={() => setBuddyFocus(true)}
            onBlur={() => setBuddyFocus(false)}
          />
          {/* The listening status has its own line, so the toolbar never has to fit it. */}
          {listening && (
            <View style={styles.listenRow}>
              <View style={styles.listenDot} />
              <Text style={styles.listenText}>සවන් දෙමින්...</Text>
            </View>
          )}
          <View style={styles.buddyToolbar}>
            <View style={styles.micWrap}>
              {listening && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.micRing,
                    {
                      transform: [{ scale: micPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }],
                      opacity: micPulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                    },
                  ]}
                />
              )}
              <Pressable
                style={[styles.micBtn, listening && styles.micBtnOn]}
                onPress={listening ? () => setListening(false) : startVoice}
                accessibilityLabel={listening ? 'Stop recording' : 'Voice input'}
              >
                <Text style={[styles.micText, listening && styles.micStop]}>{listening ? '■' : '🎙️'}</Text>
              </Pressable>
            </View>
            {listening && (
              <View style={styles.waveRow}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.waveBar,
                      {
                        transform: [
                          {
                            scaleY: wave.interpolate(
                              i % 2 === 0 ? { inputRange: [0, 0.5, 1], outputRange: [0.3, 1, 0.3] } : { inputRange: [0, 0.5, 1], outputRange: [1, 0.3, 1] }
                            ),
                          },
                        ],
                      },
                    ]}
                  />
                ))}
              </View>
            )}
            <View style={styles.flex1} />
            <Pressable style={[styles.analyzeBtn, !buddyReady && styles.analyzeOff]} disabled={!buddyReady} onPress={() => analyze(buddyInput)} accessibilityState={{ disabled: !buddyReady }}>
              {buddyReady && <Gradient stops={GRADIENTS.issue} />}
              <Text style={[styles.analyzeText, !buddyReady && { color: Colors.textSoft }]}>{buddyReady ? 'විශ්ලේෂණය කරන්න' : 'විස්තරයක් ලියන්න'}</Text>
            </Pressable>
          </View>
        </View>
        </>
        )}
        {buddy !== 'input' && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{buddyInput}</Text>
            {buddy !== 'analyzing' && (
              <Pressable style={styles.summaryEditPill} onPress={editDescription} accessibilityLabel="Edit the description">
                <Text style={styles.summaryEdit}>✎ සංස්කරණය</Text>
              </Pressable>
            )}
          </View>
        )}

        {buddy === 'analyzing' && (
          <View style={[styles.rowCenter, styles.buddyStatus]}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.hint}>OnBuddy සිතමින් පවතී...</Text>
          </View>
        )}

        {buddy === 'questions' && profile && (() => {
          const q = profile.questions[qIndex];
          const total = profile.questions.length;
          return (
            <View style={styles.questions}>
              {profile.unsafe && (
                <View style={styles.safety}>
                  <Text style={styles.safetyTitle}>⚠️ මෙම තත්ත්වයෙන් වාහනය ධාවනය කිරීම අනාරක්ෂිත විය හැක.</Text>
                  <Pressable onPress={onOpenSOS}>
                    <Text style={styles.safetyAction}>දැන්ම මාර්ග ආධාර (SOS) ලබා ගන්න →</Text>
                  </Pressable>
                </View>
              )}
              <Text style={styles.qProgress}>{`${qIndex + 1}/${total}`}</Text>
              <Text style={styles.questionText}>{q.question}</Text>
              <View style={styles.optionGrid}>
                {q.options.map((opt) => {
                  const active = answers[q.id] === opt;
                  return (
                    <Pressable key={opt} style={[styles.option, styles.optionCell, active && styles.optionActive]} onPress={() => pickAnswer(q.id, opt, total)}>
                      <Text style={[styles.optionText, active && styles.optionTextActive]}>{opt}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {qIndex > 0 && (
                <Pressable onPress={() => setQIndex(qIndex - 1)} accessibilityLabel="Previous question">
                  <Text style={styles.summaryEdit}>‹ ආපසු</Text>
                </Pressable>
              )}
            </View>
          );
        })()}

        {buddy === 'result' && profile && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>✓ OnBuddy ගේ නිර්දේශය</Text>
            <Text style={styles.resultHead}>
              {recommended?.icon} {(recommended && shortCategoryName(recommended.id)) ?? recommended?.name}
            </Text>
            <Text style={styles.resultText}>{profile.summary}</Text>
            <View style={styles.resultMeta}>
              <View style={styles.resultChip}>
                <Text style={styles.resultChipText}>{confidenceWord}</Text>
              </View>
            </View>
            {/* The technician needed gets its own line, so a long name wraps inside the card. */}
            <View style={styles.resultTech}>
              <Text style={styles.resultTechLabel}>අවශ්‍ය කාර්මිකයා</Text>
              <Text style={styles.resultTechValue}>{profile.technician}</Text>
            </View>
            {confidence < 0.5 && <Text style={[styles.hint, { color: '#92400e' }]}>තවම සම්පූර්ණයෙන් විශ්වාස නැත — ඔබගේ තේරීම සහතික කරන්න.</Text>}
          </View>
        )}
      </View>
    );
  };

  const renderMap = (style: React.ComponentProps<typeof GoogleMap>['style'], zoom: number) => (
    <GoogleMap
      style={style}
      center={user.coords}
      zoom={zoom}
      renderOverlay={(project) => (
        <>
          {MOCK_GARAGES.map((g) => {
            const p = project(g.coords);
            return p ? (
              <View key={g.id} style={[styles.pinAnchor, { left: p.x, top: p.y }]} pointerEvents="none">
                <View style={styles.garagePin}>
                  <Text style={styles.garagePinText}>🛠️</Text>
                </View>
              </View>
            ) : null;
          })}
          {(() => {
            const me = project(user.coords);
            return me ? <View style={[styles.meDot, { left: me.x, top: me.y }]} pointerEvents="none" /> : null;
          })()}
        </>
      )}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          <Pressable style={styles.topRoundBtn} onPress={onClose} accessibilityLabel="Close">
            <Text style={styles.topRoundText}>✕</Text>
          </Pressable>
          <View style={styles.topPill}>
            <View style={styles.topPillIcon}>
              <Text style={styles.topPillEmoji}>🔨</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.topPillTitle} numberOfLines={1}>{draft?.replacesJobId ? 'Ongarage රැකියාව නැවත පළ කරන්න' : 'Ongarage රැකියාව'}</Text>
              <View style={styles.topPillRow}>
                <Text style={styles.topPillCount}>{`${tabIndex + 1}/${ORDER.length}`}</Text>
                <Text style={styles.topPillSub} numberOfLines={1}>{TAB_LABEL[tab]}</Text>
              </View>
            </View>
          </View>
          <View style={styles.topSlot} />
        </View>
      </View>

      <View style={styles.postSheet}>
        <View style={styles.handle} />
        <View style={styles.progressWrap}>
          <View style={styles.progressRow}>
            {/* Coloured by position, as in the SOS flow: the steps reached are red, the rest grey (a finished step does not change the colour). */}
            {ORDER.map((id, i) => (
              <Pressable key={id} style={styles.progressSeg} onPress={() => setTab(id)} accessibilityLabel={TAB_LABEL[id]}>
                <View style={[styles.progressBar, i <= tabIndex && styles.progressBarOn]} />
              </Pressable>
            ))}
          </View>
        </View>
      <ScrollView style={styles.flex1} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {tab === 'service' && (
          <>
        {renderBuddy()}

        <StepCard step={1} title={`සේවා අංශය`} done={categoryId !== null} hint={`${SERVICE_CATEGORIES.length} අංශ`} requiredNote="පහළින් තෝරන්න">
          {/* The same tiles as the Home screen's categories. */}
          {/* Only what can be bid for: not fuel stations, not towing (those are found and booked, see the service mode). */}
          <CategoryStrip
            suggestedId={profile?.categoryId ?? null}
            include={(id) => bidSubServices(id).length > 0}
            onSelect={(c) => {
              setCategoryId(c.id);
              setSubService(null);
            }}
            selectedId={categoryId}
          />
          {/* The sub-services of the chosen category, in its colour, as in the booking form (optional). */}
          {!!categoryId && (
            <>
              <Text style={styles.eyebrow}>{`${SERVICE_CATEGORIES.find((c) => c.id === categoryId)?.name ?? ''} හි උප සේවා (විකල්ප තේරීමකි):`}</Text>
              <View style={styles.subWrap}>
                {bidSubServices(categoryId).map((sub) => {
                  const color = SERVICE_CATEGORIES.find((c) => c.id === categoryId)?.color ?? Colors.primary;
                  const on = subService === sub;
                  return (
                    <Pressable
                      key={sub}
                      style={[styles.subChip, { backgroundColor: on ? color : `${color}26`, borderColor: on ? color : `${color}8c` }]}
                      onPress={() => setSubService(on ? null : sub)}
                      accessibilityLabel={`Sub-service ${sub}`}
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={[styles.subChipText, on && styles.subChipTextOn]}>{sub}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </StepCard>

          </>
        )}
        {tab === 'vehicle' && (
          <>
        <Text style={styles.sectionHeading}>ඔබගේ වාහනය තෝරන්න</Text>
        <VehicleOptions value={vehicleId} onChange={setVehicleId} />

          </>
        )}
        {tab === 'details' && (
          <>
        <StepCard step={2} title="ගැටලුව / සේවාව විස්තර කරන්න" done={problemTold(description, voiceNotes)}>
          <TextInput
            style={[styles.textArea, { height: descriptionH }]}
            multiline
            placeholder="ඔබට අවශ්‍ය සේවාව හෝ ගැටලුව විස්තර කරන්න... (විස්තරයක් නැතිනම් හඬ සටහනක් ප්‍රමාණවත්ය)"
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
          />
          {fitting && (
            <View style={{ gap: 8 }} accessibilityLabel="Parts fitting details">
              <Text style={styles.eyebrow}>සවි කළ යුතු කොටස</Text>
              <TextInput style={styles.textArea} placeholder="උදා: ඉදිරිපස බ්‍රේක් පෑඩ් සෙට් එක" placeholderTextColor={Colors.textMuted} value={fitPart} onChangeText={setFitPart} accessibilityLabel="Part to fit" />
              <Text style={styles.eyebrow}>කොටස සපයන්නේ කවුද?</Text>
              <View style={styles.choiceGrid}>
                {FITTING_SUPPLY.map((s) => {
                  const active = fitSupply === s.id;
                  return (
                    <Pressable key={s.id} style={[styles.choice, active && styles.choiceActive]} onPress={() => setFitSupply(s.id)} accessibilityLabel={`Part supplied by ${s.id}`}>
                      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{s.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
          <Text style={styles.eyebrow}>ඡායාරූප සහ හඬ සටහන්</Text>
          <MediaAttachments photos={photos} voiceNotes={voiceNotes} onPhotos={setPhotos} onVoiceNotes={setVoiceNotes} />
        </StepCard>

          </>
        )}
        {tab === 'parts' && (
          <>
        <StepCard step={3} title="කැමති අමතර කොටස් වර්ගය" done={sparePart !== null} hint="එක් වර්ගයක් තෝරන්න">
          <View style={styles.choiceGrid}>
            {SPARE_PARTS.map((p) => {
              const active = sparePart === p.id;
              return (
                <Pressable key={p.id} style={[styles.choice, active && styles.choiceActive]} onPress={() => setSparePart(p.id)}>
                  <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {/* The chosen part type's meaning, under the options; before a choice, the general line. */}
          <Text style={styles.partHelp}>
            {sparePart ? SPARE_PARTS.find((p) => p.id === sparePart)?.help : 'කොටසේ වර්ගය අනුව මිලත්, වගකීමත් වෙනස් වේ.'}
          </Text>
        </StepCard>

        {/* The place the vehicle is repaired at: where it is, and the map to see it. */}
        <StepCard step={4} title="සේවා ස්ථානය" done optional>
          <View>
            {renderMap(styles.map, 14)}
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowMap(true)} accessibilityLabel="Open map" />
            <View style={styles.mapHint} pointerEvents="none">
              <Text style={styles.mapHintText}>⤢ විශාල කරන්න</Text>
            </View>
          </View>
          <Text style={styles.hint} numberOfLines={2}>
            📍 {user.address} · ආසන්නයේ ගරාජ {MOCK_GARAGES.length}ක්
          </Text>
        </StepCard>

        <StepCard step={5} title="පැමිණෙන ආකාරය" done optional>
          <View style={[styles.toggleRow, doorstep && styles.toggleRowOn]}>
            <GlassIcon emoji="🚛" small />
            <View style={styles.flex1}>
              <Text style={styles.cardTitle}>නිවසටම පැමිණ රැගෙන යාම</Text>
              <Text style={styles.cardSub}>ගරාජයෙන් පැමිණ වාහනය රැගෙන ගොස් අලුත්වැඩියා කර නැවත ගෙනැවිත් දෙයි.</Text>
            </View>
            <Switch value={doorstep} onValueChange={setDoorstep} trackColor={{ false: Colors.subtleBorder, true: '#1a73e8' }} accessibilityLabel="Collect from my home" />
          </View>
        </StepCard>

          </>
        )}
        {tab === 'timer' && (
          <>
        <StepCard step={5} title="⏱️ ලංසු කාලය" done={biddingHours !== null}>
          {/* The chosen time leads, large, above the quick picks and the slider. Before a choice it is a muted prompt, not a value. */}
          <View style={styles.timerHead}>
            <Text style={styles.cardSub}>ලංසු ලැබෙන කාලය</Text>
            <Text style={[styles.timerBig, biddingHours === null && styles.timerPrompt]}>{biddingHours === null ? 'තෝරන්න' : `පැය ${biddingHours}`}</Text>
          </View>
          <View style={styles.quickRow}>
            {[1, 3, 6, 12, 24].map((h) => (
              <Pressable key={h} style={[styles.quickChip, biddingHours === h && styles.quickChipOn]} onPress={() => setBiddingHours(h)} accessibilityLabel={`${h} hours`}>
                <Text style={[styles.quickText, biddingHours === h && styles.quickTextOn]}>{`${h} පැය`}</Text>
              </Pressable>
            ))}
          </View>
          <Slider min={1} max={24} value={biddingHours} onChange={setBiddingHours} />
          <View style={styles.rowBetween}>
            <Text style={styles.scaleText}>පැය 1</Text>
            <Text style={styles.scaleText}>පැය 24</Text>
          </View>
          {/* What the time means: garages bid inside it, and bids stop when it ends. */}
          <Text style={styles.timerNote}>ගරාජ මෙම කාලය තුළ ලංසු යවයි; කාලය අවසන් වූ පසු ලංසු පිළිගන්නේ නැත.</Text>
        </StepCard>

        {/* The whole job at a glance before it is posted: the owner checks it once. */}
        <View style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>ඔබේ රැකියාව</Text>
          <ReviewRow label="සේවාව" value={(categoryId && shortCategoryName(categoryId)) || '—'} />
          <ReviewRow label="වාහනය" value={vehicle ? `${vehicle.name} · ${vehicle.registrationNo || vehicle.plate}` : '—'} />
          <ReviewRow label="කොටස" value={sparePart ? SPARE_PARTS.find((p) => p.id === sparePart)?.label ?? '—' : fitting ? 'සවි කිරීම' : '—'} />
          <ReviewRow label="ලංසු කාලය" value={biddingHours === null ? '—' : `පැය ${biddingHours}`} />
        </View>
          </>
        )}
      </ScrollView>
      </View>

      <View style={styles.footer}>
        {buddy === 'result' && profile && recommended ? (
          <ActionButton label="මෙම සේවාව භාවිතා කරන්න" variant="primary" onPress={applyRecommendation} />
        ) : lastTab ? (
          <ActionButton
            label={isComplete ? 'ඊළඟ: රැකියාව ගරාජ වෙත යොමු කරන්න →' : 'ඉතිරි තොරතුරු සම්පූර්ණ කරන්න ›'}
            variant="primary"
            // Always pressable: with something missing it takes the owner to the first part that still needs filling in.
            onPress={() => (isComplete ? submit() : firstMissing && setTab(firstMissing))}
            />
        ) : (
          <ActionButton
            label={tabDone[tab] ? 'ඊළඟ ›' : tab === 'service' ? 'සේවා අංශයක් තෝරන්න' : 'අවශ්‍ය තොරතුරු පුරවන්න'}
            variant="primary"
            disabled={!tabDone[tab]}
            onPress={next}
          />
        )}
      </View>

      <Modal visible={showMap} transparent animationType="fade" onRequestClose={() => setShowMap(false)}>
        <View style={styles.mapBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowMap(false)} />
          <View style={styles.mapWindow}>
            <View style={styles.mapWindowHead}>
              <Text style={styles.mapWindowTitle}>📍 සේවා ස්ථානය</Text>
              <Pressable style={styles.closeBtnDark} onPress={() => setShowMap(false)} accessibilityLabel="Close map">
                <Text style={styles.closeTextDark}>✕</Text>
              </Pressable>
            </View>
            {renderMap(styles.mapBig, 15)}
            <Text style={styles.hint} numberOfLines={2}>
              {user.address} · ආසන්නයේ ගරාජ {MOCK_GARAGES.length}ක්
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Soft shadow in place of an outline, like Home and the other tabs.
// Day theme: cards and fields get a visible edge so they stand out clearly on the light page.
const isDay = () => getThemeMode() !== 'dark';
// The browser draws its own focus ring on text fields; the field's blue border replaces it.
const NO_FOCUS_RING = { outlineStyle: 'none' } as unknown as TextStyle;
const cardEdge = () => (isDay() ? '#cfd8e3' : Colors.borderColor);
const fieldFill = () => (isDay() ? '#f4f7fb' : Colors.subtleFill);
const fieldEdge = () => (isDay() ? '#b9c6d6' : 'transparent');
const SOFT_SHADOW = { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 } as const;

const styles = themedStyles(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: pageBg() },
  postSheet: { flex: 1, marginTop: -24, backgroundColor: pageBg(), borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', shadowColor: '#3c4043', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 8 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder, marginTop: 10 },
  flex1: { flex: 1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  header: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    overflow: 'hidden',
    paddingTop: 12,
    // The same room under the pill as the SOS band: the sheet rises about 42px below it.
    paddingBottom: 68,
    // The SOS band's red (#7f1d1d: saturation 63%, lightness 31%) carried over to blue, at the same saturation and lightness.
    backgroundColor: '#1d367f',
  },
  headerTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: '#fff', lineHeight: 21 },
  headerSub: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: '#dbeafe', marginTop: 2 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topRoundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center' },
  topRoundText: { fontSize: 16, fontWeight: '700', color: Colors.textMain },
  topSlot: { width: 46 },
  topPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard },
  topPillIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: getThemeMode() === 'dark' ? 'rgba(59, 130, 246, 0.18)' : '#dbeafe', justifyContent: 'center', alignItems: 'center' },
  topPillEmoji: { fontSize: 18 },
  topPillTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
  topPillRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  topPillCount: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: '#1d4ed8', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#dbeafe' },
  topPillSub: { flexShrink: 1, fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textSoft },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: { fontSize: 14, color: '#fff' },
  progressTrack: { height: 6, marginHorizontal: 6, marginTop: 12, borderRadius: 3, overflow: 'hidden', backgroundColor: isDay() ? '#d5dde8' : Colors.subtleBorder },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: Colors.primary },
  body: { paddingHorizontal: 6, paddingTop: 10, gap: 10, paddingBottom: 20 },
  subWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  subChip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  subChipText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
  subChipTextOn: { color: '#ffffff' },
  eyebrow: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? Colors.textMuted : '#475569', letterSpacing: 0.2 },
  changePill: { paddingHorizontal: 12, height: 30, borderRadius: 8, justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
  changePillText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  stepCard: { backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: outline(), ...elevation1(), padding: 16, gap: 12 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  stepBadgeDone: { backgroundColor: '#1a73e8' },
  stepBadgeText: { fontSize: 17, fontFamily: FONTS.titleBold, color: '#ffffff' },
  stepBadgeTextDone: { color: '#ffffff', fontSize: 18 },
  stepTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
  timerHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  timerBig: { fontSize: 22, fontFamily: FONTS.titleBold, color: Colors.textMain },
  timerPrompt: { fontSize: 18, color: Colors.textSoft },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: { paddingHorizontal: 14, height: 36, borderRadius: 18, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard, justifyContent: 'center' },
  quickChipOn: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  quickText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
  quickTextOn: { color: '#ffffff' },
  timerNote: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 18 },
  reviewCard: { padding: 16, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: '#bfdbfe', gap: 8 },
  reviewTitle: { fontSize: 14, fontFamily: FONTS.titleBold, color: '#1d4ed8' },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  reviewLabel: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textSoft },
  reviewValue: { flexShrink: 1, fontSize: 13.5, fontFamily: FONTS.bodyBold, color: Colors.textMain, textAlign: 'right' },
  scaleText: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
  sectionHeading: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain, marginBottom: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 8, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
  toggleRowOn: { borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
  // Same heading style as the Home screen's sections.
  sectionLabel: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary, letterSpacing: 0.2, marginTop: 6 },
  // A mandatory field: a tinted pill with an asterisk, which turns into a green tick once the step is filled in.
  requiredPill: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, backgroundColor: getThemeMode() === 'dark' ? 'rgba(245, 158, 11, 0.16)' : '#fef3c7', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(245, 158, 11, 0.4)' : '#f59e0b' },
  requiredPillDone: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(59, 130, 246, 0.18)' : '#dbeafe', borderColor: '#1a73e8' },
  requiredText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? Colors.warning : '#92400e' },
  requiredTextDone: { color: getThemeMode() === 'dark' ? '#93c5fd' : '#1d4ed8' },
  hint: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
  card: { backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: outline(), ...elevation1(), padding: 16, gap: 12 },
  cardActive: { borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
  cardTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
  cardSub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
  link: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.primary },

  buddyBanner: { borderRadius: 12, padding: 16, gap: 8, overflow: 'hidden', backgroundColor: '#0369a1' },
  buddyOpen: { borderColor: 'rgba(56, 189, 248, 0.5)', backgroundColor: 'rgba(14, 165, 233, 0.08)' },
  buddyEmoji: { fontSize: 22 },
  buddyTitle: { fontSize: 14, fontFamily: FONTS.bodyBold, color: '#fff', letterSpacing: 0.3 },
  buddyCta: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.2)', fontSize: 13, fontFamily: FONTS.bodyBold, color: '#fff' },
  buddySub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: '#ffffff', lineHeight: 19 },
  pill: { paddingHorizontal: 12, height: 28, justifyContent: 'center', borderRadius: 8, backgroundColor: Colors.subtleFill },
  pillText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
  buddyField: { position: 'relative', borderWidth: 1.5, borderColor: '#bfdbfe', borderRadius: 14, padding: 10, minHeight: 120, backgroundColor: Colors.bgCard },
  buddyExample: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, marginTop: -4 },
  buddyToolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  // The toolbar's two actions keep their size; the spacer takes the rest, so nothing can push the button out of the box.
  micWrap: { width: 40, height: 40, flexShrink: 0, justifyContent: 'center', alignItems: 'center' },
  micRing: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239, 68, 68, 0.35)' },
  micStop: { fontSize: 14, color: Colors.error },
  waveRow: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 24 },
  waveBar: { width: 3, height: 22, borderRadius: 2, backgroundColor: Colors.error },
  listenRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  listenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error },
  listenText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
  analyzeOff: { backgroundColor: Colors.subtleBorder },
  buddyFieldFocus: { borderColor: '#1a73e8' },
  buddyCollapse: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(100, 116, 139, 0.14)' },
  buddyCollapseText: { fontSize: 18, fontFamily: FONTS.bodyBold, color: Colors.textMain },
  progressWrap: { gap: 6, paddingHorizontal: 4, marginBottom: 8 },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressSeg: { flex: 1, paddingVertical: 6 },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: Colors.subtleBorder },
  progressBarOn: { backgroundColor: '#1a73e8' },
  progressText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft, textAlign: 'center' },
  buddyInputRoom: { minHeight: 72 },
  buddyInput: { minHeight: 56, color: Colors.textMain, fontSize: 14, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top', paddingVertical: 4 },
  micBtn: { width: 40, height: 40, borderRadius: 20, ...glassStyle(), justifyContent: 'center', alignItems: 'center' },
  micBtnOn: { backgroundColor: 'rgba(239, 68, 68, 0.35)', borderColor: Colors.error },
  micText: { fontSize: 17 },
  buddyHint: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 18 },
  qProgress: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionCell: { width: '48%', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  summaryBox: { borderRadius: 14, padding: 12, gap: 6, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: '#bfdbfe' },
  summaryText: { fontSize: 14, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 20 },
  summaryEdit: { fontSize: 13, fontFamily: FONTS.bodyBold, color: '#1d4ed8' },
  summaryEditPill: { alignSelf: 'flex-end', minHeight: 36, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 18, borderWidth: 1, borderColor: '#93c5fd', backgroundColor: '#eff6ff' },
  resultHead: { fontSize: 22, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
  resultMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  analyzeBtn: { flexShrink: 0, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, overflow: 'hidden' },
  analyzeText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#fff' },
  buddyStatus: { paddingTop: 4 },
  questions: { gap: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: { paddingHorizontal: 8, height: 20, justifyContent: 'center', borderRadius: 6, backgroundColor: Colors.subtleFill },
  metaChipText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
  safety: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.error, backgroundColor: getThemeMode() === 'dark' ? 'rgba(239, 68, 68, 0.12)' : '#fce8e6', gap: 4 },
  safetyTitle: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
  safetyAction: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: Colors.errorText, textDecorationLine: 'underline' },
  question: { gap: 6 },
  questionText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
  option: { paddingHorizontal: 14, height: 32, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard },
  optionActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  optionText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
  optionTextActive: { color: '#ffffff' },
  // A light card with a green edge: dark text on white reads clearly, where white on green did not.
  resultCard: { borderRadius: 14, padding: 16, gap: 8, overflow: 'hidden', backgroundColor: Colors.bgCard, borderWidth: 1.5, borderColor: '#93c5fd' },
  resultTitle: { fontSize: 14, fontFamily: FONTS.titleBold, color: '#1d4ed8' },
  resultText: { fontSize: 13.5, lineHeight: 20, fontFamily: FONTS.bodyRegular, color: Colors.textMain },
  resultChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#dbeafe' },
  resultTech: { gap: 2 },
  resultTechLabel: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
  resultTechValue: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.textMain, lineHeight: 20 },
  resultChipText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: '#1e3a8a' },
  resultLabel: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: 'rgba(255, 255, 255, 0.75)' },
  resultValue: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#fff', flexShrink: 1, textAlign: 'right' },
  resultBtn: { marginTop: 4, paddingVertical: 11, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.22)' },
  resultBtnText: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: '#fff' },

  grid: { gap: 10, paddingRight: 6 },
  gridCol: { gap: 6 },
  gridItem: { width: 64, alignItems: 'center', gap: 2 },
  // No box: the artwork stands on the page; the chosen category sits on a soft sky-blue disc.
  tile: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center' },
  tileActive: { backgroundColor: 'rgba(76, 161, 209, 0.22)', borderWidth: 2, borderColor: Colors.primary },
  tileLabel: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center', lineHeight: 16, minHeight: 32 },
  tileLabelActive: { color: Colors.primary, fontFamily: FONTS.bodyBold },

  textArea: { minHeight: 88, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), borderRadius: 8, padding: 16, color: Colors.textMain, fontSize: 14, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top' },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { width: '48.5%', flexGrow: 1, height: 44, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard, alignItems: 'center' },
  choiceActive: { borderWidth: 1, borderColor: '#1d4ed8', backgroundColor: '#1d4ed8' },
  choiceText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
  choiceTextActive: { color: '#ffffff', fontFamily: FONTS.bodyBold },
  partHelp: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 18 },
  map: { height: 72, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: outline() },
  mapBig: { height: 360, borderRadius: 12, overflow: 'hidden' },
  mapHint: { position: 'absolute', right: 8, bottom: 8, paddingHorizontal: 10, height: 24, borderRadius: 12, justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.7)' },
  mapHintText: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: '#fff' },
  mapBackdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: 'rgba(6, 12, 30, 0.55)' },
  mapWindow: { gap: 12, padding: 16, borderRadius: 28, backgroundColor: Colors.bgCard },
  mapWindowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mapWindowTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
  closeBtnDark: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.subtleFill },
  closeTextDark: { fontSize: 14, color: Colors.textMain },
  pinAnchor: { position: 'absolute', transform: [{ translateX: '-50%' }, { translateY: '-50%' }] },
  garagePin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  garagePinText: { fontSize: 11 },
  meDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    marginLeft: -8,
    marginTop: -8,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: '#fff',
  },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: Colors.subtleBorder, justifyContent: 'center', alignItems: 'center' },
  checkOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkMark: { fontSize: 12, fontWeight: '900', color: Colors.bgDark },
  timerValue: { paddingHorizontal: 12, height: 26, justifyContent: 'center', borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
  timerValueText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  footer: { padding: 16, paddingTop: 12, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: outline(), shadowColor: '#3c4043', shadowOffset: { width: 0, height: -1 }, shadowOpacity: getThemeMode() === 'dark' ? 0.4 : 0.12, shadowRadius: 3, elevation: 4 },
}));
