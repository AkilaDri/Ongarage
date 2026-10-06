import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, themedStyles } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { ActionButton } from '../Glass';
import { Sheet } from '../Sheet';
import { PhotoStrip } from '../PhotoStrip';
import { getAi } from '../../ai';
import { linesTotal } from '../../marketplace/workshop';
import { formatDate, formatTime, money } from '../../utils/format';
import type { DiagnosisLine, DiagnosisReport, PartType } from '../../types';

const HOUR = 60 * 60 * 1000;
const PART_TYPES: PartType[] = ['Genuine', 'OEM', 'Recon'];
const TYPE_LABEL: Record<PartType, string> = { Genuine: 'Genuine', OEM: 'OEM', Recon: 'Recon', GarageChoice: 'ගරාජයේ තේරීම' };

const at = (dayOffset: number, hour: number) => {
  const d = new Date(Date.now() + dayOffset * 24 * HOUR);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
};

/**
 * The diagnosis report a garage or its technician sends after inspecting the vehicle:
 * what's wrong, photos, and every part / labour line with a price. The owner approves
 * all, some, or none — nothing beyond the agreed price is charged without that.
 */
export const DiagnosisSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  overlay?: React.ReactNode;
  subject: { title: string; vehicle: string };
  /** The price already agreed (bid or estimate); lines come on top of it. */
  agreedPrice: number;
  /** The part type the owner chose when posting; only 'GarageChoice' lets the garage pick. */
  ownerPartType?: PartType;
  /** Typical price for a part (for AI-suggested and typed lines). */
  priceFor?: (name: string, type: PartType) => number;
  /** Stand-in photos until camera access in the native build. */
  samplePhotos: string[];
  onSend: (report: DiagnosisReport) => void;
  /**
   * Extra work found during the repair: same lines and approval, but agreedPrice is the
   * current total and at least one line is needed.
   */
  extra?: boolean;
}> = ({ visible, onClose, overlay, subject, agreedPrice, ownerPartType = 'GarageChoice', priceFor, samplePhotos, onSend, extra }) => {
  const [findings, setFindings] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [lines, setLines] = useState<DiagnosisLine[]>([]);
  const [partName, setPartName] = useState('');
  const [labourName, setLabourName] = useState('');
  const [labourPrice, setLabourPrice] = useState('');
  const [finishBy, setFinishBy] = useState(at(0, 17));
  const [aiNote, setAiNote] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setFindings('');
    setPhotos([]);
    setLines([]);
    setPartName('');
    setLabourName('');
    setLabourPrice('');
    setFinishBy(Date.now() < at(0, 15) ? at(0, 17) : at(1, 12));
    setAiNote(null);
  }, [visible]);

  const lockedType = ownerPartType !== 'GarageChoice';
  const defaultType: PartType = lockedType ? ownerPartType : 'OEM';
  const price = (name: string, t: PartType) => (priceFor ? priceFor(name, t) : 0);

  const addPart = (name: string, qty = 1) => {
    const n = name.trim();
    if (!n || lines.some((l) => l.kind === 'part' && l.name === n)) return;
    setLines((prev) => [...prev, { id: `dl-${Date.now()}-${prev.length}`, kind: 'part', name: n, qty, partType: defaultType, source: 'order', price: price(n, defaultType) * qty }]);
  };
  const addLabour = () => {
    const n = labourName.trim();
    const p = Number(labourPrice) || 0;
    if (!n || p <= 0) return;
    setLines((prev) => [...prev, { id: `dl-${Date.now()}-${prev.length}`, kind: 'labour', name: n, qty: 1, price: p }]);
    setLabourName('');
    setLabourPrice('');
  };
  const patch = (id: string, change: Partial<DiagnosisLine>) => setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...change } : l)));

  const suggest = async () => {
    const r = await getAi().suggestParts(findings);
    r.value.parts.forEach((p) => addPart(p.name, p.qty));
    setAiNote(r.value.parts.length ? `🤖 සටහනෙන් කොටස් ${r.value.parts.length}ක් හමු විය — මිල සහ වර්ගය පරීක්ෂා කරන්න.` : '🤖 සටහනේ කොටස් නම් හමු නොවීය — අතින් එක් කරන්න.');
  };

  const total = agreedPrice + linesTotal(lines);
  const valid = findings.trim().length >= 5 && (!extra || lines.length > 0);
  const finishOptions = [
    { t: at(0, 17), label: 'අද ප.ව. 5ට' },
    { t: at(1, 12), label: 'හෙට දහවල් 12ට' },
    { t: at(1, 17), label: 'හෙට ප.ව. 5ට' },
    { t: at(2, 17), label: 'අනිද්දා ප.ව. 5ට' },
  ].filter((o) => o.t > Date.now() + HOUR);

  const send = () => {
    onSend({ findings: findings.trim(), photos, lines, revisedTotal: total, finishBy, sentAt: Date.now() });
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      title={extra ? 'අමතර වැඩ — අයිතිකරුගේ අනුමැතියට' : 'පරීක්ෂා වාර්තාව'}
      subtitle={`${subject.title} · ${subject.vehicle}`}
      onClose={onClose}
      overlay={overlay}
      footer={<ActionButton label={`අයිතිකරුගේ අනුමැතියට යවන්න · ${money(total)}`} icon="📨" variant="primary" disabled={!valid} onPress={send} />}
    >
      {extra && <Text style={styles.hint}>අලුත්වැඩියාව අතරතුර හමු වූ දෙයක්: අයිතිකරු අනුමත කරන තුරු මෙම කොටස් ඇණවුම් කරන්න හෝ වැඩ කරන්න එපා. පිළිතුර ලැබෙන තුරු භාරදීම නතර වේ.</Text>}
      <Text style={styles.label}>{extra ? 'හමු වූ දේ සහ හේතුව' : 'සොයා ගත් දේ'}</Text>
      <TextInput
        style={styles.area}
        value={findings}
        onChangeText={setFindings}
        placeholder="උදා: ඉදිරිපස බ්‍රේක් පෑඩ් ගෙවී ඇත, brake fluid ද මාරු කළ යුතුයි"
        placeholderTextColor={Colors.textMuted}
        multiline
        accessibilityLabel="Diagnosis findings"
      />
      <PhotoStrip photos={photos} height={76} onAdd={photos.length < 6 ? () => setPhotos((p) => [...p, samplePhotos[p.length % samplePhotos.length]]) : undefined} addLabel="ඡායාරූපයක්" />

      <View style={styles.rowBetween}>
        <Text style={styles.label}>කොටස් සහ වැඩ</Text>
        <Pressable onPress={suggest} disabled={findings.trim().length < 5} hitSlop={6} accessibilityLabel="Suggest parts from note">
          <Text style={[styles.link, findings.trim().length < 5 && styles.off]}>🤖 සටහනෙන් කොටස් යෝජනා කරන්න</Text>
        </Pressable>
      </View>
      {!!aiNote && <Text style={styles.hint}>{aiNote}</Text>}

      {lines.map((l) => (
        <View key={l.id} style={styles.line}>
          <View style={styles.rowBetween}>
            <Text style={styles.lineName} numberOfLines={1}>
              {l.kind === 'part' ? '🔩' : '🔧'} {l.name}
              {l.kind === 'part' && l.qty > 1 ? ` ×${l.qty}` : ''}
            </Text>
            <Pressable onPress={() => setLines((prev) => prev.filter((x) => x.id !== l.id))} hitSlop={6} accessibilityLabel={`Remove ${l.name}`}>
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          </View>
          <View style={styles.lineRow}>
            {l.kind === 'part' && (
              <>
                <Chip label="තොගයේ" on={l.source === 'stock'} onPress={() => patch(l.id, { source: 'stock' })} />
                <Chip label="ඇණවුම් කළ යුතුයි" on={l.source === 'order'} onPress={() => patch(l.id, { source: 'order' })} />
              </>
            )}
            <View style={styles.priceBox}>
              <Text style={styles.currency}>රු.</Text>
              <TextInput
                style={styles.priceInput}
                keyboardType="number-pad"
                value={String(l.price || '')}
                onChangeText={(t) => patch(l.id, { price: Number(t.replace(/[^0-9]/g, '')) || 0 })}
                maxLength={7}
                accessibilityLabel={`Price ${l.name}`}
              />
            </View>
          </View>
          {l.kind === 'part' && (
            <View style={styles.lineRow}>
              {lockedType ? (
                <Text style={styles.hint}>🔒 අයිතිකරු තෝරා ඇත: {TYPE_LABEL[ownerPartType]}</Text>
              ) : (
                PART_TYPES.map((t) => <Chip key={t} label={t} on={l.partType === t} onPress={() => patch(l.id, { partType: t, price: price(l.name, t) * l.qty || l.price })} small />)
              )}
            </View>
          )}
        </View>
      ))}

      <View style={styles.addRow}>
        <TextInput style={[styles.input, styles.flex1]} value={partName} onChangeText={setPartName} placeholder="කොටසක් (උදා: Brake pads (front))" placeholderTextColor={Colors.textMuted} accessibilityLabel="New part name" />
        <Pressable
          style={[styles.addBtn, !partName.trim() && styles.off]}
          disabled={!partName.trim()}
          onPress={() => {
            addPart(partName);
            setPartName('');
          }}
        >
          <Text style={styles.addText}>+ කොටස</Text>
        </Pressable>
      </View>
      <View style={styles.addRow}>
        <TextInput style={[styles.input, styles.flex1]} value={labourName} onChangeText={setLabourName} placeholder="අමතර වැඩ (උදා: Wheel alignment)" placeholderTextColor={Colors.textMuted} accessibilityLabel="New labour name" />
        <TextInput
          style={[styles.input, styles.labourPrice]}
          value={labourPrice}
          onChangeText={(t) => setLabourPrice(t.replace(/[^0-9]/g, ''))}
          placeholder="රු."
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
          accessibilityLabel="New labour price"
        />
        <Pressable style={[styles.addBtn, (!labourName.trim() || !labourPrice) && styles.off]} disabled={!labourName.trim() || !labourPrice} onPress={addLabour}>
          <Text style={styles.addText}>+ වැඩ</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>අවසන් කළ හැකි වේලාව</Text>
      <View style={styles.chips}>
        {finishOptions.map((o) => (
          <Chip key={o.t} label={o.label} on={finishBy === o.t} onPress={() => setFinishBy(o.t)} />
        ))}
      </View>

      <View style={styles.summary}>
        <Row label={extra ? 'දැනට එකතුව' : 'එකඟ වූ මිල'} value={money(agreedPrice)} />
        <Row label={`අමතර පේළි ${lines.length}`} value={money(linesTotal(lines))} />
        <Row label="අනුමත කළහොත් නව එකතුව" value={money(total)} strong />
        <Text style={styles.hint}>
          අයිතිකරු අනුමත කරන පේළි පමණක් අය කෙරේ · අවසන් කිරීම {formatDate(finishBy)} {formatTime(finishBy)}
        </Text>
      </View>
    </Sheet>
  );
};

const Chip: React.FC<{ label: string; on: boolean; onPress: () => void; small?: boolean }> = ({ label, on, onPress, small }) => (
  <Pressable style={[styles.chip, small && styles.chipSmall, on && styles.chipOn]} onPress={onPress}>
    <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
  </Pressable>
);

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.rowBetween}>
    <Text style={strong ? styles.strong : styles.hint}>{label}</Text>
    <Text style={strong ? styles.strongValue : styles.value}>{value}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1, minWidth: 0 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4, marginTop: 6 },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    link: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    off: { opacity: 0.4 },
    area: {
      minHeight: 76,
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
    line: { padding: 10, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 8 },
    lineName: { flex: 1, fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    lineRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    remove: { fontSize: 13, color: Colors.textMuted, paddingHorizontal: 4 },
    priceBox: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 36, width: 112, marginLeft: 'auto', borderRadius: 10, backgroundColor: Colors.subtleFill, borderWidth: 1, borderColor: Colors.borderColor },
    currency: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    priceInput: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '800', color: Colors.textMain },
    addRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    input: {
      height: 42,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: Colors.borderColor,
      color: Colors.textMain,
      fontSize: 12,
      fontFamily: FONTS.bodyMedium,
    },
    labourPrice: { width: 80 },
    addBtn: { paddingHorizontal: 10, height: 42, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center' },
    addText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#fff' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.subtleFill },
    chipSmall: { paddingHorizontal: 8, paddingVertical: 4 },
    chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: '#fff' },
    summary: { padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 6, marginTop: 4 },
    value: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    strong: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    strongValue: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.success },
  })
);
