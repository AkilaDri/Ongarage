import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, canonicalPartName, Colors, FONTS, getAi, partCategory, PartBriefForm, SEARCH_RINGS, SUGGEST_MIN_CONFIDENCE, themedStyles, softEdge, softFill, type JobPartsRef, type MartAudience, type PartBrief, type PartType, type SearchRing } from '@ongarage/shared';
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
  const { createEnquiry } = useMart();
  const [brief, setBrief] = useState<PartBrief | null>(null);
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
    setAudience(prefill?.audience ?? 'shops');
    setRing('nearby');
    setDays(prefill?.audience === 'wall' ? 7 : 3);
    setError(null);
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!brief) return null;
  const direct = !!prefill?.onlyShopIds?.length || !!prefill?.jobRef;
  const valid = brief.name.trim().length > 0;

  const send = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const text = `${brief.name} ${brief.note ?? ''}`;
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
    const { id: _id, ...rest } = brief;
    const id = createEnquiry({ brief: { ...rest, name: brief.name.trim() }, audience: direct ? 'shops' : audience, ring, onlyShopIds: prefill?.onlyShopIds, validDays: days, jobRef: prefill?.jobRef });
    onSent(id, direct ? 'shops' : audience);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      title={prefill?.jobRef ? 'ගරාජය නිර්දේශ කළ කොටස ඉල්ලන්න' : direct ? `${prefill?.shopName ?? 'වෙළඳසැල'} වෙතින් ඉල්ලන්න` : 'කොටසක් ඉල්ලන්න'}
      subtitle="නිවැරදි කොටස ලබා ගැනීමට වාහනයේ තොරතුරු ද යැවේ"
      onClose={onClose}
      footer={<ActionButton label={busy ? 'යවමින්…' : 'ඉල්ලීම යවන්න'} icon="📨" variant="primary" disabled={!valid || busy} onPress={send} />}
    >
      <PartBriefForm brief={brief} onChange={setBrief}>
        <MediaAttachments photos={brief.photos ?? []} voiceNotes={brief.voiceNotes ?? []} onPhotos={(photos) => setBrief({ ...brief, photos })} onVoiceNotes={(voiceNotes) => setBrief({ ...brief, voiceNotes })} />
      </PartBriefForm>

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
    label: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 6 },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge() },
    optionOn: { borderColor: Colors.primary },
    optionTitle: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.subtleBorder, alignItems: 'center', justifyContent: 'center' },
    radioOn: { borderColor: Colors.primary },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge() },
    chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    chipTextOn: { color: '#ffffff' },
    error: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.errorText, lineHeight: 17 },
  })
);
