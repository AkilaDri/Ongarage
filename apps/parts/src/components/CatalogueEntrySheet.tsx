import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ActionButton,
  Colors,
  FONTS,
  MAX_MAKES_PER_ENTRY,
  PART_BRANDS,
  PART_TAXONOMY_GROUPS,
  VEHICLE_KIND_LABEL,
  VEHICLE_MAKES,
  makeInfo,
  partInfo,
  partsInGroup,
  removeEntry,
  softEdge,
  softFill,
  themedStyles,
  upsertEntry,
  validateCatalogue,
  type ShopCatalogueEntry,
  type VehicleKind,
} from '@ongarage/shared';
import { useShop } from '../context/ShopContext';
import { ALL_TYPES } from '../constants/mockData';
import { Sheet } from './Sheet';
import type { QuoteType } from '../types';

const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

/** Add or change one line of the catalogue: the part (or a whole group), the vehicles it is sold for, brands and part types. */
export const CatalogueEntrySheet: React.FC<{ target: { entry: ShopCatalogueEntry | null } | null; onClose: () => void }> = ({ target, onClose }) => {
  const { profile, saveShopCatalogue } = useShop();
  const catalogue = profile.catalogue ?? [];
  const [groupId, setGroupId] = useState(PART_TAXONOMY_GROUPS[0].id);
  const [partId, setPartId] = useState<string | undefined>();
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<Record<string, string[]>>({});
  const [kind, setKind] = useState<VehicleKind>('car');
  const [brands, setBrands] = useState<string[]>([]);
  const [types, setTypes] = useState<QuoteType[]>(['Genuine', 'OEM']);
  const [variants, setVariants] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!target) return;
    const e = target.entry;
    setGroupId(e?.groupId ?? PART_TAXONOMY_GROUPS[0].id);
    setPartId(e?.partId);
    setMakes(e?.vehicles.map((v) => v.make) ?? []);
    setModels(Object.fromEntries((e?.vehicles ?? []).filter((v) => v.models?.length).map((v) => [v.make, v.models!])));
    setBrands(e?.brands ?? []);
    setTypes((e?.partTypes as QuoteType[]) ?? ['Genuine', 'OEM']);
    setVariants(e?.variants ?? []);
    setNote(e?.note ?? '');
    setKind('car');
    setError('');
  }, [target]);

  if (!target) return null;
  const editing = target.entry;
  const parts = partsInGroup(groupId);
  const part = partId ? partInfo(partId) : undefined;
  const shownMakes = VEHICLE_MAKES.filter((m) => m.kind === kind || makes.includes(m.make));

  const save = () => {
    const entry: ShopCatalogueEntry = {
      id: editing?.id ?? `e-${Date.now()}`,
      groupId,
      partId,
      vehicles: makes.map((make) => ({ make, models: models[make]?.length ? models[make] : undefined })),
      brands,
      partTypes: types,
      variants: variants.length ? variants : undefined,
      note: note.trim() || undefined,
      addedAt: editing?.addedAt ?? Date.now(),
    };
    // Changing which part an existing line is for replaces the old line.
    const base = editing ? removeEntry(catalogue, editing.id) : catalogue;
    const next = upsertEntry(base, entry);
    const problems = validateCatalogue(next);
    if (problems.length) {
      setError(problems[0]);
      return;
    }
    saveShopCatalogue(next);
    onClose();
  };

  return (
    <Sheet
      visible
      title={editing ? 'කොටස් ප්‍රවර්ගය සංස්කරණය' : 'කොටස් ප්‍රවර්ගයක් එක් කරන්න'}
      subtitle="ඔබ අලෙවි කරන දේ සහ කුමන වාහන සඳහාද යන්න"
      onClose={onClose}
      footer={
        <View style={styles.footer}>
          {!!error && <Text style={styles.error}>{error}</Text>}
          <ActionButton label="සුරකින්න" icon="✓" variant="primary" disabled={!types.length} onPress={save} />
          {!!editing && catalogue.length > 1 && (
            <ActionButton
              label="ඉවත් කරන්න"
              icon="🗑️"
              variant="ghost"
              onPress={() => {
                saveShopCatalogue(removeEntry(catalogue, editing.id));
                onClose();
              }}
            />
          )}
        </View>
      }
    >
      <Text style={styles.label}>ප්‍රවර්ගය</Text>
      <View style={styles.chips}>
        {PART_TAXONOMY_GROUPS.map((g) => (
          <Chip
            key={g.id}
            label={`${g.icon} ${g.si}`}
            on={groupId === g.id}
            onPress={() => {
              setGroupId(g.id);
              setPartId(undefined);
              setVariants([]);
            }}
          />
        ))}
      </View>

      <Text style={styles.label}>කොටස</Text>
      <View style={styles.chips}>
        <Chip label="ප්‍රවර්ගයේ සියල්ල" on={!partId} onPress={() => { setPartId(undefined); setVariants([]); }} />
        {parts.map((p) => (
          <Chip key={p.id} label={p.si || p.name} on={partId === p.id} onPress={() => { setPartId(p.id); setVariants([]); }} />
        ))}
      </View>
      {!!part?.variants?.length && (
        <>
          <Text style={styles.label}>වර්ග (විකල්ප)</Text>
          <View style={styles.chips}>
            {part.variants.map((v) => (
              <Chip key={v} label={v} on={variants.includes(v)} onPress={() => setVariants((p) => toggle(p, v))} />
            ))}
          </View>
        </>
      )}

      <Text style={styles.label}>වාහන {makes.length ? `(${makes.length}/${MAX_MAKES_PER_ENTRY})` : '· සියලු වාහන'}</Text>
      <Text style={styles.hint}>කිසිවක් තෝරන්නේ නැත්නම් සියලු වාහන සඳහා අලෙවි කරන බව සලකයි. තෝරා ගත් විට ඒවා සඳහා පමණි.</Text>
      <View style={styles.chips}>
        {(Object.keys(VEHICLE_KIND_LABEL) as VehicleKind[]).map((k) => (
          <Chip key={k} label={VEHICLE_KIND_LABEL[k]} on={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>
      <View style={styles.chips}>
        {shownMakes.map((m) => (
          <Chip
            key={m.make}
            label={m.make}
            on={makes.includes(m.make)}
            onPress={() => setMakes((p) => (p.includes(m.make) ? p.filter((x) => x !== m.make) : p.length < MAX_MAKES_PER_ENTRY ? [...p, m.make] : p))}
          />
        ))}
      </View>
      {makes.map((make) => {
        const info = makeInfo(make);
        if (!info?.models.length) return null;
        return (
          <View key={make} style={styles.modelBox}>
            <Text style={styles.sub}>{make} — මාදිලි (නොතේරුවහොත් සියල්ල)</Text>
            <View style={styles.chips}>
              {info.models.map((m) => (
                <Chip key={m.model} label={m.model} small on={(models[make] ?? []).includes(m.model)} onPress={() => setModels((p) => ({ ...p, [make]: toggle(p[make] ?? [], m.model) }))} />
              ))}
            </View>
          </View>
        );
      })}

      <Text style={styles.label}>කොටස් වර්ග</Text>
      <View style={styles.chips}>
        {ALL_TYPES.map((t) => (
          <Chip key={t} label={t} on={types.includes(t)} onPress={() => setTypes((p) => toggle(p, t))} />
        ))}
      </View>

      <Text style={styles.label}>සන්නාම (විකල්ප)</Text>
      <View style={styles.chips}>
        {PART_BRANDS.map((b) => (
          <Chip key={b} label={b} small on={brands.includes(b)} onPress={() => setBrands((p) => toggle(p, b))} />
        ))}
      </View>

      <Text style={styles.label}>සටහනක් (විකල්ප)</Text>
      <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="උදා: ඇණවුම් කළ විට දින 2කින්" placeholderTextColor={Colors.textMuted} />
    </Sheet>
  );
};

export const Chip: React.FC<{ label: string; on: boolean; onPress: () => void; small?: boolean }> = ({ label, on, onPress, small }) => (
  <Pressable style={[styles.chip, small && styles.chipSmall, on && styles.chipOn]} onPress={onPress}>
    <Text style={[styles.chipText, small && styles.chipTextSmall, on && styles.chipTextOn]}>{label}</Text>
  </Pressable>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    label: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 8 },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge() },
    chipSmall: { paddingHorizontal: 9, paddingVertical: 5 },
    chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    chipTextSmall: { fontSize: 10.5 },
    chipTextOn: { color: '#ffffff' },
    modelBox: { padding: 10, borderRadius: 14, backgroundColor: softFill(), gap: 6 },
    input: { backgroundColor: softFill(), borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMain, borderWidth: 1, borderColor: softEdge() },
    footer: { gap: 8 },
    error: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
  })
);
