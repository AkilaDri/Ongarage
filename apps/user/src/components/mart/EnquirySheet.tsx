import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { canonicalPartName, Colors, FONTS, getAi, getThemeMode, GoogleMap, shopsNear, MAX_BASKET_PARTS, partCategory, PART_CATEGORY, SEARCH_RINGS, SERVICE_CATEGORIES, SUGGEST_MIN_CONFIDENCE, themedStyles, type JobPartsRef, type MartAudience, type PartBrief, type PartType, type SearchRing } from '@ongarage/shared';
import { useVehicles } from '../../context/VehiclesContext';
import { useMart } from '../../context/MartContext';
import { useUserLocation } from '../../context/LocationContext';
import { BookingShell } from '../BookingShell';
import { FlowButton } from '../FlowButton';
import { FlowField } from '../FlowField';
import { FlowStepCard } from '../FlowStepCard';
import { FlowVehicleCard } from '../FlowVehicleCard';
import { MediaAttachments } from '../MediaAttachments';
import { CategoryStrip, shortCategoryName } from '../home/CategoryStrip';
import { Toast } from '../Toast';

export type EnquiryPrefill = { name?: string; partType?: PartType; audience?: MartAudience; onlyShopIds?: string[]; shopName?: string; vehicleId?: string; qty?: number; partNo?: string; jobRef?: JobPartsRef };

const AUDIENCES: { id: MartAudience; title: string; text: string }[] = [
  { id: 'shops', title: 'ළඟ වෙළඳසැල්වලට පමණි', text: 'තෝරාගත් පරාසය ඇතුළත වෙළඳසැල් වෙතට ඉල්ලීම යැවේ.' },
  { id: 'wall', title: 'විවෘත දුර්ලභ කොටස් පෝස්ට් එකට පමණි', text: 'ලංකාවේ සියලු වෙළඳසැල්වලට පෙනේ — දුර්ලභ කොටස් සඳහා.' },
  { id: 'both', title: 'දෙකටම', text: 'ළඟ වෙළඳසැල්වලට ද, විවෘත පෝස්ට් එකට ද.' },
];
const DAYS = [1, 3, 7];
const KINDS: { id: PartType; label: string; help: string }[] = [
  { id: 'Genuine', label: 'Genuine', help: 'වාහන නිෂ්පාදකයාගේ මුල් කොටස.' },
  { id: 'OEM', label: 'OEM', help: 'මුල් කොටස් හදන සමාගම් නිෂ්පාදනය කළ අලුත් කොටසක්.' },
  { id: 'Recon', label: 'Recon', help: 'පරීක්ෂා කර නැවත සකස් කළ, භාවිත කළ මුල් කොටසක්.' },
  { id: 'GarageChoice', label: 'ඕනෑම වර්ගයක්', help: 'වෙළඳසැල් ළඟ ඇති වර්ග සියල්ලේම මිල එවයි.' },
];
/** The categories parts are matched to shops by; fitting is a garage's job, so it is not asked of a shop. */
const PART_CATEGORY_IDS = ['7', '1', '2', '11', '4', '14', '6', '5', '3'];
/** The common parts of a category, from the same list that matches parts to shops. */
const commonParts = (categoryId: string) => Object.keys(PART_CATEGORY).filter((n) => PART_CATEGORY[n] === categoryId);

const STEPS = ['part', 'details', 'kind', 'time'] as const;
type Step = (typeof STEPS)[number];
const STEP_NAMES: Record<Step, string> = { part: 'කොටස සහ වාහනය', details: 'විස්තර', kind: 'වර්ගය සහ ස්ථානය', time: 'කාලය' };

/**
 * Ask OnMart shops for a part, in the shape of the Ongarage quote request: which vehicle and kind of part, its details, the kind wanted and from where,
 * then how long the request runs and who sees it. A photo alone can stand for an unknown name. (Parts a garage asked for use the job's own small pop-up.)
 */
export const EnquirySheet: React.FC<{ visible: boolean; vehicleId: string; prefill?: EnquiryPrefill; onClose: () => void; onSent: (id: string, audience: MartAudience) => void }> = ({ visible, vehicleId, prefill, onClose, onSent }) => {
  const { findVehicle } = useVehicles();
  const { createEnquiry, createBatch } = useMart();
  const user = useUserLocation();
  const [step, setStep] = useState<Step>('part');
  const [carId, setCarId] = useState(vehicleId);
  const [brief, setBrief] = useState<PartBrief | null>(null);
  // The parts already added to this request (the one in the form is added when it is sent, or with "add another part").
  const [parts, setParts] = useState<PartBrief[]>([]);
  const [audience, setAudience] = useState<MartAudience>('shops');
  const [ring, setRing] = useState<SearchRing>('nearby');
  const [days, setDays] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const vehicleOf = (id: string): PartBrief['vehicle'] => {
    const v = findVehicle(id);
    return { name: v.name, plate: v.plate, type: v.type, make: v.make, model: v.model, chassisNo: v.chassisNo, engineNo: v.engineNo };
  };

  useEffect(() => {
    if (!visible) return;
    const id = prefill?.vehicleId ?? vehicleId;
    const name = prefill?.name ? canonicalPartName(prefill.name) ?? prefill.name : '';
    setStep('part');
    setCarId(id);
    setBrief({ id: 'draft', name, qty: prefill?.qty ?? 1, partNo: prefill?.partNo, partType: prefill?.partType ?? 'GarageChoice', categoryId: name ? partCategory(name) : undefined, vehicle: vehicleOf(id) });
    setParts([]);
    setAudience(prefill?.audience ?? 'shops');
    setRing('nearby');
    setDays(prefill?.audience === 'wall' ? 7 : 3);
    setError(null);
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!brief) return null;
  const direct = !!prefill?.onlyShopIds?.length || !!prefill?.jobRef;
  // A photo alone is enough: many owners do not know a part's name.
  const filled = brief.name.trim().length > 0 || !!brief.photos?.length;
  const named = (b: PartBrief): PartBrief => ({ ...b, name: b.name.trim() || 'නම නොදන්නා කොටස' });
  const total = parts.length + (filled ? 1 : 0);
  const valid = total > 0;
  const set = (change: Partial<PartBrief>) => setBrief((b) => b && { ...b, ...change });
  const changeVehicle = (id: string) => {
    setCarId(id);
    const vehicle = vehicleOf(id);
    set({ vehicle });
    setParts((p) => p.map((x) => ({ ...x, vehicle })));
  };
  const addPart = () => {
    if (!filled || parts.length + 1 >= MAX_BASKET_PARTS) return;
    setParts((p) => [...p, named(brief)]);
    setBrief({ id: 'draft', name: '', qty: 1, partType: brief.partType, vehicle: brief.vehicle });
  };
  const index = STEPS.indexOf(step);

  const send = async () => {
    if (!valid || busy) return;
    setBusy(true);
    // The kind chosen in step 3 is for every part in this request.
    const all = [...parts, ...(filled ? [named(brief)] : [])].map((b) => ({ ...b, partType: brief.partType }));
    const text = all.map((b) => `${b.name} ${b.note ?? ''}`).join(' ');
    const [off, mod] = await Promise.all([getAi().checkOffPlatform(text), getAi().moderate(text)]);
    if (off.confidence >= SUGGEST_MIN_CONFIDENCE && off.value.flagged) {
      setError('දුරකථන අංක, ගෙවීම් හෝ වෙනත් යෙදුම් පණිවිඩ එක් නොකරන්න — OnMart තුළම වෙළඳසැල් සමඟ සම්බන්ධ වන්න.');
      setBusy(false);
      return;
    }
    if (mod.confidence >= SUGGEST_MIN_CONFIDENCE && !mod.value.ok) {
      setError('ඉල්ලීමේ වචන අනුමත නොවේ — කොටස පමණක් සරලව විස්තර කරන්න.');
      setBusy(false);
      return;
    }
    const aud = direct ? 'shops' : audience;
    const one = (b: PartBrief) => {
      const { id: _id, ...rest } = b;
      return { brief: rest, audience: aud, ring, onlyShopIds: prefill?.onlyShopIds, validDays: days, jobRef: all.length === 1 ? prefill?.jobRef : undefined };
    };
    // Several parts go out together as one request group: each shop answers every part, with its own availability and price.
    const id = all.length > 1 ? createBatch(all.map(one), `කොටස් ${all.length}`) : createEnquiry(one(all[0]));
    onSent(id, direct ? 'shops' : audience);
    onClose();
  };

  const canonical = canonicalPartName(brief.name);
  const category = SERVICE_CATEGORIES.find((c) => c.id === brief.categoryId);
  const kind = KINDS.find((k) => k.id === brief.partType);

  const footer =
    step === 'part' ? (
      <FlowButton label={brief.categoryId || filled ? 'ඊළඟ ›' : 'කාණ්ඩය නොදනිමි · ඊළඟ ›'} onPress={() => setStep('details')} />
    ) : step === 'details' ? (
      <FlowButton label={valid ? 'ඊළඟ ›' : 'නමක් හෝ ඡායාරූපයක් දෙන්න'} disabled={!valid} onPress={() => setStep('kind')} />
    ) : step === 'kind' ? (
      <FlowButton label="ඊළඟ ›" onPress={() => setStep('time')} />
    ) : (
      <FlowButton label={busy ? 'යවමින්…' : 'ඉල්ලීම වෙළඳසැල් වෙත යවන්න'} detail={total > 1 ? `කොටස් ${total}` : undefined} disabled={!valid || busy} onPress={send} />
    );

  return (
    <BookingShell
      visible={visible}
      title="OnMart ඉල්ලීම"
      icon="🔩"
      steps={STEPS.map((s) => STEP_NAMES[s])}
      step={index}
      onStep={(i) => setStep(STEPS[i])}
      onBack={index > 0 ? () => setStep(STEPS[index - 1]) : undefined}
      onClose={onClose}
      footer={footer}
      overlay={<Toast />}
    >
      {step === 'part' && (
        <>
          <FlowVehicleCard vehicleId={carId} onChange={changeVehicle} />
          <FlowStepCard step={1} title={`කොටස් කාණ්ඩය · ${PART_CATEGORY_IDS.length}`} done={!!brief.categoryId} requiredNote="පහළින් තෝරන්න">
            <CategoryStrip
              layout="grid"
              columns={4}
              include={(id) => PART_CATEGORY_IDS.includes(id)}
              selectedId={brief.categoryId ?? null}
              onSelect={(c) => set({ categoryId: c.id, name: brief.categoryId === c.id ? brief.name : '' })}
            />
            {!!category && commonParts(category.id).length > 0 && (
              <>
                <Text style={styles.eyebrow}>{`${shortCategoryName(category.id) ?? category.name} හි බහුලව ඉල්ලන කොටස් (විකල්ප තේරීමකි):`}</Text>
                <View style={styles.wrap}>
                  {commonParts(category.id).map((n) => {
                    const on = brief.name === n;
                    return (
                      <Pressable key={n} style={[styles.sub, { backgroundColor: on ? category.color : `${category.color}26`, borderColor: on ? category.color : `${category.color}8c` }]} onPress={() => set({ name: on ? '' : n })} accessibilityLabel={`Common part ${n}`} accessibilityState={{ selected: on }}>
                        <Text style={[styles.subText, on && styles.onText]}>{n}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </FlowStepCard>
        </>
      )}

      {step === 'details' && (
        <>
          {parts.length > 0 && (
            <FlowStepCard step={2} title={`එකතු කළ කොටස් · ${parts.length}`} done>
              {parts.map((p, i) => (
                <View key={`${p.name}-${i}`} style={styles.row}>
                  <Text style={[styles.strong, styles.flex1]} numberOfLines={1}>
                    {p.name}
                    {p.qty > 1 ? ` ×${p.qty}` : ''}
                  </Text>
                  <Pressable style={styles.remove} onPress={() => setParts((x) => x.filter((_, j) => j !== i))} accessibilityLabel={`Remove ${p.name}`}>
                    <Text style={styles.help}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </FlowStepCard>
          )}
          <FlowStepCard step={2} title="කොටස විස්තර කරන්න" done={filled} requiredNote="නමක් හෝ ඡායාරූපයක්">
            <TextInput
              style={styles.input}
              value={brief.name}
              onChangeText={(t) => set({ name: t, categoryId: partCategory(canonicalPartName(t) ?? '') ?? brief.categoryId })}
              placeholder="කොටසේ නම · උදා: Brake pads"
              placeholderTextColor={Colors.textMuted}
              accessibilityLabel="Part name"
            />
            {!!canonical && canonical !== brief.name && (
              <Pressable style={styles.remove} onPress={() => set({ name: canonical, categoryId: partCategory(canonical) })} accessibilityLabel={`Use ${canonical}`}>
                <Text style={styles.link}>“{canonical}” ලෙස සොයන්න</Text>
              </Pressable>
            )}
            <Text style={styles.eyebrow}>නම නොදන්නේ නම්, ඡායාරූපයක් හෝ හඬ සටහනක් එක් කරන්න</Text>
            <MediaAttachments photos={brief.photos ?? []} voiceNotes={brief.voiceNotes ?? []} onPhotos={(photos) => set({ photos })} onVoiceNotes={(voiceNotes) => set({ voiceNotes })} />
            <View style={styles.row}>
              <Text style={[styles.strong, styles.flex1]}>ප්‍රමාණය</Text>
              <Pressable style={styles.qtyBtn} onPress={() => set({ qty: Math.max(1, brief.qty - 1) })} accessibilityLabel="Decrease quantity">
                <Text style={styles.qtySign}>−</Text>
              </Pressable>
              <Text style={styles.qty}>{brief.qty}</Text>
              <Pressable style={styles.qtyBtn} onPress={() => set({ qty: Math.min(20, brief.qty + 1) })} accessibilityLabel="Increase quantity">
                <Text style={styles.qtySign}>+</Text>
              </Pressable>
            </View>
            <Text style={styles.eyebrow}>කොටස් අංකය (ඇත්නම්)</Text>
            <TextInput style={styles.input} value={brief.partNo ?? ''} onChangeText={(t) => set({ partNo: t || undefined })} placeholder="උදා: 04465-20520" placeholderTextColor={Colors.textMuted} autoCapitalize="characters" accessibilityLabel="Part number" />
            <Text style={styles.eyebrow}>වෙළඳසැලට දැන ගැනීමට (විකල්ප)</Text>
            <FlowField value={brief.note ?? ''} onChangeText={(t) => set({ note: t || undefined })} placeholder="වම් පැත්තේ, ඉදිරිපස… පැරණි කොටසේ තත්ත්වය" multiline accessibilityLabel="Note for the shop" />
          </FlowStepCard>
          <FlowButton label="＋ තවත් කොටසක් එකතු කරන්න" variant="ghost" disabled={!filled || parts.length + 1 >= MAX_BASKET_PARTS} onPress={addPart} a11y="Add another part" />
        </>
      )}

      {step === 'kind' && (
        <>
          <FlowStepCard step={3} title="කැමති කොටස් වර්ගය" done hint={total > 1 ? 'මෙම ඉල්ලීමේ සියලු කොටස් සඳහා' : 'එක් වර්ගයක් තෝරන්න'}>
            <View style={styles.wrap}>
              {KINDS.map((k) => {
                const on = brief.partType === k.id;
                return (
                  <Pressable key={k.id} style={[styles.choice, on && styles.choiceOn]} onPress={() => set({ partType: k.id })} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`Type ${k.label}`}>
                    <Text style={[styles.choiceText, on && styles.onText]}>{k.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.help}>{kind?.help}</Text>
          </FlowStepCard>
          <FlowStepCard step={4} title="ඔබ සිටින ස්ථානය" done optional>
            {/* Parts shops are pinned here, as the quote request pins garages. */}
            <GoogleMap
              style={styles.map}
              center={user.coords}
              zoom={14}
              renderOverlay={(project) => {
                const me = project(user.coords);
                return (
                  <>
                    {shopsNear(user.coords).map((m) => {
                      const at = project(m.coords);
                      return at ? (
                        <View key={m.id} style={[styles.pin, { left: at.x - 11, top: at.y - 11 }]} pointerEvents="none">
                          <Text style={styles.pinText}>🏪</Text>
                        </View>
                      ) : null;
                    })}
                    {!!me && <View style={[styles.me, { left: me.x - 8, top: me.y - 8 }]} pointerEvents="none" />}
                  </>
                );
              }}
            />
            <Text style={styles.help} numberOfLines={2}>📍 {user.address}</Text>
            {!direct && audience !== 'wall' && (
              <>
                <Text style={styles.eyebrow}>වෙළඳසැල් සෙවුම් පරාසය</Text>
                <View style={styles.wrap}>
                  {SEARCH_RINGS.map((r) => (
                    <Pressable key={r.ring} style={[styles.quick, ring === r.ring && styles.quickOn]} onPress={() => setRing(r.ring)} accessibilityLabel={`Request range ${r.ring}`} accessibilityState={{ selected: ring === r.ring }}>
                      <Text style={[styles.quickText, ring === r.ring && styles.onText]}>{r.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </FlowStepCard>
        </>
      )}

      {step === 'time' && (
        <>
          <FlowStepCard step={5} title="⏱️ ඉල්ලීම් කාලය" done>
            <View style={styles.row}>
              <Text style={[styles.help, styles.flex1]}>ඉල්ලීම පවතින කාලය</Text>
              <Text style={styles.big}>දින {days}</Text>
            </View>
            <View style={styles.wrap}>
              {DAYS.map((d) => (
                <Pressable key={d} style={[styles.quick, days === d && styles.quickOn]} onPress={() => setDays(d)} accessibilityLabel={`${d} days`} accessibilityState={{ selected: days === d }}>
                  <Text style={[styles.quickText, days === d && styles.onText]}>දින {d}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.help}>වෙළඳසැල් මෙම කාලය තුළ මිල එවයි.</Text>
          </FlowStepCard>
          <FlowStepCard step={6} title="ඉල්ලීම ලැබෙන්නේ" done>
            {direct ? (
              <Text style={styles.strong}>🏪 {prefill?.shopName ?? 'තෝරාගත් වෙළඳසැල'}</Text>
            ) : (
              AUDIENCES.map((a) => {
                const on = audience === a.id;
                return (
                  <Pressable key={a.id} style={[styles.option, on && styles.optionOn]} onPress={() => setAudience(a.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`Audience ${a.id}`}>
                    <Text style={styles.strong}>{a.title}</Text>
                    <Text style={styles.help}>{a.text}</Text>
                  </Pressable>
                );
              })
            )}
          </FlowStepCard>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </>
      )}
    </BookingShell>
  );
};

// Chips and choices measured as in the quote request, so the two requests read alike.
const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    eyebrow: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? Colors.textMuted : '#475569' },
    strong: { fontSize: 14, lineHeight: 21, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    help: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodyRegular, color: Colors.textSoft },
    link: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1e3a8a' },
    input: { minHeight: 48, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e5e7eb', backgroundColor: Colors.bgCard, color: Colors.textMain, fontSize: 14, fontFamily: FONTS.bodyRegular },
    sub: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 18, borderWidth: 1 },
    subText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    onText: { color: '#ffffff' },
    remove: { minWidth: 36, minHeight: 36, justifyContent: 'center', alignItems: 'flex-start' },
    qtyBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e5e7eb' },
    qtySign: { fontSize: 20, color: Colors.textMain },
    qty: { minWidth: 24, textAlign: 'center', fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    choice: { width: '48.5%', flexGrow: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e5e7eb', backgroundColor: Colors.bgCard },
    choiceOn: { borderColor: '#1d4ed8', backgroundColor: '#1d4ed8' },
    choiceText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
    map: { height: 96, borderRadius: 12, overflow: 'hidden' },
    pin: { position: 'absolute', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
    pinText: { fontSize: 12 },
    me: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: '#1a73e8', borderWidth: 3, borderColor: '#ffffff' },
    quick: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e5e7eb', backgroundColor: Colors.bgCard },
    quickOn: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
    quickText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    big: { fontSize: 22, fontFamily: FONTS.titleBold, color: Colors.textMain },
    option: { gap: 2, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#eef2f8' },
    optionOn: { borderColor: '#facc15', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#eff6ff' },
    error: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
  })
);
