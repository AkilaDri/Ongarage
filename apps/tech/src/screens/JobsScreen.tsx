import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ActionButton,
  Colors,
  EmptyState,
  FONTS,
  GlassIcon,
  Icon,
  isSameDay,
  StepProgress,
  SwipeCard,
  themedStyles,
  vehicleIcon,
  WORKSHOP_STAGE_TEXT,
  WORKSHOP_STEP_LABELS,
  workshopStepIndex,
  softEdge,
  softShadow,
} from '@ongarage/shared';
import { isActiveSOS, useTech } from '../context/TechContext';
import { WorkshopJobSheet, PARTS_LABEL } from '../components/WorkshopJobSheet';
import { CollectTaskSheet } from '../components/CollectTaskSheet';
import { sosStageLabel } from './SOSJobScreen';
import { countdown, formatDate, formatTime, money } from '../utils/format';
import type { TechJob } from '../types';

// Today's work, most urgent first: SOS offers (they expire), the SOS job in
// progress, then workshop job cards from every garage the technician works for.
export const JobsScreen: React.FC = () => {
  const { duty, links, jobs, collects, checkIn, setBreak, acceptJob, declineJob, openSOS } = useTech();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [collectId, setCollectId] = useState<string | null>(null);
  const openCollects = collects.filter((t) => t.status !== 'delivered');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const sosOffers = jobs.filter((j) => j.kind === 'sos' && j.stage === 'offered');
  const activeSOS = jobs.find(isActiveSOS);
  const workshop = jobs.filter((j) => j.kind === 'workshop' && ['offered', 'assigned', 'working'].includes(j.stage)).sort((a, b) => a.workshop!.scheduledAt - b.workshop!.scheduledAt);
  const doneToday = jobs.filter((j) => j.stage === 'done' && j.completedAt && isSameDay(j.completedAt, now));
  const garage = links.find((l) => l.garage.id === duty.garageId);
  const detail = jobs.find((j) => j.id === detailId) ?? null;
  const kindOf = (j: TechJob) => links.find((l) => l.garage.id === j.garage.id)?.kind;

  const workshopCard = (j: TechJob) => {
    const w = j.workshop!;
    const parts = PARTS_LABEL[w.parts];
    return (
      <SwipeCard key={j.id} style={[styles.card, j.stage === 'working' && styles.cardWorking, j.stage === 'offered' && styles.cardOffer]} onOpen={() => setDetailId(j.id)}>
        <Pressable style={styles.row} onPress={() => setDetailId(j.id)} accessibilityLabel={`${j.title} job card`}>
          <GlassIcon emoji={j.icon} />
          <View style={styles.flex1}>
            <Text style={styles.title} numberOfLines={1}>
              {j.title}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {vehicleIcon(j.vehicle.type)} {j.vehicle.name} · {j.vehicle.plate} · {j.customer.name}
            </Text>
          </View>
          <Text style={styles.pay}>{money(j.pay)}</Text>
        </Pressable>
        <View style={styles.chips}>
          <Chip text={`🛠️ ${j.garage.name}`} accent={kindOf(j) === 'freelance'} />
          <Chip text={`📅 ${formatDate(w.scheduledAt)} · ${formatTime(w.scheduledAt)}`} />
          <Chip text={w.doorstep ? '🚛 නිවසටම' : '🏠 ගරාජයේ'} />
          {!!(w.photos?.length || w.voiceNotes?.length) && <Chip text={[w.photos?.length && `📷 ${w.photos.length}`, w.voiceNotes?.length && `🎙️ ${w.voiceNotes.length}`].filter(Boolean).join('  ')} accent />}
        </View>
        {j.stage === 'working' && w.progress && <StepProgress steps={WORKSHOP_STEP_LABELS} current={workshopStepIndex(w.progress.stage)} alert={w.progress.stage === 'awaitingApproval'} />}
        <Text style={[styles.parts, { color: parts.color() }]}>{parts.text}</Text>
        <View style={styles.rowBetween}>
          <Text style={[styles.status, j.stage === 'working' && { color: Colors.primary }, j.stage === 'offered' && { color: Colors.warning }]}>
            {j.stage === 'offered' ? '● නිදහස් කාර්මික යෝජනාවක් — භාර ගන්නද?' : j.stage === 'working' && w.progress ? `🔧 ${WORKSHOP_STAGE_TEXT[w.progress.stage]}` : '● පවරා ඇත'}
          </Text>
          <Text style={styles.link}>කාඩ්පත ›</Text>
        </View>
      </SwipeCard>
    );
  };

  return (
    <View style={styles.flex1}>
      <ScrollView style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {!garage ? (
          <View style={[styles.card, styles.dutyCard]}>
            <Text style={styles.dutyTitle}>👋 රාජකාරියට පැමිණෙන්න</Text>
            <Text style={styles.sub}>ඔබ පැමිණි ගරාජයෙන් පමණක් SOS රැකියා ලැබේ. එකවර එක් ගරාජයක.</Text>
            {links.map((l) => (
              <ActionButton key={l.garage.id} label={`${l.garage.name} · ${l.kind === 'employee' ? 'සේවකයා' : 'නිදහස්'}`} icon="✅" variant={l.kind === 'employee' ? 'success' : 'ghost'} compact onPress={() => checkIn(l.garage.id)} />
            ))}
          </View>
        ) : duty.onBreak ? (
          <View style={[styles.card, styles.breakCard]}>
            <Text style={styles.dutyTitle}>☕ විවේකයේ · {garage.garage.name}</Text>
            <Text style={styles.sub}>ඔබට SOS රැකියා නොලැබේ. ගරාජයේ ධාරිතාවෙන් ඔබව අඩු කර ඇත.</Text>
            <ActionButton label="ආපසු පැමිණියා" icon="✓" variant="success" compact onPress={() => setBreak(false)} />
          </View>
        ) : (
          !activeSOS &&
          !sosOffers.length && (
            <View style={styles.waitRow}>
              <Text style={styles.sub}>✅ {garage.garage.name} හි රාජකාරියේ · SOS රැකියා බලාපොරොත්තුවෙන්…</Text>
            </View>
          )
        )}

        {sosOffers.map((j) => {
          const left = (j.sos?.acceptBy ?? now) - now;
          return (
            <View key={j.id} style={[styles.card, styles.sosCard]}>
              <View style={styles.row}>
                <GlassIcon emoji={j.icon} />
                <View style={styles.flex1}>
                  <Text style={styles.sosLabel}>🚨 SOS · {j.garage.name}</Text>
                  <Text style={styles.title}>{j.title}</Text>
                </View>
                <View style={styles.timer}>
                  <Icon name="clock" size={12} color={Colors.errorText} />
                  <Text style={styles.timerText}>{countdown(left)}</Text>
                </View>
              </View>
              <Text style={styles.sub}>
                {vehicleIcon(j.vehicle.type)} {j.vehicle.name} · {j.customer.name} · 📍 {j.location.address}
              </Text>
              {!!j.sos?.note && <Text style={styles.note}>“{j.sos.note}”</Text>}
              <View style={styles.chips}>
                <Chip text={`💵 ඔබට ${money(j.pay)}`} accent />
                <Chip text={`🚐 පැමිණීමේ ගාස්තුව ${money(j.sos?.calloutFee ?? 0)}`} />
                <Chip text={`⏱️ මිනි. ~${j.sos?.etaMin}`} />
              </View>
              <View style={styles.actions}>
                <View style={styles.flex1}>
                  <ActionButton label="ප්‍රතික්ෂේප" variant="ghost" compact onPress={() => declineJob(j.id, 'ප්‍රතික්ෂේප කළා')} />
                </View>
                <View style={styles.flex2}>
                  <ActionButton label="පිළිගෙන ගමන අරඹන්න" icon="🛵" variant="sos" compact onPress={() => acceptJob(j.id)} />
                </View>
              </View>
            </View>
          );
        })}

        {activeSOS && (
          <Pressable style={({ pressed }) => [styles.card, styles.activeCard, pressed && styles.pressed]} onPress={() => openSOS(activeSOS.id)}>
            <View style={styles.row}>
              <GlassIcon emoji={activeSOS.icon} small />
              <View style={styles.flex1}>
                <Text style={styles.activeLabel}>● SOS රැකියාව · {sosStageLabel(activeSOS)}</Text>
                <Text style={styles.title} numberOfLines={1}>
                  {activeSOS.title} · {activeSOS.customer.name}
                </Text>
              </View>
              <View style={styles.resume}>
                <Text style={styles.resumeText}>ඉදිරියට ›</Text>
              </View>
            </View>
          </Pressable>
        )}

        {openCollects.length > 0 && (
          <>
            <Text style={styles.section}>කොටස් එකතු කිරීම</Text>
            {openCollects.map((t) => (
              <Pressable key={t.id} style={({ pressed }) => [styles.card, styles.activeCard, pressed && styles.pressed]} onPress={() => setCollectId(t.id)} accessibilityLabel={`Collect parts ${t.shop.name}`}>
                <View style={styles.row}>
                  <GlassIcon emoji="🏪" small />
                  <View style={styles.flex1}>
                    <Text style={styles.activeLabel}>{t.status === 'assigned' ? '● වෙළඳසැලෙන් එකතු කරන්න' : '● ගරාජයට ගෙන යන්න'}</Text>
                    <Text style={styles.title} numberOfLines={1}>
                      {t.shop.name} · {t.lines.map((l) => l.name).join(', ')}
                    </Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      {t.garage.name}
                      {t.forJob ? ` · ${t.forJob}` : ''} · {formatTime(t.holdUntil)} දක්වා
                    </Text>
                  </View>
                  <Text style={styles.resumeText}>›</Text>
                </View>
              </Pressable>
            ))}
          </>
        )}

        <Text style={styles.section}>වැඩමුළු රැකියා</Text>
        {workshop.length === 0 ? (
          <EmptyState icon="📋" title="රැකියා කාඩ්පත් නැත" text="ගරාජයක් ඔබට රැකියාවක් පැවරූ විට මෙහි පෙන්වනු ඇත." />
        ) : (
          <>
            <Text style={styles.hint}>⇆ ඡායාරූප, හඬ සටහන් සහ පිරික්සුම් ලැයිස්තුව සඳහා කාඩ්පතක් ස්වයිප් කරන්න</Text>
            {workshop.map(workshopCard)}
          </>
        )}

        {doneToday.length > 0 && (
          <>
            <Text style={styles.section}>අද අවසන් කළ ({doneToday.length})</Text>
            {doneToday.map((j) => (
              <View key={j.id} style={[styles.card, styles.row, styles.doneCard]}>
                <GlassIcon emoji={j.icon} small />
                <View style={styles.flex1}>
                  <Text style={styles.title}>{j.title}</Text>
                  <Text style={styles.sub}>
                    {j.garage.name} · {j.completedAt ? formatTime(j.completedAt) : ''}
                  </Text>
                </View>
                <Text style={styles.pay}>{money(j.pay)}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      <WorkshopJobSheet job={detail} onClose={() => setDetailId(null)} />
      <CollectTaskSheet task={collects.find((t) => t.id === collectId) ?? null} onClose={() => setCollectId(null)} />
    </View>
  );
};

const Chip: React.FC<{ text: string; accent?: boolean }> = ({ text, accent }) => (
  <View style={[styles.chip, accent && styles.chipAccent]}>
    <Text style={[styles.chipText, accent && { color: Colors.primary }]}>{text}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    actions: { flexDirection: 'row', gap: 8 },
    body: { padding: 16, gap: 12, paddingBottom: 100 },
    pressed: { opacity: 0.8 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 20, padding: 14, gap: 10, ...softShadow() },
    cardWorking: { borderColor: 'rgba(56, 189, 248, 0.55)' },
    cardOffer: { borderColor: 'rgba(245, 158, 11, 0.5)' },
    dutyCard: { borderColor: 'rgba(16, 185, 129, 0.45)', gap: 8 },
    breakCard: { borderColor: 'rgba(245, 158, 11, 0.5)', gap: 8 },
    dutyTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    waitRow: { padding: 10, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.08)' },
    sosCard: { borderColor: 'rgba(239, 68, 68, 0.6)', backgroundColor: 'rgba(239, 68, 68, 0.05)' },
    sosLabel: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: Colors.errorText },
    timer: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(239, 68, 68, 0.12)' },
    timerText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
    activeCard: { borderColor: 'rgba(16, 185, 129, 0.55)', backgroundColor: Colors.cardGlass },
    activeLabel: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: Colors.success },
    resume: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: Colors.success },
    resumeText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#fff' },
    doneCard: { opacity: 0.85 },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1, lineHeight: 16 },
    note: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, fontStyle: 'italic' },
    pay: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.success },
    section: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, textAlign: 'center' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: Colors.subtleFill },
    chipAccent: { backgroundColor: 'rgba(56, 189, 248, 0.12)' },
    chipText: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    parts: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold },
    status: { flex: 1, fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    link: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
  })
);
