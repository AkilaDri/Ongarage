import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ActionButton,
  Colors,
  FONTS,
  MAX_MAKES_PER_ENTRY,
  PART_TAXONOMY_GROUPS,
  SHOP_TEMPLATES,
  VEHICLE_KIND_LABEL,
  VEHICLE_MAKES,
  catalogueFromTemplates,
  cataloguesMakes,
  partInfo,
  partsInGroup,
  softEdge,
  softFill,
  themedStyles,
  validateCatalogue,
  type ShopCatalogue,
  type VehicleKind,
} from '@ongarage/shared';
import { useShop } from '../context/ShopContext';
import { ALL_TYPES } from '../constants/mockData';
import { Chip } from './CatalogueEntrySheet';
import type { QuoteType } from '../types';

const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
const STEPS = ['ආරම්භය', 'ප්‍රවර්ග', 'වාහන', 'සමාලෝචනය'];

/**
 * First launch: the shop says what it sells (ready-made starting points, then the full list of part categories),
 * for which vehicles and which part types. It can change all of it later in the Catalogue tab.
 */
export const OnboardingWizard: React.FC = () => {
  const { profile, saveShopCatalogue } = useShop();
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [parts, setParts] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [makes, setMakes] = useState<string[]>([]);
  const [kind, setKind] = useState<VehicleKind>('car');
  const [types, setTypes] = useState<QuoteType[]>(['Genuine', 'OEM']);

  const pickTemplate = (id: string) => {
    const next = toggle(templates, id);
    setTemplates(next);
    const c = catalogueFromTemplates(next);
    setGroups([...new Set([...groups.filter((g) => !templates.some((t) => catalogueFromTemplates([t]).some((e) => e.groupId === g))), ...c.map((e) => e.groupId)])]);
    setMakes(cataloguesMakes(c).slice(0, MAX_MAKES_PER_ENTRY));
  };

  const build = (): ShopCatalogue => {
    const base = { vehicles: makes.map((make) => ({ make })), brands: [], partTypes: types, addedAt: Date.now() };
    return [
      ...groups.map((g) => ({ ...base, id: `e-${g}`, groupId: g })),
      ...parts.flatMap((p) => {
        const groupId = partInfo(p)?.groupId;
        return groupId && !groups.includes(groupId) ? [{ ...base, id: `e-${p}`, groupId, partId: p }] : [];
      }),
    ];
  };
  const catalogue = build();
  const problems = validateCatalogue(catalogue);
  const canNext = step === 0 ? true : step === 1 ? groups.length + parts.length > 0 : step === 2 ? types.length > 0 : problems.length === 0;

  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <Text style={styles.title}>{profile.name} · සැකසීම</Text>
        <View style={styles.dots}>
          {STEPS.map((s, i) => (
            <View key={s} style={[styles.dot, i <= step && styles.dotOn]} />
          ))}
        </View>
        <Text style={styles.sub}>
          පියවර {step + 1}/{STEPS.length} · {STEPS[step]}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <>
            <Text style={styles.h}>ඔබ අලෙවි කරන්නේ මොනවාද?</Text>
            <Text style={styles.hint}>තොගයක් ගණන් කරන්න අවශ්‍ය නැත. ඔබ අලෙවි කරන කොටස් වර්ග සහ වාහන තෝරන්න — ගනුදෙනුකරුවන්ගේ සෙවුම් ඒවාට ගැළපෙන විට ඉල්ලීම ඔබට එයි.</Text>
            {SHOP_TEMPLATES.map((t) => (
              <Pressable key={t.id} style={[styles.card, templates.includes(t.id) && styles.cardOn]} onPress={() => pickTemplate(t.id)}>
                <View style={styles.flex1}>
                  <Text style={styles.name}>{t.name}</Text>
                  <Text style={styles.hint}>{t.hint}</Text>
                </View>
                <Text style={styles.tick}>{templates.includes(t.id) ? '✓' : '＋'}</Text>
              </Pressable>
            ))}
            <Text style={styles.hint}>සූදානම් කළ ආරම්භයක් නොගන්නේ නම් ඊළඟ පියවරේ ඔබම තෝරන්න.</Text>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.h}>කොටස් ප්‍රවර්ග</Text>
            <Text style={styles.hint}>ප්‍රවර්ගයක් සම්පූර්ණයෙන් තෝරන්න, නැත්නම් විවෘත කර තනි කොටස් තෝරන්න. පසුව “Catalogue” ටැබයෙන් තවත් එක් කළ හැක.</Text>
            {PART_TAXONOMY_GROUPS.map((g) => {
              const on = groups.includes(g.id);
              const items = partsInGroup(g.id);
              const some = items.filter((p) => parts.includes(p.id)).length;
              return (
                <View key={g.id} style={[styles.group, (on || some > 0) && styles.cardOn]}>
                  <View style={styles.groupHead}>
                    <Pressable style={[styles.check, on && styles.checkOn]} onPress={() => setGroups((p) => toggle(p, g.id))} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                      {on && <Text style={styles.checkMark}>✓</Text>}
                    </Pressable>
                    <Pressable style={styles.flex1} onPress={() => setOpen(open === g.id ? null : g.id)}>
                      <Text style={styles.name}>
                        {g.icon} {g.si}
                      </Text>
                      <Text style={styles.hint}>
                        {on ? 'සියල්ල' : some ? `කොටස් ${some}ක්` : `කොටස් වර්ග ${items.length}`} {open === g.id ? '▴' : '▾'}
                      </Text>
                    </Pressable>
                  </View>
                  {open === g.id && !on && (
                    <View style={styles.chips}>
                      {items.map((p) => (
                        <Chip key={p.id} small label={p.si || p.name} on={parts.includes(p.id)} onPress={() => setParts((x) => toggle(x, p.id))} />
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.h}>කුමන වාහන සඳහාද?</Text>
            <Text style={styles.hint}>කිසිවක් තෝරන්නේ නැත්නම් සියලු වාහන සඳහා. උපරිම {MAX_MAKES_PER_ENTRY}ක්. පසුව එක් එක් කොටසට වෙන වෙනම මාදිලි සහ කේත තෝරන්න පුළුවන්.</Text>
            <View style={styles.chips}>
              {(Object.keys(VEHICLE_KIND_LABEL) as VehicleKind[]).map((k) => (
                <Chip key={k} label={VEHICLE_KIND_LABEL[k]} on={kind === k} onPress={() => setKind(k)} />
              ))}
            </View>
            <View style={styles.chips}>
              {VEHICLE_MAKES.filter((m) => m.kind === kind || makes.includes(m.make)).map((m) => (
                <Chip key={m.make} label={m.make} on={makes.includes(m.make)} onPress={() => setMakes((p) => (p.includes(m.make) ? p.filter((x) => x !== m.make) : p.length < MAX_MAKES_PER_ENTRY ? [...p, m.make] : p))} />
              ))}
            </View>
            <Text style={styles.h}>කොටස් වර්ග</Text>
            <View style={styles.chips}>
              {ALL_TYPES.map((t) => (
                <Chip key={t} label={t} on={types.includes(t)} onPress={() => setTypes((p) => toggle(p, t))} />
              ))}
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.h}>ඔබේ Catalogue</Text>
            <Text style={styles.hint}>
              {groups.length} සම්පූර්ණ ප්‍රවර්ග{parts.length ? ` · තනි කොටස් ${parts.length}` : ''} · {makes.length ? makes.join(', ') : 'සියලු වාහන'} · {types.join(' / ')}
            </Text>
            {catalogue.map((e) => {
              const g = PART_TAXONOMY_GROUPS.find((x) => x.id === e.groupId);
              return (
                <View key={e.id} style={styles.card}>
                  <Text style={styles.name}>
                    {g?.icon} {e.partId ? partsInGroup(e.groupId).find((p) => p.id === e.partId)?.si : `${g?.si} (සියල්ල)`}
                  </Text>
                </View>
              );
            })}
            {!!problems.length && <Text style={styles.error}>{problems[0]}</Text>}
          </>
        )}
      </ScrollView>
      <View style={styles.footer}>
        {step > 0 && <ActionButton label="ආපසු" variant="ghost" onPress={() => setStep(step - 1)} />}
        <View style={styles.flex1}>
          {step < STEPS.length - 1 ? (
            <ActionButton label={step === 0 && !templates.length ? 'මම ම තෝරා ගන්නම්' : 'ඊළඟ'} variant="primary" disabled={!canNext} onPress={() => setStep(step + 1)} />
          ) : (
            <ActionButton label="අවසන් කරන්න" icon="✓" variant="primary" disabled={!canNext} onPress={() => saveShopCatalogue(catalogue)} />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    root: { ...StyleSheet.absoluteFill, zIndex: 100, elevation: 100, backgroundColor: Colors.bgBody },
    flex1: { flex: 1 },
    bar: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: Colors.borderColor },
    title: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    dots: { flexDirection: 'row', gap: 6 },
    dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },
    dotOn: { backgroundColor: Colors.primary },
    sub: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    body: { padding: 16, gap: 10, paddingBottom: 30 },
    h: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    hint: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    name: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge() },
    cardOn: { borderColor: Colors.primary, backgroundColor: 'rgba(56, 189, 248, 0.08)' },
    tick: { fontSize: 18, color: Colors.primary, fontWeight: '800' },
    group: { padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), gap: 8 },
    groupHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: Colors.subtleBorder, alignItems: 'center', justifyContent: 'center' },
    checkOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    checkMark: { fontSize: 14, fontWeight: '900', color: '#ffffff' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    footer: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: Colors.borderColor, backgroundColor: softFill() },
    error: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
  })
);
