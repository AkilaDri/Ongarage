import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, FONTS, getThemeMode, inPersonLines, themedStyles } from '@ongarage/shared';
import { useWorkshops, type OwnerWorkshop } from '../../context/WorkshopContext';
import { useChat } from '../../context/ChatContext';
import { useJobPartStatuses, type JobPartStatus } from '../../utils/jobParts';
import { PartBuySheet } from './PartBuySheet';
import { partStatusText } from './partStatusText';
import { FlowButton } from '../FlowButton';
import { MediaAttachments } from '../MediaAttachments';
import { Sheet } from '../Sheet';

/**
 * The parts the owner has to get for a running job: a task, not an approval. One block per part with where it has got to and the one next action. It
 * shows whether the owner stays or leaves, since the repair waits for the part either way.
 */
export const JobPartTask: React.FC<{ workshop: OwnerWorkshop }> = ({ workshop: w }) => {
  const statusesOf = useJobPartStatuses();
  const { disputePart } = useWorkshops();
  const { openBasket, say } = useChat();
  // The part whose pop-up is open.
  const [openId, setOpenId] = useState<string | null>(null);
  const parts = statusesOf(w);
  if (parts.length === 0) return null;
  const open = parts.filter((s) => s.state !== 'done');
  const agreedHere = new Set(inPersonLines(w.progress).map((l) => l.id));
  const toAsk = parts.filter((s) => s.state === 'toAsk');

  const dispute = (s: JobPartStatus, disputed: boolean) => {
    disputePart(w.id, s.line.id, disputed);
    say(w.id, disputed ? `✋ අයිතිකරු කියනවා “${s.line.name}” ගැන එකඟ වුණේ නැත. කරුණාකර පරීක්ෂා කරන්න.` : `↩️ “${s.line.name}” ගැන දැනුම්දීම අයිතිකරු ආපසු ගත්තා.`);
  };

  return (
    <View style={styles.card} accessibilityLabel="Parts to get for this job">
      <Text style={styles.title}>{open.length === 0 ? '🔩 ඔබ ගෙන ආ කොටස්' : w.progress.stays ? '🔩 ඔබ කොටසක් ගෙන ආ යුතුයි' : '🔩 ඔබ මිලදී ගත යුතු කොටස්'}</Text>
      {parts.map((s) => (
        <View key={s.line.id} style={styles.part}>
          <Text style={styles.name}>
            {s.line.name} × {s.line.qty}
            {s.line.partType && s.line.partType !== 'GarageChoice' ? ` · ${s.line.partType}` : ''}
          </Text>
          {!!s.line.partNo && <Text style={styles.sub}>කොටස් අංකය {s.line.partNo}</Text>}
          {s.unconfirmed ? (
            <Text style={styles.warn}>✍️ ඔබ එක් කළා · ගරාජය තහවුරු කරන තුරු. තහවුරු වීමට පෙර මිලදී නොගන්න.</Text>
          ) : (
            agreedHere.has(s.line.id) && <Text style={styles.sub}>🤝 ගරාජයේදී එකඟ වූ</Text>
          )}
          {!!partStatusText(s) && <Text style={[styles.status, s.state === 'done' && styles.done, (s.state === 'held' || s.state === 'wrong') && styles.warn]}>{partStatusText(s)}</Text>}
          {s.state === 'toAsk' && toAsk.length === 1 && <FlowButton label="මිල ඉල්ලන්න" icon="🛍️" onPress={() => openBasket(w.id)} a11y={`Ask prices for ${s.line.name}`} />}
          {s.state !== 'toAsk' && s.state !== 'held' && s.state !== 'done' && (
            <FlowButton label={PART_ACTION[s.state] ?? 'විස්තර බලන්න'} variant={s.state === 'waiting' || s.state === 'checking' ? 'ghost' : s.state === 'toGive' ? 'success' : 'primary'} onPress={() => setOpenId(s.line.id)} a11y={`Open the part ${s.line.name}`} />
          )}
          {/* A safeguard against a wrong record: only for what was agreed face to face, and only until it is bought. */}
          {agreedHere.has(s.line.id) && ['toAsk', 'waiting', 'offers', 'reserved', 'held'].includes(s.state) && (
            <Pressable style={styles.linkRow} onPress={() => dispute(s, s.state !== 'held')} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${s.state === 'held' ? 'Take back the disagreement about' : 'I did not agree to'} ${s.line.name}`}>
              <Text style={styles.link}>{s.state === 'held' ? 'ආපසු ගන්න' : 'මම මෙයට එකඟ නොවුණා'}</Text>
            </Pressable>
          )}
        </View>
      ))}
      {toAsk.length > 1 && <FlowButton label="මිල ඉල්ලන්න" detail={`කොටස් ${toAsk.length}`} icon="🛍️" onPress={() => openBasket(w.id)} a11y="Ask prices for all the parts" />}
      {open.some((s) => !s.unconfirmed && s.state !== 'held') && <Text style={styles.sub}>⏸ මේ කොටස ලැබෙන තෙක් අදාළ වැඩය නවතා ඇත.</Text>}
      <PartBuySheet workshop={openId ? w : null} lineId={openId} onClose={() => setOpenId(null)} />
    </View>
  );
};

/** The one next action's name for each state with a pop-up. */
const PART_ACTION: Partial<Record<JobPartStatus['state'], string>> = {
  waiting: 'ඉල්ලීම බලන්න',
  offers: 'මිල සසඳන්න',
  reserved: 'කේතය සහ විස්තර',
  toGive: 'ගරාජයට භාර දෙන්න',
  checking: 'විස්තර බලන්න',
  wrong: 'ආපසු දෙන පියවර',
};

/** The backup for an owner at the garage: the technician asked for a part and has not recorded it yet. A name or a photo is enough. */
export const AddJobPart: React.FC<{ workshop: OwnerWorkshop }> = ({ workshop: w }) => {
  const { addPart } = useWorkshops();
  const { say } = useChat();
  const [shown, setShown] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const [photos, setPhotos] = useState<string[]>([]);
  const told = name.trim().length > 0 || photos.length > 0;
  const send = () => {
    const part = name.trim() || 'නම නොදන්නා කොටස';
    addPart(w.id, { name: part, qty, photos: photos.length ? photos : undefined });
    say(w.id, `✍️ කාර්මිකයා ඉල්ලූ බව අයිතිකරු කියන කොටස: ${part} ×${qty}. කරුණාකර තහවුරු කරන්න.`);
    setShown(false);
  };
  return (
    <>
      <Pressable
        style={styles.linkRow}
        onPress={() => {
          setName('');
          setQty(1);
          setPhotos([]);
          setShown(true);
        }}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="The technician asked me for a part"
      >
        <Text style={styles.link}>＋ කාර්මිකයා කොටසක් ඉල්ලුවා</Text>
      </Pressable>
      <Sheet
        visible={shown}
        title="කාර්මිකයා ඉල්ලූ කොටස"
        subtitle={w.garageName}
        onClose={() => setShown(false)}
        footer={<FlowButton label={told ? 'ගරාජයට තහවුරු කිරීමට යවන්න' : 'නමක් හෝ ඡායාරූපයක් දෙන්න'} disabled={!told} onPress={send} />}
      >
        <Text style={styles.sub}>ගරාජය තහවුරු කරන තුරු මෙය එකඟ වූ වැඩක් නොවේ, බිලටත් එක් නොවේ.</Text>
        <Text style={styles.label}>කොටසේ නම</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="උදා: Brake pad" placeholderTextColor={Colors.textMuted} accessibilityLabel="Part name" />
        <Text style={styles.label}>නම නොදන්නේ නම්, පැරණි කොටසේ හෝ ලියා දුන් කඩදාසියේ ඡායාරූපයක්</Text>
        <MediaAttachments photos={photos} voiceNotes={[]} onPhotos={setPhotos} onVoiceNotes={() => {}} />
        <Text style={styles.label}>ප්‍රමාණය</Text>
        <View style={styles.qtyRow}>
          <Pressable style={styles.qtyBtn} onPress={() => setQty((q) => Math.max(1, q - 1))} accessibilityLabel="Less">
            <Text style={styles.qtySign}>−</Text>
          </Pressable>
          <Text style={styles.qty}>{qty}</Text>
          <Pressable style={styles.qtyBtn} onPress={() => setQty((q) => Math.min(20, q + 1))} accessibilityLabel="More">
            <Text style={styles.qtySign}>＋</Text>
          </Pressable>
        </View>
      </Sheet>
    </>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    // Amber edge: something the owner has to do, and the repair waits for it.
    card: { gap: 10, padding: 14, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(245, 158, 11, 0.6)', backgroundColor: Colors.bgCard },
    title: { fontSize: 15, lineHeight: 22, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    part: { gap: 4 },
    name: { fontSize: 15, lineHeight: 22, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    sub: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    status: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    done: { color: Colors.successText },
    warn: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#fdd663' : '#b45309' },
    linkRow: { minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' },
    link: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1e3a8a' },
    label: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, marginTop: 4 },
    input: { height: 48, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard, color: Colors.textMain, fontSize: 15, fontFamily: FONTS.bodyRegular },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    qtyBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.borderColor },
    qtySign: { fontSize: 20, color: Colors.textMain },
    qty: { minWidth: 24, textAlign: 'center', fontSize: 18, fontFamily: FONTS.bodyBold, color: Colors.textMain },
  })
);
