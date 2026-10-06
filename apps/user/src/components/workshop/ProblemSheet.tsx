import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, FONTS, getAi, PhotoStrip, SUGGEST_MIN_CONFIDENCE, themedStyles, type ComplaintTriage, type DisputeTopic } from '@ongarage/shared';
import { useWorkshops, type OwnerWorkshop } from '../../context/WorkshopContext';
import { SAMPLE_UPLOAD_PHOTOS } from '../../constants/mockData';
import { Sheet } from '../Sheet';

export const TOPIC_LABEL: Record<DisputeTopic, string> = {
  quality: 'වැඩේ හරි නැහැ',
  price: 'මිල',
  delay: 'ප්‍රමාදය',
  behaviour: 'හැසිරීම',
  damage: 'අලුත් හානියක්',
  wrongPart: 'වැරදි කොටසක්',
  other: 'වෙනත්',
};
const TOPICS = Object.keys(TOPIC_LABEL) as DisputeTopic[];

/**
 * Not happy at handover: tell the garage what's wrong (they rework it first). The AI
 * layer suggests the topic from what the owner writes; the owner can change it.
 */
export const ProblemSheet: React.FC<{ workshop: OwnerWorkshop | null; onClose: () => void }> = ({ workshop, onClose }) => {
  const { reportProblem } = useWorkshops();
  const [text, setText] = useState('');
  const [topic, setTopic] = useState<DisputeTopic | null>(null);
  const [picked, setPicked] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [triage, setTriage] = useState<ComplaintTriage | null>(null);

  useEffect(() => {
    if (!workshop) return;
    setText('');
    setTopic(null);
    setPicked(false);
    setPhotos([]);
    setTriage(null);
  }, [workshop?.id, workshop]);

  // Suggest a topic as the owner writes (until they pick one themselves).
  useEffect(() => {
    if (text.trim().length < 8) {
      setTriage(null);
      return;
    }
    let live = true;
    const t = setTimeout(async () => {
      const r = await getAi().triageComplaint(text);
      if (!live) return;
      const sure = r.confidence >= SUGGEST_MIN_CONFIDENCE;
      setTriage(sure ? r.value : null);
      if (sure && !picked) setTopic(r.value.topic);
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [text, picked]);

  const valid = !!topic && text.trim().length >= 5;

  return (
    <Sheet
      visible={!!workshop}
      title="ගැටලුවක් වාර්තා කරන්න"
      subtitle={workshop ? `${workshop.garageName} · ඔවුන් මුලින්ම නැවත පරීක්ෂා කර හදයි` : undefined}
      onClose={onClose}
      footer={
        <ActionButton
          label="ගරාජයට යවන්න"
          icon="📨"
          variant="primary"
          disabled={!valid}
          onPress={() => {
            if (workshop && topic) reportProblem(workshop.id, topic, text.trim(), photos.length ? photos : undefined);
            onClose();
          }}
        />
      }
    >
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="මොකක්ද වැරැද්ද? (උදා: බ්‍රේක් ගහද්දී තවමත් සද්දයක් එනවා)"
        placeholderTextColor={Colors.textMuted}
        multiline
        accessibilityLabel="Problem description"
      />
      {triage && (
        <Text style={styles.ai}>
          ✨ යෝජනාව: {TOPIC_LABEL[triage.topic]}
          {triage.urgency === 'high' ? ' · හදිසි' : ''}
          {triage.needsHuman ? ' · OnGarage කණ්ඩායමට පෙනේ' : ''}
        </Text>
      )}
      <Text style={styles.label}>වර්ගය</Text>
      <View style={styles.chips}>
        {TOPICS.map((t) => (
          <Pressable
            key={t}
            style={[styles.chip, topic === t && styles.chipOn]}
            onPress={() => {
              setTopic(t);
              setPicked(true);
            }}
            accessibilityLabel={`Topic ${t}`}
          >
            <Text style={[styles.chipText, topic === t && { color: Colors.primary }]}>{TOPIC_LABEL[t]}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>ඡායාරූප (අත්‍යවශ්‍ය නැත)</Text>
      <PhotoStrip photos={photos} height={70} onAdd={photos.length < 4 ? () => setPhotos((p) => [...p, SAMPLE_UPLOAD_PHOTOS[p.length % SAMPLE_UPLOAD_PHOTOS.length]]) : undefined} />
      <Text style={styles.hint}>ගරාජය නැවත හැදූ පසුත් විසඳුණේ නැත්නම්, OnGarage වෙත යොමු කළ හැක. ගැටලුව විසඳෙන තුරු කේතය පෙන්වන්න එපා.</Text>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    input: {
      minHeight: 84,
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
    ai: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    chipOn: { borderColor: 'rgba(56, 189, 248, 0.6)', backgroundColor: 'rgba(56, 189, 248, 0.12)' },
    chipText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
  })
);
