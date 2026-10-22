import { EmptyState } from '@ongarage/shared';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, FONTS, getThemeMode, linesOwnerBuys, MAX_BASKET_PARTS, themedStyles, type DiagnosisLine, type MartAudience } from '@ongarage/shared';
import { useMart } from '../../context/MartContext';
import { useVehicles } from '../../context/VehiclesContext';
import { useWorkshops } from '../../context/WorkshopContext';
import { Sheet } from '../Sheet';

const AUDIENCES: { id: MartAudience; label: string }[] = [
  { id: 'shops', label: 'ළඟ වෙළඳසැල්' },
  { id: 'both', label: 'වෙළඳසැල් + විවෘත පෝස්ට්' },
];

/** The parts of a job the owner still has to buy: not bought yet, and not already asked for in OnMart. */
export const useBasketParts = (workshopId?: string): DiagnosisLine[] => {
  const { workshops, } = useWorkshops();
  const { enquiries } = useMart();
  const w = workshopId ? workshops[workshopId] : undefined;
  if (!w || w.progress.cancelled || w.progress.cancelRequest) return [];
  const asked = new Set(enquiries.filter((m) => m.enquiry.status !== 'cancelled').map((m) => m.enquiry.jobRef?.lineId));
  return linesOwnerBuys(w.progress).filter((l) => !w.partsBought?.[l.id] && !asked.has(l.id));
};

/**
 * The parts basket of a job: every part the garage told the owner to buy themselves, ticked, asked of OnMart in one go (one request group, one answer each). The owner can
 * leave some out, and say who should see the request. Each part keeps its quantity, type and part number from the garage's report.
 */
export const BasketSheet: React.FC<{ workshopId: string | null; onClose: () => void; onSent?: (count: number) => void }> = ({ workshopId, onClose, onSent }) => {
  const { workshops } = useWorkshops();
  const { createBatch } = useMart();
  const { findVehicle } = useVehicles();
  const [shownId, setShownId] = useState(workshopId);
  const [picked, setPicked] = useState<string[]>([]);
  const [audience, setAudience] = useState<MartAudience>('shops');
  const parts = useBasketParts(shownId ?? undefined);

  useEffect(() => {
    if (!workshopId) return;
    setShownId(workshopId);
    setAudience('shops');
    setPicked([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshopId]);
  // Everything is ticked to start with (once the parts are known), up to the most one basket takes.
  useEffect(() => {
    if (workshopId) setPicked((p) => (p.length ? p.filter((id) => parts.some((l) => l.id === id)) : parts.slice(0, MAX_BASKET_PARTS).map((l) => l.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshopId, parts.length]);

  const w = shownId ? workshops[shownId] : undefined;
  if (!w) return null;
  const v = w.vehicleId ? findVehicle(w.vehicleId) : undefined;
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_BASKET_PARTS ? p : [...p, id]));
  const chosen = parts.filter((l) => picked.includes(l.id));

  const send = () => {
    if (!chosen.length || !v) return;
    createBatch(
      chosen.map((l) => ({
        brief: {
          name: l.name,
          qty: l.qty,
          partType: l.partType ?? 'GarageChoice',
          partNo: l.partNo,
          photos: l.photos,
          vehicle: { name: v.name, plate: v.plate, type: v.type, make: v.make, model: v.model, chassisNo: v.chassisNo, engineNo: v.engineNo },
        },
        audience,
        ring: 'nearby',
        validDays: 3,
        jobRef: { bookingId: w.id, lineId: l.id, garage: { id: w.garageName, name: w.garageName }, recommendedShopIds: l.recommendedShopIds ?? [] },
      })),
      `${w.garageName} · ${w.title ?? ''}`.trim()
    );
    onSent?.(chosen.length);
    onClose();
  };

  return (
    <Sheet
      visible={!!workshopId}
      title="කොටස් ඔක්කොම OnMart හි ඉල්ලන්න"
      subtitle={`${w.garageName}${v ? ` · ${v.name} ${v.plate}` : ''}`}
      onClose={onClose}
      footer={<ActionButton label={chosen.length ? `කොටස් ${chosen.length} ම ඉල්ලන්න` : 'කොටස් තෝරන්න'} icon="📨" variant="primary" disabled={!chosen.length} onPress={send} />}
    >
      {parts.length === 0 ? (
        <EmptyState icon="🧺" title="ඉල්ලිය යුතු කොටස් නැත" text="සියල්ල දැනටමත් ඉල්ලා හෝ මිලදී ගෙන ඇත." />
      ) : (
        <>
          <Text style={styles.hint}>ගරාජය ඔබ මිලදී ගන්න කියා ඇති කොටස් මේවායි. වෙළඳසැල් හැම කොටසකටම වෙන වෙනම පිළිතුරු දෙයි; ඔබට ඒවා එකම ලැයිස්තුවකින් බලා ගත හැක.</Text>
          {parts.map((l) => {
            const on = picked.includes(l.id);
            return (
              <Pressable key={l.id} style={[styles.row, on && styles.rowOn]} onPress={() => toggle(l.id)} accessibilityLabel={`Basket part ${l.name}`} accessibilityState={{ selected: on }}>
                <View style={[styles.check, on && styles.checkOn]}>{on && <Text style={styles.checkMark}>✓</Text>}</View>
                <View style={styles.flex1}>
                  <Text style={styles.name}>🔩 {l.name}{l.qty > 1 ? ` ×${l.qty}` : ''}</Text>
                  <Text style={styles.sub}>
                    {l.partType ?? 'GarageChoice'}
                    {l.partNo ? ` · කොටස් අංකය ${l.partNo}` : ''}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          <Text style={styles.label}>කාටද පෙන්වන්නේ</Text>
          <View style={styles.chips}>
            {AUDIENCES.map((a) => (
              <Pressable key={a.id} style={[styles.chip, audience === a.id && styles.chipOn]} onPress={() => setAudience(a.id)} accessibilityLabel={`Audience ${a.id}`} accessibilityState={{ selected: audience === a.id }}>
                <Text style={[styles.chipText, audience === a.id && styles.chipTextOn]}>{audience === a.id ? '✓ ' : ''}{a.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>එක් වරකට උපරිම කොටස් {MAX_BASKET_PARTS}ක්.</Text>
        </>
      )}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    hint: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    rowOn: { borderColor: Colors.primary, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.1)' : '#f1f6fe' },
    check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.borderColor, alignItems: 'center', justifyContent: 'center' },
    checkOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    checkMark: { fontSize: 13, color: '#ffffff', fontWeight: '800' },
    name: { fontSize: 13.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    sub: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    label: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    chipOn: { borderColor: Colors.primary, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    chipText: { fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    chipTextOn: { color: Colors.primary, fontFamily: FONTS.bodyBold },
  })
);
