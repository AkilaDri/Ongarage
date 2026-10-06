import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, FONTS, getAi, RATING_DIMENSIONS, SUGGEST_MIN_CONFIDENCE, themedStyles, type DimensionRating, type RatingDimension } from '@ongarage/shared';
import { overallFrom, useWorkshops, type OwnerWorkshop } from '../../context/WorkshopContext';
import { Sheet } from '../Sheet';

const EMPTY: DimensionRating = { quality: 0, pricing: 0, onTime: 0, communication: 0 };

/** Why a comment can't be published as written (the AI layer's moderation reasons). */
const BLOCKED: Record<string, string> = {
  abuse: 'අසභ්‍ය වචන ඉවත් කරන්න.',
  contact: 'දුරකථන අංක / ඊමේල් ලිපින සමාලෝචනයේ දැමිය නොහැක.',
  spam: 'සබැඳි හෝ නැවත නැවත අකුරු ඉවත් කරන්න.',
};

/**
 * Rate a job closed with the owner's code: the garage on four dimensions (they make up
 * its trust score) and the technician who did the work. The comment is checked before
 * it's published.
 */
export const RatingSheet: React.FC<{ workshop: OwnerWorkshop | null; onClose: () => void }> = ({ workshop, onClose }) => {
  const { rateJob } = useWorkshops();
  const [shown, setShown] = useState(workshop);
  const [dims, setDims] = useState<DimensionRating>(EMPTY);
  const [tech, setTech] = useState(0);
  const [text, setText] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!workshop) return;
    setShown(workshop);
    setDims(EMPTY);
    setTech(0);
    setText('');
    setProblem(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshop?.id]);

  const w = workshop ?? shown;
  if (!w) return null;
  const complete = RATING_DIMENSIONS.every((d) => dims[d.id] > 0) && (!w.technician || tech > 0);

  const submit = async () => {
    if (text.trim()) {
      const m = await getAi().moderate(text);
      if (m.confidence >= SUGGEST_MIN_CONFIDENCE && !m.value.ok) {
        setProblem(m.value.reasons.map((r) => BLOCKED[r]).filter(Boolean).join(' '));
        return;
      }
    }
    rateJob(w.id, { dimensions: dims, technician: tech || undefined, text: text.trim() });
    onClose();
  };

  return (
    <Sheet
      visible={!!workshop}
      title="ශ්‍රේණිගත කරන්න"
      subtitle={`${w.garageName} · ඔබගේ කේතයෙන් අවසන් කළ රැකියාවක් පමණක් ශ්‍රේණිගත කළ හැක`}
      onClose={onClose}
      footer={<ActionButton label={complete ? `යවන්න · ★${overallFrom(dims)}` : 'සියලු තරු තෝරන්න'} icon="⭐" variant="primary" disabled={!complete} onPress={submit} />}
    >
      <View style={styles.box}>
        <Text style={styles.boxTitle}>🛠️ {w.garageName}</Text>
        {RATING_DIMENSIONS.map((d) => (
          <Stars key={d.id} label={d.label} value={dims[d.id]} onChange={(v) => setDims((p) => ({ ...p, [d.id as RatingDimension]: v }))} id={d.id} />
        ))}
      </View>
      {!!w.technician && (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>🧑‍🔧 {w.technician}</Text>
          <Stars label="කාර්මිකයාගේ වැඩ සහ හැසිරීම" value={tech} onChange={setTech} id="technician" />
        </View>
      )}
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={(t) => {
          setText(t);
          setProblem(null);
        }}
        placeholder="කෙටි සටහනක් (විකල්ප) — අනෙක් අයිතිකරුවන්ට උදව් වේ"
        placeholderTextColor={Colors.textMuted}
        multiline
        maxLength={300}
        accessibilityLabel="Review text"
      />
      {!!problem && <Text style={styles.warn}>⚠️ {problem}</Text>}
      <Text style={styles.sub}>ඔබගේ සමාලෝචනය ගරාජයේ පිටුවේ පෙනේ; ගරාජයට එයට ප්‍රසිද්ධියේ පිළිතුරු දිය හැක.</Text>
    </Sheet>
  );
};

const Stars: React.FC<{ label: string; value: number; onChange: (v: number) => void; id: string }> = ({ label, value, onChange, id }) => (
  <View style={styles.dimRow}>
    <Text style={styles.dimLabel}>{label}</Text>
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={4} accessibilityLabel={`Rate ${id} ${n}`}>
          <Text style={[styles.star, value >= n && styles.starOn]}>★</Text>
        </Pressable>
      ))}
    </View>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    box: { padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 8 },
    boxTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    dimRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    dimLabel: { flex: 1, fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textSoft },
    stars: { flexDirection: 'row', gap: 4 },
    star: { fontSize: 22, color: Colors.subtleBorder },
    starOn: { color: Colors.warning },
    input: {
      minHeight: 70,
      padding: 12,
      borderRadius: 14,
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: Colors.borderColor,
      color: Colors.textMain,
      fontSize: 12.5,
      fontFamily: FONTS.bodyRegular,
      textAlignVertical: 'top',
    },
    warn: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 17 },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
  })
);
