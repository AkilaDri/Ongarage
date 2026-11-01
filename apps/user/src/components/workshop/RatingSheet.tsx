import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, FONTS, getAi, getThemeMode, RATING_DIMENSIONS, SUGGEST_MIN_CONFIDENCE, themedStyles, type DimensionRating, type RatingDimension } from '@ongarage/shared';
import { overallFrom, useWorkshops, type OwnerWorkshop } from '../../context/WorkshopContext';
import { outline } from '../../utils/material';
import { Sheet } from '../Sheet';

const EMPTY: DimensionRating = { quality: 0, pricing: 0, onTime: 0, communication: 0 };

// The same words, tags and look as the rating at the end of an SOS job, so rating feels the same everywhere.
const GOOD_TAGS = ['වේලාවට පැමිණියා', 'දක්ෂ සේවාව', 'මිල සාධාරණයි', 'කාරුණික හැසිරීම'];
const BAD_TAGS = ['ප්‍රමාද විය', 'මිල වැඩියි', 'වැඩේ අසම්පූර්ණයි', 'නරක හැසිරීම'];
const ratingLabel = (r: number) => (r === 0 ? 'තරුවක් තට්ටු කරන්න' : r === 5 ? 'විශිෂ්ටයි!' : r === 4 ? 'ඉතා හොඳ සේවාවක්!' : r === 3 ? 'හොඳ සේවාවක්' : 'වැඩිදියුණු විය යුතුයි');

/** Why a comment can't be published as written (the AI layer's moderation reasons). */
const BLOCKED: Record<string, string> = {
  abuse: 'අසභ්‍ය වචන ඉවත් කරන්න.',
  contact: 'දුරකථන අංක / ඊමේල් ලිපින සමාලෝචනයේ දැමිය නොහැක.',
  spam: 'සබැඳි හෝ නැවත නැවත අකුරු ඉවත් කරන්න.',
};

/**
 * Rate a job closed with the owner's code, laid out like the rating at the end of an SOS job: the garage's picture ringed in blue, its name, "How was the
 * service?", five big stars (the chosen one pops) with a word under them, and quick tags (good ones from four stars up, the others below). The stars rate
 * the garage as a whole (they fill the four dimensions that make up its trust score); "by detail" opens those four to set one by one. The technician, if
 * there was one, can be rated too, and a short note is optional (checked before it is published).
 */
export const RatingSheet: React.FC<{ workshop: OwnerWorkshop | null; onClose: () => void }> = ({ workshop, onClose }) => {
  const { rateJob } = useWorkshops();
  const [shown, setShown] = useState(workshop);
  const [dims, setDims] = useState<DimensionRating>(EMPTY);
  const [tech, setTech] = useState(0);
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [detail, setDetail] = useState(false);
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!workshop) return;
    setShown(workshop);
    setDims(EMPTY);
    setTech(0);
    setText('');
    setTags([]);
    setProblem(null);
    setDetail(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshop?.id]);

  const w = workshop ?? shown;
  if (!w) return null;
  const complete = RATING_DIMENSIONS.every((d) => dims[d.id] > 0);
  const rating = complete ? Math.round(overallFrom(dims)) : 0;
  const press = (n: number) => {
    if (n >= 4 !== rating >= 4) setTags([]);
    setDims({ quality: n, pricing: n, onTime: n, communication: n });
    pop.setValue(0.6);
    Animated.spring(pop, { toValue: 1, friction: 3, tension: 180, useNativeDriver: true }).start();
  };

  const submit = async () => {
    if (text.trim()) {
      const m = await getAi().moderate(text);
      if (m.confidence >= SUGGEST_MIN_CONFIDENCE && !m.value.ok) {
        setProblem(m.value.reasons.map((r) => BLOCKED[r]).filter(Boolean).join(' '));
        return;
      }
    }
    // The chosen tags go in front of the note, so the garage and other owners read them with it.
    const written = [tags.join(' · '), text.trim()].filter(Boolean).join(' — ');
    rateJob(w.id, { dimensions: dims, technician: tech || undefined, text: written });
    onClose();
  };

  return (
    <Sheet
      visible={!!workshop}
      noDividers
      title="ශ්‍රේණිගත කරන්න"
      subtitle="ඔබගේ කේතයෙන් අවසන් කළ රැකියාවක් පමණක් ශ්‍රේණිගත කළ හැක"
      onClose={onClose}
      footer={<ActionButton label={complete ? `යවන්න · ★${overallFrom(dims)}` : 'තරු තෝරන්න'} icon="⭐" variant="primary" disabled={!complete} onPress={submit} />}
    >
      <View style={styles.hero}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>🛠️</Text>
          </View>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {w.garageName}
        </Text>
        {!!w.technician && <Text style={styles.sub}>{w.technician}</Text>}
        <Text style={styles.question}>සේවාව කෙසේද?</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => press(n)} hitSlop={6} accessibilityLabel={`Rate the garage ${n}`} accessibilityState={{ selected: rating >= n }}>
              <Animated.Text style={[styles.star, rating >= n && styles.starOn, { transform: [{ scale: rating === n ? pop : 1 }] }]}>{rating >= n ? '★' : '☆'}</Animated.Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.word, { color: rating >= 4 ? Colors.success : Colors.textMuted }]}>{ratingLabel(rating)}</Text>

        {rating > 0 && (
          <View style={styles.tagWrap}>
            {(rating >= 4 ? GOOD_TAGS : BAD_TAGS).map((t) => {
              const on = tags.includes(t);
              return (
                <Pressable key={t} style={[styles.tag, on && styles.tagOn]} onPress={() => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))} accessibilityLabel={`Tag ${t}`} accessibilityState={{ selected: on }}>
                  <Text style={[styles.tagText, on && styles.tagTextOn]}>{t}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {!!w.technician && rating > 0 && (
        <View style={styles.soft}>
          <Stars label={`🧑‍🔧 ${w.technician}`} value={tech} onChange={setTech} id="technician" />
        </View>
      )}

      <TextInput
        style={styles.input}
        value={text}
        onChangeText={(t) => {
          setText(t);
          setProblem(null);
        }}
        placeholder="කෙටි සටහනක් (විකල්ප)"
        placeholderTextColor={Colors.textMuted}
        multiline
        maxLength={300}
        accessibilityLabel="Review text"
      />
      {!!problem && <Text style={styles.warn}>⚠️ {problem}</Text>}

      <Pressable style={styles.moreRow} onPress={() => setDetail((d) => !d)} accessibilityLabel="Rate by detail">
        <Text style={styles.moreText}>කරුණු අනුව ශ්‍රේණිගත කරන්න {detail ? '▴' : '▾'}</Text>
      </Pressable>
      {detail && (
        <View style={styles.soft}>
          {RATING_DIMENSIONS.map((d) => (
            <Stars key={d.id} label={d.label} value={dims[d.id]} onChange={(v) => setDims((p) => ({ ...p, [d.id as RatingDimension]: v }))} id={d.id} />
          ))}
        </View>
      )}
      <Text style={styles.note}>ඔබගේ සමාලෝචනය ගරාජයේ පිටුවේ පෙනේ; ගරාජයට එයට ප්‍රසිද්ධියේ පිළිතුරු දිය හැක.</Text>
    </Sheet>
  );
};

const Stars: React.FC<{ label: string; value: number; onChange: (v: number) => void; id: string }> = ({ label, value, onChange, id }) => (
  <View style={styles.dimRow}>
    <Text style={styles.dimLabel} numberOfLines={1}>
      {label}
    </Text>
    <View style={styles.smallStars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={4} accessibilityLabel={`Rate ${id} ${n}`}>
          <Text style={[styles.smallStar, value >= n && styles.starOn]}>★</Text>
        </Pressable>
      ))}
    </View>
  </View>
);

const dark = () => getThemeMode() === 'dark';

const styles = themedStyles(() =>
  StyleSheet.create({
    hero: { alignItems: 'center', gap: 6, paddingVertical: 8 },
    // The picture ringed in blue, as on the SOS rating.
    avatarRing: { padding: 4, borderRadius: 44, borderWidth: 2, borderColor: Colors.primary },
    avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: Colors.subtleFill, justifyContent: 'center', alignItems: 'center' },
    avatarEmoji: { fontSize: 36 },
    name: { fontSize: 20, lineHeight: 28, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
    sub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: -2 },
    question: { marginTop: 10, fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    starsRow: { flexDirection: 'row', gap: 8 },
    star: { fontSize: 46, color: Colors.subtleBorder },
    starOn: { color: Colors.warning },
    word: { fontSize: 14, fontFamily: FONTS.bodySemiBold },
    tagWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 },
    tag: { paddingHorizontal: 14, height: 32, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard },
    tagOn: { borderColor: dark() ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc', backgroundColor: dark() ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    tagText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
    tagTextOn: { color: dark() ? '#8db1ff' : '#1a73e8' },
    soft: { padding: 14, borderRadius: 14, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.06)' : '#f1f4f9', gap: 10 },
    dimRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    dimLabel: { flex: 1, fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textMain },
    smallStars: { flexDirection: 'row', gap: 4 },
    smallStar: { fontSize: 24, color: Colors.subtleBorder },
    input: { minHeight: 70, padding: 14, borderRadius: 14, backgroundColor: dark() ? 'rgba(255, 255, 255, 0.06)' : '#f1f4f9', color: Colors.textMain, fontSize: 13, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top' },
    warn: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 17 },
    moreRow: { alignSelf: 'center', paddingVertical: 4 },
    moreText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    note: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16, textAlign: 'center' },
  })
);
