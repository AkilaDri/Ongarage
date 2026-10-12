import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, FITMENT_MAKES, FONTS, fitStatus, getThemeMode, money, partNoExact, partNoMatches, themedStyles, type ShopListing, type ShopStockLine } from '@ongarage/shared';
import { Sheet } from '../Sheet';
import { CATEGORIES, OTHER, categoryOf, subOf } from './stockCategories';

const keyOf = (l: { name: string; partType: string }) => `${l.name}|${l.partType}`;

type Step = 'vehicle' | 'category' | 'sub' | 'parts';
const STEPS: { id: Step; label: string }[] = [
  { id: 'vehicle', label: 'වාහනය' },
  { id: 'category', label: 'වර්ගය' },
  { id: 'sub', label: 'උප වර්ගය' },
  { id: 'parts', label: 'කොටස්' },
];

/**
 * Checks whether a shop has a part, step by step: first the vehicle (make, model, year), then the part category the shop
 * stocks (engine, suspension, electrical…), then that category's sub-categories, then the parts themselves. A part
 * number or name typed at any step jumps straight to the matching parts. Each part can be added to the shop request.
 */
export const StockSearchSheet: React.FC<{
  visible: boolean;
  shop: ShopListing;
  stock: ShopStockLine[];
  picked: Record<string, number>;
  onChange: (key: string, by: number, max: number) => void;
  onClose: () => void;
  /** Ask the shop about a part it does not show (opens the request form for this shop). */
  onAsk?: (partName: string) => void;
}> = ({ visible, shop, stock, picked, onChange, onClose, onAsk }) => {
  const [step, setStep] = React.useState<Step>('vehicle');
  const [query, setQuery] = React.useState('');
  const [partNo, setPartNo] = React.useState('');
  const [make, setMake] = React.useState('');
  const [model, setModel] = React.useState('');
  const [yearText, setYearText] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [sub, setSub] = React.useState('');

  React.useEffect(() => {
    if (!visible) return;
    setStep('vehicle');
    setQuery('');
    setPartNo('');
    setMake('');
    setModel('');
    setYearText('');
    setCategory('');
    setSub('');
  }, [visible, shop.id]);

  const year = /^\d{4}$/.test(yearText.trim()) ? Number(yearText.trim()) : null;
  const q = query.trim().toLowerCase();
  const typing = !!(q || partNo.trim());
  const makes = FITMENT_MAKES.filter((m) => stock.some((l) => l.fits?.some((f) => f.make === m)));
  const models = make ? [...new Set(stock.flatMap((l) => (l.fits ?? []).filter((f) => f.make === make).flatMap((f) => f.models)))] : [];

  // What fits the chosen vehicle; everything after the first step works from this list.
  const fitOf = (l: ShopStockLine) => fitStatus(l.fits, make, model, year);
  const forVehicle = stock.filter((l) => fitOf(l) !== 'no');
  const catsHere = [...CATEGORIES, OTHER]
    .map((c) => ({ ...c, count: forVehicle.filter((l) => categoryOf(l.name).id === c.id).length }))
    .filter((c) => c.count > 0);
  const inCategory = forVehicle.filter((l) => !category || categoryOf(l.name).id === category);
  const subs = [...new Set(inCategory.map((l) => subOf(l.name)))].map((name) => ({ name, count: inCategory.filter((l) => subOf(l.name) === name).length }));
  const chosenCat = catsHere.find((c) => c.id === category);

  const results = typing
    ? forVehicle.filter((l) => (!q || `${l.name} ${l.partType} ${l.brand ?? ''}`.toLowerCase().includes(q)) && partNoMatches(l.partNo, partNo))
    : inCategory.filter((l) => !sub || subOf(l.name) === sub);
  const sections = [...CATEGORIES, OTHER]
    .map((c) => ({ ...c, items: results.filter((l) => categoryOf(l.name).id === c.id) }))
    .filter((c) => c.items.length > 0);

  const vehicleLabel = [make, model, year].filter(Boolean).join(' ') || 'සියලුම වාහන';
  // The verdict: is the part the owner described really here, in stock, and right for the vehicle?
  const confirmed = results.filter((l) => fitOf(l) === 'fits' && l.qty > 0);
  const unsure = results.filter((l) => fitOf(l) === 'unknown' && l.qty > 0);
  const outOfStock = results.filter((l) => l.qty <= 0);
  const exactNo = partNo.trim() ? results.find((l) => partNoExact(l.partNo, partNo)) : undefined;
  const verdict =
    confirmed.length > 0
      ? { tone: 'ok' as const, title: exactNo ? '✅ කොටස් අංකය හරියටම ගැළපේ — තොගයේ ඇත' : `✅ ගැළපෙන කොටස් ${confirmed.length}ක් තොගයේ ඇත`, text: `${vehicleLabel} සඳහා මෙම වෙළඳසැලේ ඇත.` }
      : unsure.length > 0
        ? { tone: 'warn' as const, title: `⚠️ කොටස් ${unsure.length}ක් තොගයේ ඇත — ගැළපීම තහවුරු නැත`, text: 'වෙළඳසැල මෙම කොටසට වාහන ලැයිස්තුවක් දී නැත. මිලදී ගන්නට පෙර වෙළඳසැලෙන් තහවුරු කරගන්න.' }
        : outOfStock.length > 0
          ? { tone: 'bad' as const, title: '⛔ ගැළපෙන කොටස ඇත, නමුත් දැන් තොගයේ නැත', text: 'තොගය නැවත පිරෙන විට දැනගන්න වෙළඳසැලෙන් අසන්න.' }
          : { tone: 'bad' as const, title: '❌ මෙම කොටස මෙම වෙළඳසැලේ නැත', text: 'වෙනත් වෙළඳසැලක් බලන්න, නැතහොත් මෙම වෙළඳසැලෙන් අසන්න.' };
  const pickedCount = Object.values(picked).reduce((n, v) => n + v, 0);
  const showParts = typing || step === 'parts';
  const stepIndex = STEPS.findIndex((s) => s.id === (showParts ? 'parts' : step));
  const fitText = (l: ShopStockLine) => {
    const fits = (l.fits ?? []).filter((f) => !make || f.make === make);
    return fits.map((f) => `${f.make} ${f.models.slice(0, 3).join('/')} ${f.from}–${f.to}`).join('  ·  ');
  };
  const back = () => {
    if (step === 'parts') setStep('sub');
    else if (step === 'sub') setStep('category');
    else setStep('vehicle');
  };
  const pickCategory = (id: string) => {
    setCategory(id);
    setSub('');
    setStep('sub');
  };

  const renderPart = (l: ShopStockLine, tint: string, emoji: string) => {
    const key = keyOf(l);
    const qty = picked[key] ?? 0;
    const out = l.qty <= 0;
    return (
      <View key={key} style={[styles.row, qty > 0 && styles.rowOn, out && styles.rowOut]} accessibilityLabel={`Stock ${l.name}`}>
        <View style={[styles.photo, { backgroundColor: tint }]}>
          <Text style={styles.photoIcon}>{emoji}</Text>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.name} numberOfLines={2}>{l.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {l.partType}
            {l.brand ? ` · ${l.brand}` : ''}
            {l.partNo ? ` · # ${l.partNo}` : ''}
          </Text>
          {!!fitText(l) && <Text style={styles.fit} numberOfLines={2}>🚗 {fitText(l)}</Text>}
          {fitOf(l) === 'unknown' && <Text style={styles.fitUnknown}>? ගැළපීම තහවුරු නැත — වෙළඳසැලෙන් අසන්න</Text>}
          {partNoExact(l.partNo, partNo) && <Text style={styles.fitExact}>✓ කොටස් අංකය හරියටම ගැළපේ</Text>}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{money(l.price)}</Text>
            <View style={[styles.stockTag, out ? styles.stockOut : l.qty <= 2 ? styles.stockLow : styles.stockIn]}>
              <Text style={[styles.stockTagText, out ? styles.stockOutText : l.qty <= 2 ? styles.stockLowText : styles.stockInText]}>
                {out ? 'තොගයේ නැත' : l.qty <= 2 ? `අවසන් ${l.qty}` : `තොගයේ ${l.qty}`}
              </Text>
            </View>
          </View>
        </View>
        {out ? null : qty === 0 ? (
          <Pressable style={styles.addBtn} onPress={() => onChange(key, 1, l.qty)} accessibilityLabel={`Add ${l.name}`}>
            <Text style={styles.addText}>+</Text>
          </Pressable>
        ) : (
          <View style={styles.stepper}>
            <Pressable onPress={() => onChange(key, -1, l.qty)} hitSlop={6}>
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text style={styles.stepQty}>{qty}</Text>
            <Pressable onPress={() => onChange(key, 1, l.qty)} hitSlop={6}>
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <Sheet
      visible={visible}
      title="තොගය පරීක්ෂා කරන්න"
      subtitle={`${shop.name} · කොටස් ${stock.length}`}
      onClose={onClose}
      footer={<ActionButton label={pickedCount > 0 ? `අවසන් · ඉල්ලීමට කොටස් ${pickedCount}` : 'වසන්න'} variant="primary" onPress={onClose} />}
    >
      <View style={styles.wrap}>
        <View style={styles.stepper4}>
          {STEPS.map((s, i) => (
            <View key={s.id} style={styles.stepItem}>
              <View style={[styles.stepDot, i <= stepIndex && styles.stepDotOn]}>
                <Text style={[styles.stepDotText, i <= stepIndex && styles.stepDotTextOn]}>{i < stepIndex ? '✓' : i + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, i === stepIndex && styles.stepLabelOn]} numberOfLines={1}>{s.label}</Text>
            </View>
          ))}
        </View>

        {step === 'vehicle' ? (
          <>
            <Text style={styles.heading}>🚗 ඔබගේ වාහනය තෝරන්න</Text>
            <Text style={styles.label}>වාහන වර්ගය</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Pressable style={[styles.chip, !make && styles.chipOn]} onPress={() => { setMake(''); setModel(''); }}>
                <Text style={[styles.chipText, !make && styles.chipTextOn]}>සියල්ල</Text>
              </Pressable>
              {makes.map((m) => (
                <Pressable key={m} style={[styles.chip, make === m && styles.chipOn]} onPress={() => { setMake(make === m ? '' : m); setModel(''); }} accessibilityLabel={`Make ${m}`}>
                  <Text style={[styles.chipText, make === m && styles.chipTextOn]}>{m}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {models.length > 0 && (
              <>
                <Text style={styles.label}>මාදිලිය</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {models.map((m) => (
                    <Pressable key={m} style={[styles.chip, model === m && styles.chipOn]} onPress={() => setModel(model === m ? '' : m)} accessibilityLabel={`Model ${m}`}>
                      <Text style={[styles.chipText, model === m && styles.chipTextOn]}>{m}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
            <Text style={styles.label}>නිෂ්පාදන වර්ෂය</Text>
            <TextInput style={styles.input} value={yearText} onChangeText={(t) => setYearText(t.replace(/[^0-9]/g, '').slice(0, 4))} placeholder="උදා: 2015" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" maxLength={4} accessibilityLabel="Vehicle year" />
            <ActionButton label={`ඊළඟ · ${vehicleLabel} →`} variant="primary" onPress={() => setStep('category')} />
          </>
        ) : (
          <>
            <Pressable style={styles.vehicleBar} onPress={() => { setQuery(''); setPartNo(''); setStep('vehicle'); }} accessibilityLabel="Change vehicle">
              <Text style={styles.vehicleBarText} numberOfLines={1}>🚗 {vehicleLabel}</Text>
              <Text style={styles.vehicleBarEdit}>වෙනස් කරන්න</Text>
            </Pressable>
            <View style={styles.twoCol}>
              <TextInput style={[styles.input, styles.flex1]} value={query} onChangeText={setQuery} placeholder="🔍 කොටසක නම" placeholderTextColor={Colors.textMuted} accessibilityLabel="Search this shop's parts" />
              <TextInput style={[styles.input, styles.partNoInput]} value={partNo} onChangeText={setPartNo} placeholder="# අංකය" placeholderTextColor={Colors.textMuted} autoCapitalize="characters" accessibilityLabel="Part number" />
            </View>

            {!typing && step !== 'category' && (
              <Pressable onPress={back} hitSlop={8} accessibilityLabel="Back">
                <Text style={styles.backLink}>‹ ආපසු{step === 'parts' && sub ? ` · ${sub}` : ''}</Text>
              </Pressable>
            )}

            {!typing && step === 'category' && (
              <>
                <Text style={styles.heading}>🗂️ කොටස් වර්ගය තෝරන්න</Text>
                {catsHere.length === 0 ? (
                  <Text style={styles.empty}>මෙම වාහනයට ගැළපෙන කොටසක් මෙම වෙළඳසැලේ නැත. වෙනත් වාහනයක් තෝරන්න.</Text>
                ) : (
                  <View style={styles.catGrid}>
                    {catsHere.map((c) => (
                      <Pressable key={c.id} style={[styles.catTile, { backgroundColor: c.tint }]} onPress={() => pickCategory(c.id)} accessibilityLabel={`Category ${c.name}`}>
                        <Text style={styles.catEmoji}>{c.emoji}</Text>
                        <Text style={styles.catName} numberOfLines={2}>{c.name}</Text>
                        <Text style={styles.catCount}>{c.count} කොටස්</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}

            {!typing && step === 'sub' && (
              <>
                <Text style={styles.heading}>
                  {chosenCat?.emoji} {chosenCat?.name} · උප වර්ගය
                </Text>
                <Pressable style={styles.subRow} onPress={() => { setSub(''); setStep('parts'); }} accessibilityLabel="All sub categories">
                  <Text style={styles.subName}>සියලුම {chosenCat?.name} කොටස්</Text>
                  <Text style={styles.subCount}>{inCategory.length} ›</Text>
                </Pressable>
                {subs.map((s) => (
                  <Pressable key={s.name} style={styles.subRow} onPress={() => { setSub(s.name); setStep('parts'); }} accessibilityLabel={`Sub category ${s.name}`}>
                    <Text style={styles.subName}>{s.name}</Text>
                    <Text style={styles.subCount}>{s.count} ›</Text>
                  </Pressable>
                ))}
              </>
            )}

            {showParts && (
              <>
                <View style={[styles.verdict, verdict.tone === 'ok' ? styles.verdictOk : verdict.tone === 'warn' ? styles.verdictWarn : styles.verdictBad]} accessibilityLabel="Availability verdict">
                  <Text style={styles.verdictTitle}>{verdict.title}</Text>
                  <Text style={styles.verdictText}>{verdict.text}</Text>
                  {verdict.tone !== 'ok' && !!onAsk && (
                    <Pressable style={styles.verdictBtn} onPress={() => onAsk(query.trim() || partNo.trim())} accessibilityLabel="Ask the shop about this part">
                      <Text style={styles.verdictBtnText}>📨 මෙම කොටස වෙළඳසැලෙන් අසන්න</Text>
                    </Pressable>
                  )}
                </View>
                <Text style={styles.summaryText}>
                  {results.length === 0 ? 'ගැළපෙන කොටසක් නැත' : `ගැළපෙන කොටස් ${results.length}${results.some((l) => l.qty > 0) ? '' : ' · තොගයේ නැත'}`}
                </Text>
                {results.length === 0 ? (
                  <Text style={styles.empty}>මෙම වාහනයට / අංකයට ගැළපෙන කොටසක් මෙම වෙළඳසැලේ නැත. වෙනත් වාහනයක් හෝ වර්ගයක් තෝරන්න, නැතහොත් වෙළඳසැලෙන් අසන්න.</Text>
                ) : (
                  sections.map((sec) => (
                    <View key={sec.id} style={styles.section}>
                      <Text style={styles.sectionHead}>
                        {sec.emoji} {sec.name} <Text style={styles.sectionCount}>({sec.items.length})</Text>
                      </Text>
                      {sec.items.map((l) => renderPart(l, sec.tint, sec.emoji))}
                    </View>
                  ))
                )}
              </>
            )}
          </>
        )}
      </View>
    </Sheet>
  );
};

const edge = () => (getThemeMode() === 'dark' ? Colors.borderColor : '#cfd8e3');
const blue = () => (getThemeMode() === 'dark' ? '#8db1ff' : '#2457e6');

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    // The Sheet pads its body 18px; pull the content out so it sits 6px from the edges.
    wrap: { marginHorizontal: -12, gap: 10 },
    input: { height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#f4f7fb', borderWidth: 1, borderColor: edge(), color: Colors.textMain, fontSize: 13, fontFamily: FONTS.bodyRegular },
    twoCol: { flexDirection: 'row', gap: 8 },
    label: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMuted, marginTop: 2 },
    heading: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    stepper4: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
    stepItem: { flex: 1, alignItems: 'center', gap: 4 },
    stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#e2e8f0' },
    stepDotOn: { backgroundColor: '#2457e6' },
    stepDotText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMuted },
    stepDotTextOn: { color: '#ffffff' },
    stepLabel: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    stepLabelOn: { color: Colors.textMain, fontFamily: FONTS.bodyBold },
    vehicleBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 14, height: 40, borderRadius: 20, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.14)' : '#e3ecfd' },
    vehicleBarText: { flex: 1, fontSize: 12.5, fontFamily: FONTS.bodyBold, color: blue() },
    vehicleBarEdit: { fontSize: 11, fontFamily: FONTS.bodyBold, color: blue() },
    backLink: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: blue(), paddingVertical: 2 },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catTile: { width: '31.6%', padding: 10, gap: 3, borderRadius: 18, alignItems: 'center' },
    catEmoji: { fontSize: 28 },
    catName: { fontSize: 12, fontFamily: FONTS.titleBold, color: '#1b2a49', textAlign: 'center' },
    catCount: { fontSize: 10, fontFamily: FONTS.bodyMedium, color: '#475569' },
    subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: edge() },
    subName: { flex: 1, fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    subCount: { fontSize: 12, fontFamily: FONTS.bodyBold, color: blue() },
    verdict: { gap: 6, padding: 14, borderRadius: 18, borderWidth: 1 },
    verdictOk: { backgroundColor: 'rgba(16, 185, 129, 0.14)', borderColor: 'rgba(16, 185, 129, 0.5)' },
    verdictWarn: { backgroundColor: 'rgba(245, 158, 11, 0.16)', borderColor: 'rgba(245, 158, 11, 0.55)' },
    verdictBad: { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.45)' },
    verdictTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    verdictText: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    verdictBtn: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: '#2457e6' },
    verdictBtnText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    fitUnknown: { fontSize: 10, fontFamily: FONTS.bodyBold, color: '#b45309', marginTop: 2 },
    fitExact: { fontSize: 10, fontFamily: FONTS.bodyBold, color: Colors.successText, marginTop: 2 },
    partNoInput: { width: 120 },
    chipRow: { gap: 8, paddingRight: 6 },
    chip: { paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: edge() },
    chipSmall: { height: 30, paddingHorizontal: 12 },
    chipOn: { backgroundColor: '#2457e6', borderColor: '#2457e6' },
    chipText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: '#ffffff' },
    summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
    summaryText: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    clear: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: blue() },
    empty: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18, padding: 14, borderRadius: 16, backgroundColor: Colors.subtleFill },
    section: { gap: 8 },
    sectionHead: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 6 },
    sectionCount: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: edge() },
    rowOn: { borderColor: '#2457e6', borderWidth: 2 },
    rowOut: { opacity: 0.6 },
    photo: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    photoIcon: { fontSize: 24 },
    name: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    meta: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    fit: { fontSize: 10, fontFamily: FONTS.bodyMedium, color: blue(), marginTop: 2, lineHeight: 14 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    price: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.successText },
    stockTag: { paddingHorizontal: 8, height: 20, borderRadius: 10, justifyContent: 'center' },
    stockTagText: { fontSize: 10, fontFamily: FONTS.bodyBold },
    stockIn: { backgroundColor: 'rgba(16, 185, 129, 0.16)' },
    stockInText: { color: Colors.successText },
    stockLow: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
    stockLowText: { color: '#b45309' },
    stockOut: { backgroundColor: 'rgba(239, 68, 68, 0.14)' },
    stockOutText: { color: Colors.errorText },
    addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2457e6' },
    addText: { fontSize: 20, lineHeight: 22, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    stepper: { width: 82, height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, borderRadius: 17, backgroundColor: '#2457e6' },
    stepText: { fontSize: 18, lineHeight: 20, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    stepQty: { fontSize: 13, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  })
);
