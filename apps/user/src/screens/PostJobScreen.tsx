import { CategoryStrip } from '../components/home/CategoryStrip';
import { VehicleLine } from '@ongarage/shared';
import { elevation1, outline, pageBg } from '../utils/material';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, getThemeMode, themedStyles } from '@ongarage/shared';
import { FONTS } from '@ongarage/shared';
import { MOCK_GARAGES } from '../constants/mockData';
import { FITTING_SUPPLY, PARTS_FITTING_CATEGORY_ID, SERVICE_CATEGORIES, type PartsFitting, type PartType } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { VehiclePicker } from '../components/Header';
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
  technician: 'සාමාන්‍ය යාන්ත්‍රිකයා',
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

/** One numbered step of the form: a rounded card with a step badge that turns into a tick once the step is filled in. */
const StepCard: React.FC<{ step: number; title: string; done: boolean; hint?: string; optional?: boolean; children: React.ReactNode }> = ({ step, title, done, hint, optional, children }) => (
  <View style={styles.stepCard}>
    <View style={styles.stepHead}>
      <View style={[styles.stepBadge, done && styles.stepBadgeDone]}>
        <Text style={[styles.stepBadgeText, done && styles.stepBadgeTextDone]}>{done ? '✓' : step}</Text>
      </View>
      <View style={styles.flex1}>
        <Text style={styles.stepTitle}>{title}</Text>
        {!!hint && <Text style={styles.cardSub}>{hint}</Text>}
      </View>
      {!done && !optional && <Text style={styles.required}>අවශ්‍යයි</Text>}
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
  const [description, setDescription] = useState(draft?.description ?? '');
  // Republishing keeps the fault details but asks for parts and timer again.
  const [sparePart, setSparePart] = useState<PartType | null>(draft?.fitting?.supply === 'owner' ? 'GarageChoice' : null);
  // Parts Fitting: the part to fit and who supplies it.
  const [fitPart, setFitPart] = useState(draft?.fitting?.partName ?? '');
  const [fitSupply, setFitSupply] = useState<PartsFitting['supply']>(draft?.fitting?.supply ?? 'owner');
  const [biddingHours, setBiddingHours] = useState<number | null>(null);
  const [doorstep, setDoorstep] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const vehicleRef = useRef<View>(null);

  const [buddy, setBuddy] = useState<BuddyMode>('idle');
  const [buddyInput, setBuddyInput] = useState('');
  const [listening, setListening] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const buddyFloat = useRef(new Animated.Value(0)).current;

  const vehicle = findVehicle(vehicleId);
  const fitting = categoryId === PARTS_FITTING_CATEGORY_ID;
  const essentials = [categoryId !== null, description.trim().length > 0, sparePart !== null || (fitting && fitSupply === 'owner'), biddingHours !== null, !fitting || fitPart.trim().length > 0];
  const percent = essentials.filter(Boolean).length * 25;
  const isComplete = percent === 100;

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: percent, duration: 350, useNativeDriver: false }).start();
  }, [percent, progressAnim]);

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
      setBuddy('questions');
    }, 900);
  };

  const startVoice = () => {
    setListening(true);
    later(() => {
      const sample = VOICE_SAMPLES[Math.floor(Math.random() * VOICE_SAMPLES.length)];
      setBuddyInput(sample);
      setListening(false);
      analyze(sample);
    }, 1800);
  };

  const closeBuddy = () => {
    setBuddy('idle');
    setProfile(null);
    setAnswers({});
    setBuddyInput('');
    setListening(false);
  };

  const applyRecommendation = () => {
    if (!profile) return;
    setCategoryId(profile.categoryId);
    setDescription(`${buddyInput.trim()}\n${profile.summary} (OnGarage Buddy මගින් හඳුනා ගන්නා ලදී)`);
    closeBuddy();
  };

  const submit = () => {
    if (!isComplete || !categoryId || (!sparePart && !(fitting && fitSupply === 'owner')) || biddingHours === null) return;
    const fittingInfo: PartsFitting | undefined = fitting ? { partName: fitPart.trim(), supply: fitSupply } : undefined;
    postJob({
      categoryId,
      description: fittingInfo ? `${description.trim()}\n🔩 සවි කළ යුතු කොටස: ${fittingInfo.partName} (${FITTING_SUPPLY.find((x) => x.id === fittingInfo.supply)?.short})` : description.trim(),
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
  const allAnswered = profile ? profile.questions.every((q) => answers[q.id]) : false;

  const renderBuddy = () => {
    if (buddy === 'idle') {
      return (
        <Pressable style={styles.buddyBanner} onPress={() => setBuddy('input')}>
          <Gradient stops={GRADIENTS.issue} />
          <View style={styles.rowCenter}>
            <Animated.Text style={[styles.buddyEmoji, { transform: [{ translateY: buddyFloat.interpolate({ inputRange: [0, 1], outputRange: [-2, 2] }) }] }]}>
              🤖
            </Animated.Text>
            <Text style={styles.buddyTitle}>ONGARAGE BUDDY ගෙන් අසන්න</Text>
          </View>
          <Text style={styles.buddySub}>
            ඔබගේ වාහනයේ ඇති ගැටලුව පවසන්න. Buddy බුද්ධිමත් ප්‍රශ්න කිහිපයක් අසා ඔබට ගැලපෙන සේවාව සොයා දෙනු ඇත.
          </Text>
        </Pressable>
      );
    }
    return (
      <View style={[styles.card, styles.buddyOpen]}>
        <View style={styles.rowBetween}>
          <View style={styles.rowCenter}>
            <Text style={styles.buddyEmoji}>🤖</Text>
            <Text style={[styles.buddyTitle, { color: Colors.textMain }]}>ONGARAGE BUDDY</Text>
          </View>
          <Pressable style={styles.pill} onPress={closeBuddy}>
            <Text style={styles.pillText}>වසන්න</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.buddyInput}
          multiline
          autoFocus={buddy === 'input'}
          placeholder='උදා: "ධාවනය කරන විට එන්ජින් කොටසින් ගැටෙන ශබ්දයක් ඇසේ"'
          placeholderTextColor={Colors.textMuted}
          value={buddyInput}
          onChangeText={setBuddyInput}
        />
        <View style={styles.rowBetween}>
          <Pressable style={[styles.micBtn, listening && styles.micBtnOn]} onPress={listening ? () => setListening(false) : startVoice}>
            <Text style={styles.micText}>🎙️</Text>
          </Pressable>
          {listening && (
            <View style={styles.rowCenter}>
              <ActivityIndicator size="small" color={Colors.error} />
              <Text style={[styles.hint, { color: Colors.errorText }]}>සවන් දෙමින්...</Text>
            </View>
          )}
          <Pressable style={styles.analyzeBtn} onPress={() => analyze(buddyInput)}>
            <Gradient stops={GRADIENTS.issue} />
            <Text style={styles.analyzeText}>විශ්ලේෂණය කරන්න</Text>
          </Pressable>
        </View>

        {buddy === 'analyzing' && (
          <View style={[styles.rowCenter, styles.buddyStatus]}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.hint}>OnGarage Buddy සිතමින් පවතී...</Text>
          </View>
        )}

        {buddy === 'questions' && profile && (
          <View style={styles.questions}>
            <View style={styles.chipRow}>
              <View style={[styles.metaChip, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Text style={[styles.metaChipText, { color: Colors.primary }]}>
                  {recommended?.icon} {recommended?.name}
                </Text>
              </View>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>Offline ගැලපීම · {Math.round(confidence * 100)}% විශ්වාසයි</Text>
              </View>
            </View>
            {confidence < 0.5 && <Text style={[styles.hint, { color: Colors.warning }]}>තවම සම්පූර්ණයෙන් විශ්වාස නැත — ඔබගේ පිළිතුරු මගින් එය නිවැරදි වනු ඇත.</Text>}
            {profile.unsafe && (
              <View style={styles.safety}>
                <Text style={styles.safetyTitle}>⚠️ මෙම තත්ත්වයෙන් වාහනය ධාවනය කිරීම අනාරක්ෂිත විය හැක.</Text>
                <Pressable onPress={onOpenSOS}>
                  <Text style={styles.safetyAction}>දැන්ම මාර්ග ආධාර (SOS) ලබා ගන්න →</Text>
                </Pressable>
              </View>
            )}
            {profile.questions.map((q, i) => (
              <View key={q.id} style={styles.question}>
                <Text style={styles.questionText}>
                  {i + 1}. {q.question}
                </Text>
                <View style={styles.chipRow}>
                  {q.options.map((opt) => {
                    const active = answers[q.id] === opt;
                    return (
                      <Pressable key={opt} style={[styles.option, active && styles.optionActive]} onPress={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}>
                        <Text style={[styles.optionText, active && styles.optionTextActive]}>{opt}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
            <ActionButton label="නිර්දේශිත සේවාව ලබා ගන්න" variant="primary" disabled={!allAnswered} onPress={() => setBuddy('result')} />
          </View>
        )}

        {buddy === 'result' && profile && (
          <View style={styles.resultCard}>
            <Gradient stops={GRADIENTS.brand} />
            <Text style={styles.resultTitle}>✓ Buddy ගේ නිර්දේශය</Text>
            <Text style={styles.resultText}>{profile.summary}</Text>
            <View style={styles.rowBetween}>
              <Text style={styles.resultLabel}>නිර්දේශිත සේවාව</Text>
              <Text style={styles.resultValue}>
                {recommended?.icon} {recommended?.name}
              </Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.resultLabel}>අවශ්‍ය කාර්මිකයා</Text>
              <Text style={styles.resultValue}>{profile.technician}</Text>
            </View>
            <Pressable style={styles.resultBtn} onPress={applyRecommendation}>
              <Text style={styles.resultBtnText}>මෙම සේවාව භාවිතා කරන්න</Text>
            </Pressable>
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
        <Gradient stops={GRADIENTS.bid} />
        <GlassIcon emoji="🔨" small />
        <View style={styles.flex1}>
          <Text style={styles.headerTitle}>{draft?.replacesJobId ? 'රැකියාව නැවත පළ කරන්න' : 'අලුත්වැඩියා රැකියාවක් පළ කරන්න'}</Text>
          <Text style={styles.headerSub}>රැකියා විස්තර · {percent}% සම්පූර්ණයි</Text>
        </View>
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
      </View>

      <ScrollView style={styles.flex1} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable ref={vehicleRef} style={[styles.card, styles.rowCenter]} onPress={() => setShowVehiclePicker(true)}>
          <GlassIcon emoji="🚗" />
          <View style={styles.flex1}>
            <Text style={styles.eyebrow}>තෝරාගත් වාහනය</Text>
            <VehicleLine vehicle={vehicle} textStyle={styles.cardTitle} />
          </View>
          <View style={styles.changePill}>
            <Text style={styles.changePillText}>වෙනස් කරන්න</Text>
          </View>
        </Pressable>

        {renderBuddy()}

        <StepCard step={1} title={`සේවා අංශය`} done={categoryId !== null} hint={`${SERVICE_CATEGORIES.length} අංශ`}>
          {/* The same tiles as the Home screen's categories. */}
          <CategoryStrip onSelect={(c) => setCategoryId(c.id)} selectedId={categoryId} />
        </StepCard>

        <StepCard step={2} title="ගැටලුව / සේවාව විස්තර කරන්න" done={description.trim().length > 0}>
          <TextInput
            style={styles.textArea}
            multiline
            placeholder="ඔබට අවශ්‍ය සේවාව හෝ ගැටලුව විස්තර කරන්න..."
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
          <Text style={styles.eyebrow}>ඡායාරූප සහ හඬ සටහන් (විකල්ප)</Text>
          <MediaAttachments photos={photos} voiceNotes={voiceNotes} onPhotos={setPhotos} onVoiceNotes={setVoiceNotes} />
        </StepCard>

        <StepCard step={3} title="කැමති අමතර කොටස් වර්ගය" done={sparePart !== null}>
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
        </StepCard>

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
          <Pressable style={[styles.toggleRow, doorstep && styles.toggleRowOn]} onPress={() => setDoorstep((d) => !d)}>
            <GlassIcon emoji="🚛" small />
            <View style={styles.flex1}>
              <Text style={styles.cardTitle}>නිවසටම පැමිණ රැගෙන යාම</Text>
              <Text style={styles.cardSub}>අපි ඔබගේ වාහනය රැගෙන ගොස් අලුත්වැඩියා කර නැවත ඔබ වෙත ගෙනැවිත් දෙන්නෙමු.</Text>
            </View>
            <View style={[styles.check, doorstep && styles.checkOn]}>{doorstep && <Text style={styles.checkMark}>✓</Text>}</View>
          </Pressable>
        </StepCard>

        <StepCard step={5} title="⏱️ ලංසු කාලය" done={biddingHours !== null} hint="උපරිම පැය 24">
          <Slider min={1} max={24} value={biddingHours} onChange={setBiddingHours} />
          <View style={styles.rowBetween}>
            <Text style={styles.cardSub}>පැය 1</Text>
            <View style={styles.timerValue}>
              <Text style={styles.timerValueText}>{biddingHours === null ? 'තෝරන්න' : `පැය ${biddingHours}`}</Text>
            </View>
            <Text style={styles.cardSub}>පැය 24</Text>
          </View>
        </StepCard>
      </ScrollView>

      <View style={styles.footer}>
        <ActionButton
          label={isComplete ? 'ඊළඟ: රැකියාව ගරාජ වෙත යොමු කරන්න →' : `${percent}% — අවශ්‍ය ක්ෂේත්‍ර සම්පූර්ණ කරන්න`}
          variant="primary"
          disabled={!isComplete}
          onPress={submit}
        />
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
      <VehiclePicker
        visible={showVehiclePicker}
        activeVehicle={vehicleId}
        anchorRef={vehicleRef}
        onSelect={setVehicleId}
        onClose={() => setShowVehiclePicker(false)}
      />
    </SafeAreaView>
  );
};

// Soft shadow in place of an outline, like Home and the other tabs.
// Day theme: cards and fields get a visible edge so they stand out clearly on the light page.
const isDay = () => getThemeMode() !== 'dark';
const cardEdge = () => (isDay() ? '#cfd8e3' : Colors.borderColor);
const fieldFill = () => (isDay() ? '#f4f7fb' : Colors.subtleFill);
const fieldEdge = () => (isDay() ? '#b9c6d6' : 'transparent');
const SOFT_SHADOW = { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 3 } as const;

const styles = themedStyles(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: pageBg() },
  flex1: { flex: 1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    overflow: 'hidden',
    paddingTop: 14,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: '#fff' },
  headerSub: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: '#93c5fd' },
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
  eyebrow: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.3 },
  changePill: { paddingHorizontal: 12, height: 30, borderRadius: 8, justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
  changePillText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  stepCard: { backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: outline(), ...elevation1(), padding: 16, gap: 12 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  stepBadgeDone: { backgroundColor: Colors.success },
  stepBadgeText: { fontSize: 17, fontFamily: FONTS.titleBold, color: '#ffffff' },
  stepBadgeTextDone: { color: '#ffffff', fontSize: 18 },
  stepTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 8, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
  toggleRowOn: { borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
  // Same heading style as the Home screen's sections.
  sectionLabel: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.primary, letterSpacing: 0.2, marginTop: 6 },
  required: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.warning, marginTop: 4 },
  hint: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
  card: { backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: outline(), ...elevation1(), padding: 16, gap: 12 },
  cardActive: { borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
  cardTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
  cardSub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
  link: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.primary },

  buddyBanner: { borderRadius: 12, padding: 16, gap: 8, overflow: 'hidden', backgroundColor: '#0ea5e9' },
  buddyOpen: { borderColor: 'rgba(56, 189, 248, 0.5)', backgroundColor: 'rgba(14, 165, 233, 0.08)' },
  buddyEmoji: { fontSize: 22 },
  buddyTitle: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: '#fff', letterSpacing: 0.5 },
  buddySub: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 17 },
  pill: { paddingHorizontal: 12, height: 28, justifyContent: 'center', borderRadius: 8, backgroundColor: Colors.subtleFill },
  pillText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
  buddyInput: { minHeight: 56, color: Colors.textMain, fontSize: 14, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top', paddingVertical: 4 },
  micBtn: { width: 40, height: 40, borderRadius: 20, ...glassStyle(), justifyContent: 'center', alignItems: 'center' },
  micBtnOn: { backgroundColor: 'rgba(239, 68, 68, 0.35)', borderColor: Colors.error },
  micText: { fontSize: 17 },
  analyzeBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, overflow: 'hidden' },
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
  optionActive: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
  optionText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
  optionTextActive: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
  resultCard: { borderRadius: 12, padding: 16, gap: 8, overflow: 'hidden', backgroundColor: '#059669' },
  resultTitle: { fontSize: 14, fontFamily: FONTS.titleBold, color: '#fff' },
  resultText: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: 'rgba(255, 255, 255, 0.9)' },
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
  tileLabel: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center', lineHeight: 14, minHeight: 28 },
  tileLabelActive: { color: Colors.primary, fontFamily: FONTS.bodyBold },

  textArea: { minHeight: 88, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), borderRadius: 8, padding: 16, color: Colors.textMain, fontSize: 14, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top' },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { width: '48.5%', flexGrow: 1, height: 44, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard, alignItems: 'center' },
  choiceActive: { borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
  choiceText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
  choiceTextActive: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8', fontFamily: FONTS.bodyBold },
  map: { height: 96, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: outline() },
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
