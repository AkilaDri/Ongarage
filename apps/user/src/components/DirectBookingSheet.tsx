import { GarageHistoryTag } from './GarageHistory';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ActionButton,
  categoryInfo,
  Colors,
  FONTS,
  getAi,
  GlassIcon,
  Icon,
  marketPrice,
  SERVICE_CATEGORIES,
  SUGGEST_MIN_CONFIDENCE,
  themedStyles,
  vehicleIcon,
  FITTING_SUPPLY,
  PARTS_FITTING_CATEGORY_ID,
  type Garage,
  type PartsFitting,
  type VoiceNote,
} from '@ongarage/shared';
import { Sheet } from './Sheet';
import { CategoryStrip } from './home/CategoryStrip';
import { InlineCalendar } from './BookingCalendar';
import { MediaAttachments } from './MediaAttachments';
import { FormTabs } from './FormTabs';
import { VehicleOptions } from './VehicleOptions';
import { useVehicles } from '../context/VehiclesContext';
import { useBookings } from '../context/BookingsContext';
import { formatDate, formatTime, money } from '../utils/format';

const HOUR = 60 * 60 * 1000;
const SLOT_HOURS = [8, 10, 12, 14, 16, 18];
const DAYS_AHEAD = 5;
/** How far ahead a booking can be made: within a month from today. */
const MAX_DAYS = 30;

const dayStart = (offset: number) => {
  const d = new Date(Date.now() + offset * 24 * HOUR);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const dayLabel = (offset: number, t: number) => (offset === 0 ? 'අද' : offset === 1 ? 'හෙට' : formatDate(t));

/**
 * Book a garage directly (no bidding): what's wrong, when, and whether the garage comes
 * to you. The garage gets it as a direct request and must answer within 2 hours.
 */
export const DirectBookingSheet: React.FC<{ garage: Garage | null; categoryId?: string; defaultVehicleId: string; /** What the owner already told this garage (an inquiry), to start the form from. */ initial?: { description?: string; vehicleId?: string; service?: string }; onClose: () => void; onBooked?: () => void }> = ({
  garage,
  categoryId: initialCategory,
  initial,
  defaultVehicleId,
  onClose,
  onBooked,
}) => {
  const { vehicles } = useVehicles();
  const { requestBooking } = useBookings();
  const [shown, setShown] = useState<Garage | null>(garage);
  const [categoryId, setCategoryId] = useState(initialCategory ?? '1');
  const [service, setService] = useState<string | undefined>();
  const [vehicleId, setVehicleId] = useState(defaultVehicleId);
  const [day, setDay] = useState(1);
  // The form is four tabs, filled in this order: the service, the details, the vehicle, then when and where.
  const [tab, setTab] = useState<'service' | 'details' | 'vehicle' | 'when'>('service');
  const [hour, setHour] = useState(10);
  const [doorstep, setDoorstep] = useState(false);
  const [description, setDescription] = useState('');
  // Parts Fitting: the part to fit and who supplies it.
  const [fitPart, setFitPart] = useState('');
  const [fitSupply, setFitSupply] = useState<PartsFitting['supply']>('owner');
  const [photos, setPhotos] = useState<string[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const aiRun = useRef(0);

  useEffect(() => {
    if (!garage) return;
    setShown(garage);
    setCategoryId(initialCategory ?? '1');
    setService(initial?.service);
    setVehicleId(initial?.vehicleId ?? defaultVehicleId);
    setTab('service');
    setDay(1);
    setHour(10);
    setDoorstep(false);
    setDescription(initial?.description ?? '');
    setPhotos([]);
    setVoiceNotes([]);
    setSuggestion(null);
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
  const preferredAt = dayStart(day) + hour * HOUR;
  const slotPast = preferredAt <= Date.now() + HOUR;
  const fitting = categoryId === PARTS_FITTING_CATEGORY_ID;
  const valid = description.trim().length >= 5 && !slotPast && (!fitting || fitPart.trim().length > 0);

  const ORDER = ['service', 'details', 'vehicle', 'when'] as const;
  const tabIndex = ORDER.indexOf(tab);
  const lastTab = tabIndex === ORDER.length - 1;
  const tabDone = { service: true, vehicle: !!vehicleId, when: !slotPast, details: description.trim().length >= 5 && (!fitting || fitPart.trim().length > 0) };
  // A tab's own requirement for moving on (the details are checked by the last button).
  const tabOk = tab === 'details' ? tabDone.details : tab === 'vehicle' ? !!vehicleId : tab === 'when' ? !slotPast : true;
  const next = () => setTab(ORDER[Math.min(ORDER.length - 1, tabIndex + 1)]);

  const submit = () => {
    const fittingInfo: PartsFitting | undefined = fitting ? { partName: fitPart.trim(), supply: fitSupply } : undefined;
    requestBooking({ garage: shown, categoryId, service, vehicleId, preferredAt, description: fittingInfo ? `${description.trim()}\n🔩 සවි කළ යුතු කොටස: ${fittingInfo.partName} (${FITTING_SUPPLY.find((x) => x.id === fittingInfo.supply)?.short})` : description.trim(), doorstep, photos, voiceNotes, fitting: fittingInfo });
    onBooked?.();
    onClose();
  };

  return (
    <Sheet
      visible={!!garage}
      fullScreen
      noDividers
      title="ගරාජය වෙන් කරන්න"
      onClose={onClose}
      footer={
        lastTab ? (
          <ActionButton label={`වෙන්කිරීම ඉල්ලන්න · ${formatDate(preferredAt)} ${formatTime(preferredAt)}`} icon="📅" variant="primary" disabled={!valid} onPress={submit} />
        ) : (
          <ActionButton label="ඊළඟ ›" variant="primary" disabled={!tabOk} onPress={next} />
        )
      }
    >
      {/* The garage stays at the top whichever tab is open. */}
      <View style={styles.garage}>
        <GlassIcon emoji="🛠️" small />
        <View style={styles.flex1}>
          {/* The "New" / record tag stands right after the garage's name. */}
          <View style={styles.nameRow}>
            <Text style={[styles.title, styles.shrink]} numberOfLines={1}>
              {shown.name}
            </Text>
            <GarageHistoryTag garage={shown} part="tag" />
          </View>
          <Text style={styles.sub}>
            ★ {shown.rating} ({shown.reviews}) · කි.මී. {shown.distance} · {shown.address}
          </Text>
        </View>
      </View>
      {/* The line about the last job done by this garage for the owner, if there was one. */}
      <GarageHistoryTag garage={shown} part="line" />

      <FormTabs
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'service', label: 'සේවාව', done: tabDone.service },
          { id: 'details', label: 'විස්තර', done: tabDone.details },
          { id: 'vehicle', label: 'වාහනය', done: tabDone.vehicle },
          { id: 'when', label: 'වේලාව', done: tabDone.when },
        ]}
      />

      {tab === 'service' && (
        <>
          <Text style={styles.label}>සේවාව</Text>
          {/* The same main-category tiles as Home (two rows that slide sideways, the category's own picture on each), the chosen one ringed in blue. */}
          <CategoryStrip
            selectedId={categoryId}
            onSelect={(c) => {
              setCategoryId(c.id);
              setService(undefined);
            }}
          />
          <Text style={styles.label}>උප සේවාව (විකල්ප)</Text>
          <View style={styles.chips}>
            {cat.subcategories.map((s) => (
              <Chip key={s} label={s} on={service === s} onPress={() => setService(service === s ? undefined : s)} small color={cat.color} />
            ))}
          </View>
        </>
      )}

      {tab === 'vehicle' && (
        <>
          <Text style={styles.label}>වාහනය</Text>
          <VehicleOptions value={vehicleId} onChange={setVehicleId} />
        </>
      )}

      {tab === 'when' && (
        <>
          <Text style={styles.label}>දිනය</Text>
          {/* The calendar is open on the page (this tab has the room): pick the day on it, then the time below. */}
          <InlineCalendar selected={day} maxDays={MAX_DAYS} onPick={setDay} />

          <Text style={styles.label}>වේලාව</Text>
          <View style={styles.chips}>
            {SLOT_HOURS.map((h) => {
              const t = dayStart(day) + h * HOUR;
              const past = t <= Date.now() + HOUR;
              return <Chip key={h} label={formatTime(t)} on={hour === h} disabled={past} onPress={() => setHour(h)} small />;
            })}
          </View>
          {hour >= 17 && <Text style={styles.hint}>බොහෝ ගරාජ ප.ව. 5න් පසු වසා ඇත — ගරාජය වෙනත් වේලාවක් යෝජනා කළ හැක.</Text>}

          <Text style={styles.label}>සේවාවක් ලබාගන්නා ස්ථානය</Text>
          <View style={styles.chips}>
            <Chip label="🏠 මම වාහනය ගරාජයට ගෙනෙන්නම්" on={!doorstep} onPress={() => setDoorstep(false)} />
            <Chip label="🚛 ගරාජය මා වෙත පැමිණිය යුතුයි" on={doorstep} onPress={() => setDoorstep(true)} />
          </View>
        </>
      )}

      {tab === 'details' && (
        <>
          {fitting && (
            <>
              <Text style={styles.label}>සවි කළ යුතු කොටස</Text>
              <TextInput style={styles.input} value={fitPart} onChangeText={setFitPart} placeholder="උදා: ඉදිරිපස බ්‍රේක් පෑඩ් සෙට් එක" placeholderTextColor={Colors.textMuted} accessibilityLabel="Part to fit" />
              <Text style={styles.label}>කොටස සපයන්නේ කවුද?</Text>
              <View style={styles.chips}>
                {FITTING_SUPPLY.map((s) => (
                  <Chip key={s.id} label={s.label} on={fitSupply === s.id} onPress={() => setFitSupply(s.id)} />
                ))}
              </View>
            </>
          )}

          <Text style={styles.label}>ගැටලුව විස්තර කරන්න</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="උදා: බ්‍රේක් තද කරන විට ශබ්දයක් එනවා"
            placeholderTextColor={Colors.textMuted}
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

          <Text style={styles.label}>ඡායාරූප සහ හඬ සටහන් (විකල්ප)</Text>
          <MediaAttachments photos={photos} voiceNotes={voiceNotes} onPhotos={setPhotos} onVoiceNotes={setVoiceNotes} />

          <Text style={styles.hint}>
            සාමාන්‍ය මිල: {money(marketPrice(categoryId))} පමණ. අවසන් මිල ගරාජය වාහනය පරීක්ෂා කළ පසු ඔබගේ අනුමැතියෙන් පමණක් තීරණය වේ.
          </Text>
        </>
      )}
    </Sheet>
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
    garage: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4, marginTop: 6 },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    dateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    calBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    calBtnOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    chipSmall: { paddingHorizontal: 9, paddingVertical: 5 },
    chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipOff: { opacity: 0.35 },
    chipText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: '#fff' },
    input: {
      minHeight: 80,
      padding: 12,
      borderRadius: 14,
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: Colors.borderColor,
      color: Colors.textMain,
      fontSize: 13,
      fontFamily: FONTS.bodyRegular,
      textAlignVertical: 'top',
    },
    suggest: { padding: 10, borderRadius: 12, backgroundColor: 'rgba(56, 189, 248, 0.1)', borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.4)' },
    suggestText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  })
);
