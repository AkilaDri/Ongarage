import { GarageHistoryTag, GarageLastLine } from './GarageHistory';
import { jobDescription, problemTold } from '../utils/jobText';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  categoryInfo,
  Colors,
  FONTS,
  getAi,
  getThemeMode,
  Icon,
  marketPrice,
  SERVICE_CATEGORIES,
  SUGGEST_MIN_CONFIDENCE,
  themedStyles,
  vehicleIcon,
  FITTING_SUPPLY,
  garageSubServices,
  PARTS_FITTING_CATEGORY_ID,
  type Garage,
  type PartsFitting,
  type VoiceNote,
} from '@ongarage/shared';
import { elevation1, outline } from '../utils/material';
import { BookingShell } from './BookingShell';
import { FlowButton } from './FlowButton';
import { FlowField } from './FlowField';
import { DayStep, TimeStep } from './BidBookingSteps';
import { GARAGE_COVERS } from '../constants/home';
import { garageCategoryIds, garageTickedSubs } from '../constants/garageSubServices';
import type { AppliedOffer } from '../types';
import { CategoryStrip } from './home/CategoryStrip';
import { slotIsPast, slotTime } from './SlotPicker';
import { MediaAttachments } from './MediaAttachments';
import { VehicleOptions } from './VehicleOptions';
import { useVehicles } from '../context/VehiclesContext';
import { useBookings } from '../context/BookingsContext';
import { formatDate, formatTime, money } from '../utils/format';

const HOUR = 60 * 60 * 1000;

/**
 * Book a garage directly (no bidding): what's wrong, when, and whether the garage comes
 * to you. The garage gets it as a direct request and must answer within 2 hours.
 */
/**
 * What the owner sees when the booking request has gone: not a window but a message box that pops up in the middle of the screen, over the garage's profile. It says the
 * request was sent, when the garage answers, and points to the Activity tab where the answer shows.
 */
export const BookingSentBox: React.FC<{ visible: boolean; garageName: string; when: string; onViewActivity: () => void; onClose: () => void }> = ({ visible, garageName, when, onViewActivity, onClose }) => (
  !visible ? null : (
    <View style={sentStyles.backdrop}>
      <View style={sentStyles.box} accessibilityLabel="Booking sent">
        <Pressable style={sentStyles.close} onPress={onClose} hitSlop={10} accessibilityLabel="Close booking message">
          <Text style={sentStyles.closeText}>✕</Text>
        </Pressable>
        <View style={sentStyles.tick}>
          <Text style={sentStyles.tickText}>✓</Text>
        </View>
        <Text style={sentStyles.title}>වෙන්කිරීම ඉල්ලීම යැව්වා</Text>
        <Text style={sentStyles.body}>{garageName} පැය 2ක් ඇතුළත පිළිතුරු දෙයි.</Text>
        <View style={sentStyles.actions}>
          <Pressable style={sentStyles.main} onPress={onViewActivity} accessibilityLabel="Go to Activity">
            <Text style={sentStyles.mainText}>ක්‍රියාකාරකම් බලන්න</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
);

const sentStyles = themedStyles(() =>
  StyleSheet.create({
    backdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 300, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
    box: { width: '100%', maxWidth: 340, alignItems: 'center', gap: 10, padding: 22, borderRadius: 24, backgroundColor: Colors.bgCard, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 16 },
    tick: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: '#16a34a' },
    tickText: { fontSize: 30, color: '#ffffff', fontFamily: FONTS.bodyBold },
    title: { fontSize: 17, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
    body: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 20, textAlign: 'center' },
    note: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a56c9', lineHeight: 19, textAlign: 'center' },
    actions: { flexDirection: 'row', gap: 10, marginTop: 8, width: '100%' },
    close: { position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#eef1f5' },
    closeText: { fontSize: 13, color: Colors.textMain, fontFamily: FONTS.bodyBold },
    main: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, borderWidth: 1.5, borderColor: '#facc15', backgroundColor: '#dbeafe' },
    mainText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: '#1e3a8a' },
  })
);

export const DirectBookingSheet: React.FC<{ garage: Garage | null; categoryId?: string; defaultVehicleId: string; /** What the owner already told this garage (an inquiry), to start the form from. */ initial?: { description?: string; vehicleId?: string; service?: string }; /** An offer the owner chose on the garage's profile: shown as a note at the top of the form. */ offer?: AppliedOffer; onClose: () => void; onBooked?: () => void; /** The last step's button that goes to the Activity tab, where the booking's answer shows. */ onViewActivity?: () => void }> = ({
  garage,
  categoryId: initialCategory,
  initial,
  offer,
  defaultVehicleId,
  onClose,
  onBooked,
  onViewActivity,
}) => {
  const { vehicles } = useVehicles();
  const { requestBooking } = useBookings();
  const [shown, setShown] = useState<Garage | null>(garage);
  const [categoryId, setCategoryId] = useState(initialCategory ?? '1');
  const [service, setService] = useState<string | undefined>();
  const [catsExpanded, setCatsExpanded] = useState(false);
  // The service counts as chosen once the owner picks a tile (or arrives with one already chosen): only then does the step show its tick.
  const [picked, setPicked] = useState(!!initialCategory);
  const [vehicleId, setVehicleId] = useState(defaultVehicleId);
  // Nothing is preselected: the owner picks the day, then the time.
  const [day, setDay] = useState<number | null>(null);
  // The form is five steps, filled in this order: the service, the details, the vehicle, the day, then the time and where.
  const [tab, setTab] = useState<'service' | 'details' | 'vehicle' | 'day' | 'time'>('service');
  const [hour, setHour] = useState<number | null>(null);
  const [doorstep, setDoorstep] = useState(false);
  const [description, setDescription] = useState('');
  // Parts Fitting: the part to fit and who supplies it.
  const [fitPart, setFitPart] = useState('');
  const [fitSupply, setFitSupply] = useState<PartsFitting['supply']>('owner');
  const [photos, setPhotos] = useState<string[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const aiRun = useRef(0);
  // The form's last step, after the request has gone: it says so and points to the Activity tab.
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!garage) return;
    setShown(garage);
    setCategoryId(initialCategory ?? '1');
    setService(initial?.service);
    setPicked(!!initialCategory);
    setVehicleId(initial?.vehicleId ?? defaultVehicleId);
    setTab('service');
    setDay(null);
    setHour(null);
    setDoorstep(false);
    setDescription(initial?.description ?? '');
    setPhotos([]);
    setVoiceNotes([]);
    setSuggestion(null);
    setSent(false);
  }, [garage, initialCategory, defaultVehicleId]);

  // AI suggestion: if the description points to another service, offer to switch.
  useEffect(() => {
    const run = ++aiRun.current;
    if (description.trim().length < 8) {
      setSuggestion(null);
      return;
    }
    const t = setTimeout(async () => {
      const r = await getAi().classifyJob(description);
      if (run !== aiRun.current) return;
      const cat = r.value.categoryId;
      setSuggestion(cat && cat !== categoryId && r.confidence >= SUGGEST_MIN_CONFIDENCE ? cat : null);
    }, 400);
    return () => clearTimeout(t);
  }, [description, categoryId]);

  if (!shown) return null;

  const cat = categoryInfo(categoryId);
  // Only what this garage offers: the categories it ticked, and in each one the sub-services it ticked.
  const offered = garageCategoryIds(shown);
  const offers = (id: string) => garageSubServices(id).length > 0 && (offered === null || offered.includes(id));
  const ticked = garageTickedSubs(shown, categoryId);
  const subList = garageSubServices(categoryId).filter((x) => ticked === null || ticked.includes(x));
  const preferredAt = slotTime(day ?? 1, hour ?? 10);
  const slotPast = day === null || hour === null || slotIsPast(preferredAt);
  const fitting = categoryId === PARTS_FITTING_CATEGORY_ID;
  const detailsOk = problemTold(description, voiceNotes, 5) && (!fitting || fitPart.trim().length > 0);
  const valid = detailsOk && !slotPast;

  const ORDER = ['service', 'details', 'vehicle', 'day', 'time'] as const;
  const STEP_NAMES = ['සේවාව', 'විස්තර', 'වාහනය', 'දිනය', 'වේලාව'] as const;
  const tabIndex = ORDER.indexOf(tab);
  const lastTab = tabIndex === ORDER.length - 1;
  // A step's own requirement for moving on.
  const tabOk = tab === 'service' ? picked : tab === 'details' ? detailsOk : tab === 'vehicle' ? !!vehicleId : tab === 'day' ? day !== null : tab === 'time' ? !slotPast : true;
  // What a disabled button says is missing, so it never just looks broken.
  const missingLabel = tab === 'service' ? 'සේවා අංශයක් තෝරන්න' : tab === 'details' ? (fitting && fitPart.trim().length === 0 ? 'කොටස ලියන්න' : 'ගැටලුව විස්තර කරන්න') : tab === 'day' ? 'දිනයක් තෝරන්න' : 'වේලාවක් තෝරන්න';
  const next = () => setTab(ORDER[Math.min(ORDER.length - 1, tabIndex + 1)]);
  const pickDay = (d: number) => {
    setDay(d);
    if (hour !== null && slotIsPast(slotTime(d, hour))) setHour(null);
  };

  const submit = () => {
    const fittingInfo: PartsFitting | undefined = fitting ? { partName: fitPart.trim(), supply: fitSupply } : undefined;
    requestBooking({ garage: shown, categoryId, service, vehicleId, preferredAt, description: fittingInfo ? `${jobDescription(description)}\n🔩 සවි කළ යුතු කොටස: ${fittingInfo.partName} (${FITTING_SUPPLY.find((x) => x.id === fittingInfo.supply)?.short})` : jobDescription(description), doorstep, photos, voiceNotes, fitting: fittingInfo, offer });
    onBooked?.();
    setSent(true);
  };

  return (
    <BookingShell
      visible={!!garage}
      title="Ongarage වෙන්කිරීම"
      icon="🛠️"
      steps={STEP_NAMES}
      step={tabIndex}
      onStep={(i) => setTab(ORDER[i])}
      onClose={onClose}
      footer={
        lastTab ? (
          <FlowButton label={slotPast ? 'වේලාවක් තෝරන්න' : 'වෙන්කිරීම ඉල්ලන්න'} icon={slotPast ? undefined : '📅'} variant="primary" disabled={!valid} onPress={submit} />
        ) : (
          <FlowButton label={tabOk ? 'ඊළඟ ›' : missingLabel} variant="primary" disabled={!tabOk} onPress={next} />
        )
      }
      overlay={<BookingSentBox visible={sent} garageName={shown.name} when={`${formatDate(preferredAt)} ${formatTime(preferredAt)}`} onViewActivity={() => { setSent(false); onViewActivity?.(); }} onClose={() => { setSent(false); onClose(); }} />}
    >
      {/* The garage stays at the top whichever step is open: the same card as the bid the owner accepted. */}
      <View style={styles.garage}>
        <View style={styles.garageTop}>
          {GARAGE_COVERS[shown.id] ? <Image source={GARAGE_COVERS[shown.id]} style={styles.avatar} accessibilityLabel={`${shown.name} photo`} /> : <View style={styles.avatar} />}
          <View style={styles.flex1}>
            <View style={styles.nameRow}>
              <Text style={[styles.title, styles.shrink]}>{shown.name}</Text>
              <GarageHistoryTag garage={shown} part="tag" />
            </View>
            <Text style={styles.rating} numberOfLines={1}>
              <Text style={styles.stars}>{'★'.repeat(Math.round(shown.rating))}{'☆'.repeat(5 - Math.round(shown.rating))}</Text> {shown.rating.toFixed(1)} ({shown.reviews}) · km {shown.distance}
            </Text>
          </View>
        </View>
        <GarageLastLine garage={shown} />
      </View>
      {!!offer?.title && (
        <View style={styles.offerChip} accessibilityLabel="Chosen offer">
          <Text style={styles.offerChipText} numberOfLines={2}>{offer.icon} {offer.title} · {offer.percent ? 'වට්ටම බිල්පතෙන් අඩු වේ' : offer.warrantyMonths ? `වගකීම මාස ${offer.warrantyMonths}කින් දිගු වේ` : 'ගරාජයට දැනුම් දෙනු ලැබේ'}</Text>
        </View>
      )}

      {tab === 'service' && (
        <View style={styles.stepCard}>
          {/* The same card as the quote request's service step: a tick, the title with its count, then the tiles in four columns with "+N more". */}
          <View style={styles.stepHead}>
            {picked && (
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>✓</Text>
              </View>
            )}
            <Text style={[styles.stepTitle, styles.flex1]}>{`සේවා අංශය · ${SERVICE_CATEGORIES.filter((c) => offers(c.id)).length}`}</Text>
            {!picked && (
              <View style={styles.requiredPill} accessibilityLabel="Required">
                <Text style={styles.requiredText}>පහළින් තෝරන්න</Text>
              </View>
            )}
          </View>
          {catsExpanded && (
            <Pressable style={styles.lessLink} onPress={() => setCatsExpanded(false)} accessibilityLabel="Show fewer categories">
              <Text style={styles.lessLinkText}>අඩුවෙන් පෙන්වන්න</Text>
            </Pressable>
          )}
          <CategoryStrip
            layout="grid"
            columns={4}
            collapsedCount={7}
            expanded={catsExpanded}
            onExpandedChange={setCatsExpanded}
            include={offers}
            selectedId={picked ? categoryId : null}
            onSelect={(c) => {
              setCategoryId(c.id);
              setService(undefined);
              setPicked(true);
            }}
          />
          {picked && (
            <>
          <Text style={styles.eyebrow}>{`${cat.name} හි උප සේවා (විකල්ප තේරීමකි):`}</Text>
          <View style={styles.chips}>
            {subList.map((s) => (
              <Chip key={s} label={s} on={service === s} onPress={() => setService(service === s ? undefined : s)} small color={cat.color} />
            ))}
          </View>
            </>
          )}
        </View>
      )}

      {tab === 'details' && (
        <>
        <View style={styles.stepCard}>
          {fitting && (
            <>
              <View style={[styles.headRow]}>
                <Text style={styles.question}>සවි කළ යුතු කොටස</Text>
                {fitPart.trim().length === 0 && (
                  <View style={styles.requiredPill} accessibilityLabel="Required">
                    <Text style={styles.requiredText}>අත්‍යවශ්‍යයි</Text>
                  </View>
                )}
              </View>
              <FlowField style={styles.fieldShort} value={fitPart} onChangeText={setFitPart} placeholder="උදා: ඉදිරිපස බ්‍රේක් පෑඩ් සෙට් එක" accessibilityLabel="Part to fit" />
              <Text style={styles.label}>කොටස සපයන්නේ කවුද?</Text>
              <View style={styles.chips}>
                {FITTING_SUPPLY.map((s) => (
                  <Chip key={s.id} label={s.label} on={fitSupply === s.id} onPress={() => setFitSupply(s.id)} />
                ))}
              </View>
            </>
          )}

          <View style={[styles.headRow]}>
            <Text style={styles.question}>ගැටලුව විස්තර කරන්න</Text>
            {!problemTold(description, voiceNotes, 5) && (
              <View style={styles.requiredPill} accessibilityLabel="Required">
                <Text style={styles.requiredText}>අත්‍යවශ්‍යයි</Text>
              </View>
            )}
          </View>
          <FlowField
            value={description}
            onChangeText={setDescription}
            placeholder="උදා: බ්‍රේක් තද කරන විට ශබ්දයක් එනවා"
            multiline
            maxLength={400}
            accessibilityLabel="Booking description"
          />
          {suggestion && (
            <Pressable style={styles.suggest} onPress={() => setCategoryId(suggestion)}>
              <Text style={styles.suggestText}>
                🤖 ඔබගේ විස්තරයට අනුව මෙය {categoryInfo(suggestion).icon} {categoryInfo(suggestion).name} විය හැක — මාරු කරන්න ›
              </Text>
            </Pressable>
          )}

          <Text style={styles.label}>හෝ ඡායාරූප / හඬ සටහනක් එක් කරන්න</Text>
          <MediaAttachments photos={photos} voiceNotes={voiceNotes} onPhotos={setPhotos} onVoiceNotes={setVoiceNotes} />
        </View>

        </>
      )}

      {tab === 'vehicle' && (
        <>
          <Text style={[styles.question, styles.headTop]}>ඔබේ වාහනය</Text>
          <VehicleOptions value={vehicleId} onChange={setVehicleId} />
        </>
      )}

      {tab === 'day' && (
        <DayStep
          day={day}
          onDay={pickDay}
          onSoonest={(d, h) => {
            setDay(d);
            setHour(h);
            setTab('time');
          }}
        />
      )}

      {tab === 'time' && day !== null && (
        <>
          <TimeStep day={day} hour={hour} onHour={setHour} onChangeDay={() => setTab('day')} />
          <Text style={[styles.question, styles.headTop]}>සේවාව ලබාගන්නේ කොහේ ද?</Text>
          <View style={styles.placeRow}>
            <Pressable style={[styles.place, !doorstep && styles.placeOn]} onPress={() => setDoorstep(false)} accessibilityRole="radio" accessibilityState={{ selected: !doorstep }}>
              <Text style={[styles.placeText, !doorstep && styles.placeTextOn]}>🏠 මම වාහනය ගරාජයට ගෙන යමි</Text>
            </Pressable>
            <Pressable style={[styles.place, doorstep && styles.placeOn]} onPress={() => setDoorstep(true)} accessibilityRole="radio" accessibilityState={{ selected: doorstep }}>
              <Text style={[styles.placeText, doorstep && styles.placeTextOn]}>🚛 ගරාජය මා වෙත පැමිණේ</Text>
            </Pressable>
          </View>
        </>
      )}
    </BookingShell>
  );
};

/** `color`: the chip takes that colour (a tint with a border of it; filled when picked): the sub-services wear their service's colour. */
const Chip: React.FC<{ label: string; on: boolean; onPress: () => void; small?: boolean; disabled?: boolean; color?: string }> = ({ label, on, onPress, small, disabled, color }) => (
  <Pressable
    style={[styles.chip, small && styles.chipSmall, on && styles.chipOn, color && { backgroundColor: on ? color : `${color}26`, borderColor: on ? color : `${color}8c` }, disabled && styles.chipOff]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
  </Pressable>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    shrink: { flexShrink: 1 },
    garage: { borderRadius: 26, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.55)', backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff', shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: getThemeMode() === 'dark' ? 0.6 : 0.16, shadowRadius: 22, elevation: 6 },
    garageTop: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.subtleFill },
    rating: { fontSize: 12, lineHeight: 16, fontFamily: FONTS.bodyMedium, color: Colors.textMain, marginTop: 1 },
    stars: { color: '#f5a623', letterSpacing: 1 },
    stepCard: { backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: outline(), ...elevation1(), padding: 16, gap: 12 },
    stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8' },
    stepBadgeText: { fontSize: 18, fontFamily: FONTS.titleBold, color: '#ffffff' },
    stepTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    requiredPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.16)' },
    requiredText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#b45309' },
    lessLink: { alignSelf: 'flex-end', paddingVertical: 2 },
    lessLinkText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    eyebrow: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? Colors.textMuted : '#475569', letterSpacing: 0.2 },
    question: { fontSize: 16, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    headTop: { marginTop: 12, marginBottom: 2 },
    placeRow: { gap: 8 },
    place: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 24, backgroundColor: Colors.bgCard, borderWidth: 1.5, borderColor: Colors.borderColor },
    placeOn: { backgroundColor: '#1e3a8a', borderColor: '#facc15' },
    placeText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    placeTextOn: { color: '#ffffff' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    // The last step, after the request has gone.
    sent: { alignItems: 'center', gap: 12, paddingTop: 36, paddingHorizontal: 8 },
    sentTick: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#16a34a' },
    sentTickText: { fontSize: 38, color: '#ffffff', fontFamily: FONTS.bodyBold },
    sentTitle: { fontSize: 20, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
    sentBody: { fontSize: 13.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 21, textAlign: 'center' },
    sentNote: { marginTop: 8, padding: 14, borderRadius: 14, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.14)' : '#eff6ff' },
    sentNoteText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a56c9', lineHeight: 20, textAlign: 'center' },
    sentActions: { flexDirection: 'row', gap: 10 },
    sentMain: { flex: 2 },
    title: { fontSize: 15, lineHeight: 19, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    label: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    offerChip: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#dbeafe' },
    offerChipText: { fontSize: 12.5, lineHeight: 18, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1e3a8a' },
    offerNote: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#e8edf8' },
    offerNoteSub: { fontSize: 12.5, lineHeight: 18, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    offerNoteText: { fontSize: 13.5, lineHeight: 20, fontFamily: FONTS.bodySemiBold, color: '#1e3a8a' },
    hint: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    dateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    calBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    calBtnOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    chipSmall: { paddingHorizontal: 10, paddingVertical: 6 },
    chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipOff: { opacity: 0.35 },
    chipText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: '#fff' },
    input: {
      minHeight: 96,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 22,
      backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff',
      borderWidth: 1,
      borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#f3f4f6',
      color: Colors.textMain,
      fontSize: 14,
      fontFamily: FONTS.bodyRegular,
      textAlignVertical: 'top',
    },
    headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    fieldShort: { minHeight: 52 },
    suggest: { padding: 10, borderRadius: 12, backgroundColor: 'rgba(56, 189, 248, 0.1)', borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.4)' },
    suggestText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  })
);
