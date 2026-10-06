import React, { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ActionButton,
  approvedLines,
  CheckInSheet,
  CloseJobSheet,
  Colors,
  DiagnosisSheet,
  directionsUrl,
  FONTS,
  HandoverSheet,
  partMarketPrice,
  pendingExtra,
  PhotoStrip,
  StepProgress,
  themedStyles,
  vehicleIcon,
  VoiceNotePlayer,
  WORKSHOP_STAGE_TEXT,
  WORKSHOP_STEP_LABELS,
  workshopBill,
  workshopStepIndex,
  type TechPartsStatus,
} from '@ongarage/shared';
import { useTech } from '../context/TechContext';
import { SAMPLE_PHOTOS } from '../constants/mockData';
import { formatDate, formatTime, money } from '../utils/format';
import { Sheet } from './Sheet';
import { Toast } from './Toast';
import type { TechJob } from '../types';

type StepSheet = 'checkIn' | 'diagnosis' | 'extra' | 'handover' | 'close' | null;

const DECLINE_REASONS = ['එම වේලාවේ නොහැක', 'මගේ විශේෂඥතාව නොවේ', 'දුර වැඩියි'];

export const PARTS_LABEL: Record<TechPartsStatus, { text: string; color: () => string }> = {
  none: { text: 'කොටස් අවශ්‍ය නැත', color: () => Colors.textMuted },
  ordered: { text: '🏷️ කොටස් ඇණවුම් කර ඇත', color: () => Colors.warning },
  onTheWay: { text: '🛵 කොටස් මගදී', color: () => Colors.primary },
  arrived: { text: '📦 කොටස් ගරාජයට ලැබී ඇත', color: () => Colors.successText },
};

/**
 * A workshop job card: what the owner sent, parts, and the workshop steps — receive the
 * vehicle, diagnose (the owner approves through the garage), repair, hand over, and close
 * with the owner's QR / code.
 */
export const WorkshopJobSheet: React.FC<{ job: TechJob | null; onClose: () => void }> = ({ job, onClose }) => {
  const { duty, acceptJob, declineJob, receiveVehicle, sendDiagnosis, requestExtraWork, markReadyForHandover, closeWorkshopJob, setNotes } = useTech();
  const [step, setStep] = useState<StepSheet>(null);
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
  const here = duty.garageId === j.garage.id && !duty.onBreak;
  const p = w.progress;
  const subject = { title: j.title, vehicle: `${j.vehicle.name} · ${j.vehicle.plate}` };
  const partsPending = w.parts === 'ordered' || w.parts === 'onTheWay';
  const bill = p ? workshopBill(w.agreedPrice, p) : { labour: w.agreedPrice, parts: 0, total: w.agreedPrice };
  const closeStep = () => setStep(null);
  const extraWaiting = p ? pendingExtra(p) : undefined;

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
    if (j.stage === 'assigned')
      return (
        <ActionButton
          label={here ? (w.doorstep ? 'අයිතිකරු වෙත පැමිණියා' : 'වාහනය ලැබුණා') : `${j.garage.name} හි රාජකාරියට පැමිණ අරඹන්න`}
          icon="🚗"
          variant="primary"
          disabled={!here}
          onPress={() => setStep('checkIn')}
        />
      );
    if (j.stage !== 'working' || !p) return undefined;
    switch (p.stage) {
      case 'received':
      case 'diagnosing':
        return <ActionButton label="පරීක්ෂා වාර්තාව ලියන්න" icon="🔍" variant="primary" onPress={() => setStep('diagnosis')} />;
      case 'repairing':
        return (
          <View style={styles.actions}>
            <View style={styles.flex1}>
              <ActionButton label="අමතර වැඩක්" icon="➕" variant="ghost" disabled={!!extraWaiting} onPress={() => setStep('extra')} />
            </View>
            <View style={styles.flex2}>
              <ActionButton
                label="භාරදීමට සූදානම්"
                icon="✓"
                variant="success"
                onPress={() => {
                  setNotes(j.id, notes);
                  setStep('handover');
                }}
              />
            </View>
          </View>
        );
      case 'readyForHandover':
        return <ActionButton label="අයිතිකරුගේ කේතයෙන් අවසන් කරන්න" icon="🔳" variant="success" onPress={() => setStep('close')} />;
      default:
        return undefined;
    }
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

      {j.stage !== 'offered' && p && (
        <View style={styles.card}>
          <Text style={styles.label}>වැඩපළ ප්‍රගතිය</Text>
          <StepProgress steps={WORKSHOP_STEP_LABELS} current={workshopStepIndex(p.stage)} alert={p.stage === 'awaitingApproval'} />
          <Text style={[styles.detail, p.stage === 'awaitingApproval' && { color: Colors.warning }]}>{WORKSHOP_STAGE_TEXT[p.stage]}</Text>
          {!!p.checkInPhotos?.length && <PhotoStrip photos={p.checkInPhotos} height={64} />}
          {p.diagnosis && (
            <>
              <Text style={styles.sub}>🔍 {p.diagnosis.findings}</Text>
              {p.diagnosis.lines.map((l) => {
                const ok = p.decision?.approvedLineIds.includes(l.id);
                return (
                  <Text key={l.id} style={[styles.sub, p.decision && !ok && styles.struck]}>
                    {p.decision ? (ok ? '✓' : '✕') : '•'} {l.kind === 'part' ? '🔩' : '🔧'} {l.name} · {money(l.price)}
                  </Text>
                );
              })}
            </>
          )}
          {(p.extras ?? []).map((x) => (
            <Text key={x.id} style={styles.sub}>
              ➕ {x.reason} · {x.decision ? '✓ අයිතිකරු අනුමත කළා' : '⏳ අයිතිකරුගේ අනුමැතියට'}
            </Text>
          ))}
          {p.stage === 'repairing' && partsPending && <Text style={[styles.sub, { color: Colors.warning }]}>⏳ ඇණවුම් කළ කොටස් ලැබෙන තුරු භාරදිය නොහැක.</Text>}
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
      {p && (
        <>
          <CheckInSheet visible={step === 'checkIn'} onClose={closeStep} overlay={<Toast topOffset={40} />} subject={subject} doorstep={w.doorstep} samplePhotos={SAMPLE_PHOTOS} onConfirm={(photos) => receiveVehicle(j.id, photos)} />
          <DiagnosisSheet
            visible={step === 'diagnosis'}
            onClose={closeStep}
            overlay={<Toast topOffset={40} />}
            subject={subject}
            agreedPrice={w.agreedPrice}
            ownerPartType={w.ownerPartType}
            priceFor={partMarketPrice}
            samplePhotos={SAMPLE_PHOTOS}
            onSend={(r) => sendDiagnosis(j.id, r)}
          />
          <DiagnosisSheet
            extra
            visible={step === 'extra'}
            onClose={closeStep}
            overlay={<Toast topOffset={40} />}
            subject={subject}
            agreedPrice={bill.total}
            ownerPartType={w.ownerPartType}
            priceFor={partMarketPrice}
            samplePhotos={SAMPLE_PHOTOS}
            onSend={(r) => requestExtraWork(j.id, { id: `x-${Date.now()}`, reason: r.findings, photos: r.photos, lines: r.lines, sentAt: Date.now() })}
          />
          <HandoverSheet
            visible={step === 'handover'}
            onClose={closeStep}
            overlay={<Toast topOffset={40} />}
            lines={approvedLines(p)}
            bill={bill}
            beforePhotos={p.checkInPhotos}
            samplePhotos={SAMPLE_PHOTOS}
            partsPending={partsPending}
            blockedReason={extraWaiting ? 'අයිතිකරු අමතර වැඩ ගැන තීරණය කරන තුරු භාර දිය නොහැක.' : undefined}
            onSubmit={(r) => markReadyForHandover(j.id, r)}
          />
          <CloseJobSheet
            visible={step === 'close'}
            onClose={closeStep}
            overlay={<Toast topOffset={40} />}
            expectedCode={p.closeCode}
            total={p.handover?.bill.total ?? bill.total}
            showSimulatedCode
            onConfirmed={() => closeWorkshopJob(j.id, p.closeCode)}
          />
        </>
      )}
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
    struck: { textDecorationLine: 'line-through', opacity: 0.7 },
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
