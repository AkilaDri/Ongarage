import React, { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, directionsUrl, FONTS, themedStyles, vehicleIcon, VoiceNotePlayer, type TechPartsStatus } from '@ongarage/shared';
import { useTech } from '../context/TechContext';
import { WORKSHOP_TASKS } from '../constants/mockData';
import { formatDate, formatTime, money } from '../utils/format';
import { Sheet } from './Sheet';
import type { TechJob } from '../types';

const DECLINE_REASONS = ['එම වේලාවේ නොහැක', 'මගේ විශේෂඥතාව නොවේ', 'දුර වැඩියි'];

export const PARTS_LABEL: Record<TechPartsStatus, { text: string; color: () => string }> = {
  none: { text: 'කොටස් අවශ්‍ය නැත', color: () => Colors.textMuted },
  ordered: { text: '🏷️ කොටස් ඇණවුම් කර ඇත', color: () => Colors.warning },
  onTheWay: { text: '🛵 කොටස් මගදී', color: () => Colors.primary },
  arrived: { text: '📦 කොටස් ගරාජයට ලැබී ඇත', color: () => Colors.successText },
};

/** A workshop job card: what the owner sent, parts, the checklist, and start / finish. */
export const WorkshopJobSheet: React.FC<{ job: TechJob | null; onClose: () => void }> = ({ job, onClose }) => {
  const { duty, acceptJob, declineJob, startWork, toggleTask, setNotes, finishWork } = useTech();
  const [shown, setShown] = useState<TechJob | null>(job);
  const [declining, setDeclining] = useState(false);
  const [notes, setLocalNotes] = useState('');

  useEffect(() => {
    if (!job) return;
    setShown(job);
    setLocalNotes(job.notes ?? '');
    if (job.id !== shown?.id) setDeclining(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);

  if (!shown?.workshop) return null;
  const j = job ?? shown;
  const w = j.workshop!;
  const parts = PARTS_LABEL[w.parts];
  const allDone = j.tasks.every(Boolean);
  const here = duty.garageId === j.garage.id && !duty.onBreak;

  const footer = () => {
    if (j.stage === 'offered') {
      return declining ? (
        <View style={styles.reasons}>
          {DECLINE_REASONS.map((r) => (
            <Pressable
              key={r}
              style={styles.reason}
              onPress={() => {
                declineJob(j.id, r);
                onClose();
              }}
            >
              <Text style={styles.reasonText}>{r}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.actions}>
          <View style={styles.flex1}>
            <ActionButton label="ප්‍රතික්ෂේප" icon="✕" variant="ghost" compact onPress={() => setDeclining(true)} />
          </View>
          <View style={styles.flex2}>
            <ActionButton label={`භාර ගන්න · ${money(j.pay)}`} icon="✓" variant="success" compact onPress={() => acceptJob(j.id)} />
          </View>
        </View>
      );
    }
    if (j.stage === 'assigned') return <ActionButton label={here ? 'වැඩ අරඹන්න' : `${j.garage.name} හි රාජකාරියට පැමිණ අරඹන්න`} icon="🔧" variant="primary" disabled={!here} onPress={() => startWork(j.id)} />;
    if (j.stage === 'working')
      return (
        <ActionButton
          label="වැඩ අවසන් · ගරාජයට දන්වන්න"
          icon="✓"
          variant="success"
          disabled={!allDone}
          onPress={() => {
            setNotes(j.id, notes);
            finishWork(j.id);
            onClose();
          }}
        />
      );
    return undefined;
  };

  return (
    <Sheet visible={!!job} title={j.title} subtitle={`${j.garage.name} · ${formatDate(w.scheduledAt)} ${formatTime(w.scheduledAt)}`} onClose={onClose} footer={footer()}>
      {!!w.photos?.length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
          {w.photos.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.photo} resizeMode="cover" />
          ))}
        </ScrollView>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {vehicleIcon(j.vehicle.type)} {j.vehicle.name} · {j.vehicle.plate}
        </Text>
        <Text style={styles.desc}>{w.description}</Text>
        {w.voiceNotes?.map((n, i) => (
          <VoiceNotePlayer key={n.id} note={n} index={i} />
        ))}
      </View>

      <View style={styles.card}>
        <Text style={[styles.partsText, { color: parts.color() }]}>{parts.text}</Text>
        {!!w.partsSummary && <Text style={styles.sub}>{w.partsSummary}</Text>}
        <View style={styles.divider} />
        <Text style={styles.detail}>{w.doorstep ? '🚛 නිවසටම පැමිණීම — ඔබ පාරිභෝගිකයා වෙත යා යුතුයි' : '🏠 පාරිභෝගිකයා වාහනය ගරාජයට ගෙන එයි'}</Text>
        <Text style={styles.sub}>
          👤 {j.customer.name} · 📍 {j.location.address}
        </Text>
        <View style={styles.actions}>
          <View style={styles.flex1}>
            <ActionButton label="අමතන්න" icon="📞" variant="ghost" compact onPress={() => Linking.openURL(`tel:${j.customer.phone}`)} />
          </View>
          {w.doorstep && (
            <View style={styles.flex1}>
              <ActionButton label="දිශාවන්" icon="🗺️" variant="ghost" compact onPress={() => Linking.openURL(directionsUrl(j.location.coords, j.garage.coords))} />
            </View>
          )}
        </View>
      </View>

      {j.stage !== 'offered' && (
        <View style={styles.card}>
          <Text style={styles.label}>පිරික්සුම් ලැයිස්තුව</Text>
          {WORKSHOP_TASKS.map((t, i) => {
            const on = j.tasks[i];
            return (
              <Pressable key={t} style={styles.task} disabled={j.stage !== 'working'} onPress={() => toggleTask(j.id, i)} accessibilityLabel={`Workshop task ${i + 1}`}>
                <View style={[styles.check, on && styles.checkOn, j.stage !== 'working' && styles.off]}>{on && <Text style={styles.checkMark}>✓</Text>}</View>
                <Text style={[styles.taskText, on && styles.taskDone]}>{t}</Text>
              </Pressable>
            );
          })}
          {j.stage === 'working' && (
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setLocalNotes}
              placeholder="ගරාජයට සටහනක් (උදා: බ්‍රේක් පෑඩ් ද ගෙවී ඇත)"
              placeholderTextColor={Colors.textMuted}
              multiline
            />
          )}
          {j.stage === 'assigned' && !here && <Text style={styles.hint}>වැඩ ආරම්භ කළ හැක්කේ {j.garage.name} හි රාජකාරියේ සිටින විට පමණි.</Text>}
        </View>
      )}
      <Text style={styles.hint}>
        මෙම රැකියාවට ඔබට {money(j.pay)} ({j.garage.name} {j.stage === 'offered' ? 'යෝජනාව' : 'අනුපාතය'}).
      </Text>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    actions: { flexDirection: 'row', gap: 8 },
    photos: { gap: 8 },
    photo: { width: 260, height: 160, borderRadius: 14 },
    card: { padding: 14, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, gap: 8 },
    cardTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    desc: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 20 },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    detail: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    partsText: { fontSize: 12.5, fontFamily: FONTS.bodyBold },
    divider: { height: 1, backgroundColor: Colors.borderColor },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    task: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
    check: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.subtleBorder, justifyContent: 'center', alignItems: 'center' },
    checkOn: { backgroundColor: Colors.success, borderColor: Colors.success },
    checkMark: { fontSize: 13, fontWeight: '900', color: '#fff' },
    off: { opacity: 0.5 },
    taskText: { flex: 1, fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textMain },
    taskDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
    input: {
      minHeight: 60,
      padding: 12,
      borderRadius: 12,
      backgroundColor: Colors.subtleFill,
      borderWidth: 1,
      borderColor: Colors.borderColor,
      color: Colors.textMain,
      fontSize: 12.5,
      fontFamily: FONTS.bodyRegular,
      textAlignVertical: 'top',
    },
    reasons: { gap: 6 },
    reason: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.45)', alignItems: 'center' },
    reasonText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
  })
);
