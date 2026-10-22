import { outline } from '../../utils/material';
import { getThemeMode } from '@ongarage/shared';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, canonicalPartName, PartVehicleBox, Colors, FONTS, getAi, MAX_BASKET_PARTS, partCategory, PartBriefForm, SEARCH_RINGS, SUGGEST_MIN_CONFIDENCE, themedStyles, softEdge, softFill, type JobPartsRef, type MartAudience, type PartBrief, type PartType, type SearchRing } from '@ongarage/shared';
import { useVehicles } from '../../context/VehiclesContext';
import { useMart } from '../../context/MartContext';
import { MediaAttachments } from '../MediaAttachments';
import { Sheet } from '../Sheet';

export type EnquiryPrefill = { name?: string; partType?: PartType; audience?: MartAudience; onlyShopIds?: string[]; shopName?: string; vehicleId?: string; qty?: number; partNo?: string; jobRef?: JobPartsRef };

const AUDIENCES: { id: MartAudience; title: string; text: string }[] = [
  { id: 'shops', title: 'ළඟ වෙළඳසැල්වලට පමණි', text: 'තෝරාගත් පරාසය ඇතුළත වෙළඳසැල් වෙතට ඉල්ලීම යැවේ.' },
  { id: 'wall', title: 'විවෘත දුර්ලභ කොටස් පෝස්ට් එකට පමණි', text: 'ලංකාවේ සියලු වෙළඳසැල්වලට පෙනේ — දුර්ලභ කොටස් සඳහා.' },
  { id: 'both', title: 'දෙකටම', text: 'ළඟ වෙළඳසැල්වලට ද, විවෘත පෝස්ට් එකට ද.' },
];
const DAYS = [1, 3, 7];

/** Ask for a part: what it is, how sure the shops can be it fits, and who should see the request. */
export const EnquirySheet: React.FC<{ visible: boolean; vehicleId: string; prefill?: EnquiryPrefill; onClose: () => void; onSent: (id: string, audience: MartAudience) => void }> = ({ visible, vehicleId, prefill, onClose, onSent }) => {
  const { findVehicle } = useVehicles();
  const { createEnquiry, createBatch } = useMart();
  const [brief, setBrief] = useState<PartBrief | null>(null);
  // The parts already added to this request (the one in the form is added when it is sent, or with "add another part").
  const [parts, setParts] = useState<PartBrief[]>([]);
  // "Add another part": the form goes back to the top and the part name box takes the cursor.
  const [topKey, setTopKey] = useState(0);
  const [audience, setAudience] = useState<MartAudience>('shops');
  const [ring, setRing] = useState<SearchRing>('nearby');
  const [days, setDays] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const v = findVehicle(prefill?.vehicleId ?? vehicleId);
    const name = prefill?.name ? canonicalPartName(prefill.name) ?? prefill.name : '';
    setBrief({
      id: 'draft',
      name,
      qty: prefill?.qty ?? 1,
      partNo: prefill?.partNo,
      partType: prefill?.partType ?? 'GarageChoice',
      categoryId: name ? partCategory(name) : undefined,
      vehicle: { name: v.name, plate: v.plate, type: v.type, make: v.make, model: v.model, chassisNo: v.chassisNo, engineNo: v.engineNo },
    });
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
  const filled = brief.name.trim().length > 0;
  const total = parts.length + (filled ? 1 : 0);
  const valid = total > 0;
  const addPart = () => {
    if (!filled || parts.length + 1 >= MAX_BASKET_PARTS) return;
    setParts((p) => [...p, { ...brief, name: brief.name.trim() }]);
    setBrief({ id: 'draft', name: '', qty: 1, partType: brief.partType, vehicle: brief.vehicle });
    setTopKey((k) => k + 1);
  };

  const send = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const all = [...parts, ...(filled ? [{ ...brief, name: brief.name.trim() }] : [])];
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

  return (
    <Sheet
      visible={visible}
      title={prefill?.jobRef ? 'ගරාජය නිර්දේශ කළ කොටස ඉල්ලන්න' : direct ? `${prefill?.shopName ?? 'වෙළඳසැල'} වෙතින් ඉල්ලන්න` : 'කොටසක් ඉල්ලන්න'}
      subtitle="නිවැරදි කොටස ලබා ගැනීමට වාහනයේ තොරතුරු ද යැවේ"
      onClose={onClose}
      scrollToTopKey={topKey}
      footer={<ActionButton label={busy ? 'යවමින්…' : total > 1 ? `කොටස් ${total} ම ඉල්ලන්න` : 'ඉල්ලීම යවන්න'} icon="📨" variant="primary" disabled={!valid || busy} onPress={send} />}
    >
      {/* The vehicle the parts are for sits at the very top of the form. */}
      <PartVehicleBox vehicle={brief.vehicle} />
      {parts.length > 0 && (
        <>
          <Text style={styles.label}>ඉල්ලීමට එකතු කළ කොටස් ({parts.length})</Text>
          {parts.map((p, i) => (
            <View key={`${p.name}-${i}`} style={styles.added}>
              <Text style={[styles.optionTitle, styles.flex1]} numberOfLines={1}>🔩 {p.name}{p.qty > 1 ? ` ×${p.qty}` : ''}</Text>
              <Pressable onPress={() => setParts((x) => x.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel={`Remove ${p.name}`}>
                <Text style={styles.remove}>✕</Text>
              </Pressable>
            </View>
          ))}
          <Text style={styles.label}>තවත් කොටසක් — විස්තර පුරවන්න</Text>
        </>
      )}
      <PartBriefForm brief={brief} onChange={setBrief} focusKey={topKey} hideVehicle>
        <MediaAttachments photos={brief.photos ?? []} voiceNotes={brief.voiceNotes ?? []} onPhotos={(photos) => setBrief({ ...brief, photos })} onVoiceNotes={(voiceNotes) => setBrief({ ...brief, voiceNotes })} />
      </PartBriefForm>
      <Pressable style={[styles.addBtn, (!filled || parts.length + 1 >= MAX_BASKET_PARTS) && { opacity: 0.45 }]} disabled={!filled || parts.length + 1 >= MAX_BASKET_PARTS} onPress={addPart} accessibilityLabel="Add another part">
        <Text style={styles.addText}>＋ තවත් කොටසක් එකතු කරන්න</Text>
      </Pressable>
      <Text style={styles.sub}>කොටස් කිහිපයක් එකවර ඉල්ලිය හැක (උපරිම {MAX_BASKET_PARTS}). වෙළඳසැල හැම කොටසකටම තොගය සහ මිල වෙන වෙනම එක මිල ගණන් ලේඛනයකින් දැනුම් දෙයි.</Text>

      {!direct && (
        <>
          <Text style={styles.label}>ඉල්ලීම කාටද?</Text>
          {AUDIENCES.map((a) => {
            const on = audience === a.id;
            return (
              <Pressable key={a.id} style={[styles.option, on && styles.optionOn]} onPress={() => setAudience(a.id)} accessibilityLabel={`Audience ${a.id}`}>
                <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.dot} />}</View>
                <View style={styles.flex1}>
                  <Text style={styles.optionTitle}>{a.title}</Text>
                  <Text style={styles.sub}>{a.text}</Text>
                </View>
              </Pressable>
            );
          })}
          {audience !== 'wall' && (
            <>
              <Text style={styles.label}>වෙළඳසැල් සෙවුම් පරාසය</Text>
              <View style={styles.chips}>
                {SEARCH_RINGS.map((r) => (
                  <Pressable key={r.ring} style={[styles.chip, ring === r.ring && styles.chipOn]} onPress={() => setRing(r.ring)}>
                    <Text style={[styles.chipText, ring === r.ring && styles.chipTextOn]}>{r.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </>
      )}

      <Text style={styles.label}>ඉල්ලීම පවතින්නේ (දින)</Text>
      <View style={styles.chips}>
        {DAYS.map((d) => (
          <Pressable key={d} style={[styles.chip, days === d && styles.chipOn]} onPress={() => setDays(d)}>
            <Text style={[styles.chipText, days === d && styles.chipTextOn]}>{d}</Text>
          </Pressable>
        ))}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    label: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 6 },
    sub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
    option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 8, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
    optionOn: { borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    optionTitle: { fontSize: 14, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.subtleBorder, alignItems: 'center', justifyContent: 'center' },
    radioOn: { borderColor: Colors.primary },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, height: 32, justifyContent: 'center', borderRadius: 8, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
    chipOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    chipText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
    chipTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    added: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, height: 40, borderRadius: 8, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
    remove: { fontSize: 14, color: Colors.textMuted },
    addBtn: { alignSelf: 'flex-start', paddingHorizontal: 14, height: 36, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    addText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    error: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.errorText, lineHeight: 18 },
  })
);
