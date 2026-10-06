import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton, categoryInfo, Colors, EmptyState, FONTS, GlassIcon, Icon, isHighValueJob, levelForFeature, marketPrice, SwipeCard, themedStyles, vehicleIcon, type IconName } from '@ongarage/shared';
import { bidDeadline, useGarage } from '../context/GarageContext';
import { BidSheet } from '../components/BidSheet';
import { DirectReplySheet, type ReplyMode } from '../components/DirectReplySheet';
import { JobDetailView, SPARE_LABEL, type DetailTarget } from '../components/JobDetailView';
import { ago, countdown, formatDate, formatTime, money } from '../utils/format';
import type { BidStatus, DirectRequest, FeedJob, JobDetails, MyBid } from '../types';

// Bidding jobs, direct bookings and this garage's bids share the Jobs tab, so the
// bottom navigation keeps four tabs.
type Segment = 'open' | 'direct' | 'mine';
type Scope = 'services' | 'all';

const STATUS: Record<BidStatus, { label: string; color: () => string; bg: string }> = {
  pending: { label: 'පාරිභෝගිකයා සලකා බලමින්', color: () => Colors.warning, bg: 'rgba(245, 158, 11, 0.12)' },
  won: { label: 'දිනුවා · කාලසටහනට එක් විය', color: () => Colors.successText, bg: 'rgba(16, 185, 129, 0.12)' },
  lost: { label: 'අහිමි විය', color: () => Colors.errorText, bg: 'rgba(239, 68, 68, 0.12)' },
  withdrawn: { label: 'ඉවත් කළා', color: () => Colors.textMuted, bg: 'rgba(148, 163, 184, 0.12)' },
};

export const JobFeedScreen: React.FC = () => {
  const { feed, directs, bids, profile, withdrawBid, has } = useGarage();
  const [segment, setSegment] = useState<Segment>('open');
  const [scope, setScope] = useState<Scope>('services');
  const [sheet, setSheet] = useState<{ job: FeedJob; existing?: MyBid } | null>(null);
  const [reply, setReply] = useState<{ request: DirectRequest; mode: ReplyMode } | null>(null);
  const [detail, setDetail] = useState<{ kind: DetailTarget['kind']; id: string } | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const pendingFor = (jobId: string) => bids.find((b) => b.jobId === jobId && b.status === 'pending');
  const open = feed.filter((j) => bidDeadline(j) > now);
  const mine = open.filter((j) => profile.services.includes(j.categoryId));
  const shown = scope === 'services' ? mine : open;
  // Waiting on this garage first, soonest deadline first.
  const directList = [...directs].sort((a, b) => (a.status === b.status ? a.respondBy - b.respondBy : a.status === 'new' ? -1 : 1));
  const newDirects = directs.filter((d) => d.status === 'new').length;

  // The detail view follows the live record, and closes if it goes away (won, booked, expired).
  const detailTarget: DetailTarget | null = useMemo(() => {
    if (!detail) return null;
    if (detail.kind === 'bid') {
      const job = feed.find((j) => j.id === detail.id);
      return job ? { kind: 'bid', job } : null;
    }
    const job = directs.find((d) => d.id === detail.id);
    return job ? { kind: 'direct', job } : null;
  }, [detail, feed, directs]);

  const segments: { id: Segment; label: string; icon: IconName; count: number; alert?: boolean }[] = [
    { id: 'open', label: 'ලංසු රැකියා', icon: 'inbox', count: mine.length },
    { id: 'direct', label: 'ඍජු ඉල්ලීම්', icon: 'calendar', count: newDirects, alert: newDirects > 0 },
    { id: 'mine', label: 'මගේ ලංසු', icon: 'tag', count: bids.filter((b) => b.status === 'pending').length },
  ];

  const mediaChip = (job: JobDetails) => {
    const p = job.photos?.length ?? 0;
    const v = job.voiceNotes?.length ?? 0;
    if (!p && !v) return null;
    return <Chip text={[p && `📷 ${p}`, v && `🎙️ ${v}`].filter(Boolean).join('  ')} accent />;
  };

  // ---------- Actions (shared by cards and the detail view) ----------
  const bidActions = (job: FeedJob, fromDetail = false) => {
    const pending = pendingFor(job.id);
    const go = (fn: () => void) => () => {
      if (fromDetail) setDetail(null);
      fn();
    };
    if (pending) {
      return (
        <View style={styles.rowBetween}>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>ඔබගේ ලංසුව: {money(pending.price)}</Text>
            <Text style={[styles.sub, { color: Colors.warning }]}>● පාරිභෝගිකයා සලකා බලමින්</Text>
          </View>
          <Pressable style={styles.linkBtn} onPress={go(() => setSheet({ job, existing: pending }))}>
            <Text style={styles.link}>සංස්කරණය</Text>
          </Pressable>
        </View>
      );
    }
    // Jobs worth more than HIGH_VALUE_MIN go to garages whose level unlocked them.
    if (isHighValueJob(job.categoryId) && !has('highValueJobs')) {
      const lv = levelForFeature('highValueJobs');
      return (
        <View style={styles.locked}>
          <Text style={styles.lockedText}>🔒 ඉහළ වටිනාකමැති රැකියාවක් — {lv.icon} {lv.name} මට්ටමේදී ලංසු තැබිය හැක</Text>
        </View>
      );
    }
    if (profile.services.includes(job.categoryId)) {
      return (
        <ActionButton
          label={`ලංසුවක් තබන්න · වෙළඳපොළ ${money(marketPrice(job.categoryId))}`}
          icon="📨"
          variant="primary"
          onPress={go(() => setSheet({ job }))}
        />
      );
    }
    return <Text style={styles.hint}>මෙම සේවාව ඔබගේ ලැයිස්තුවේ නැත — “ගරාජය” ටැබයෙන් එක් කරන්න.</Text>;
  };

  const directActions = (d: DirectRequest, fromDetail = false) => {
    const go = (mode: ReplyMode) => () => {
      if (fromDetail) setDetail(null);
      setReply({ request: d, mode });
    };
    if (d.status === 'proposed' && d.proposal) {
      return (
        <View style={styles.proposed}>
          <Text style={styles.proposedText}>
            📨 ඔබ යෝජනා කළා: {formatDate(d.proposal.at)} · {formatTime(d.proposal.at)} · {money(d.proposal.estimate)}
          </Text>
          <Text style={[styles.sub, { color: Colors.warning }]}>● හිමිකරුගේ පිළිතුර බලාපොරොත්තුවෙන්</Text>
        </View>
      );
    }
    return (
      <View style={styles.actionsRow}>
        <View style={styles.flex1}>
          <ActionButton label="ප්‍රතික්ෂේප" icon="✕" variant="ghost" compact onPress={go('decline')} />
        </View>
        <View style={styles.flex2}>
          <ActionButton label="පිළිතුරු දෙන්න" icon="✓" variant="success" compact onPress={go('accept')} />
        </View>
      </View>
    );
  };

  // ---------- Cards ----------
  const jobCard = (job: FeedJob) => {
    const cat = categoryInfo(job.categoryId);
    const pending = pendingFor(job.id);
    return (
      <SwipeCard key={job.id} style={[styles.card, pending && styles.cardBid]} onOpen={() => setDetail({ kind: 'bid', id: job.id })}>
        <View style={styles.row}>
          <GlassIcon emoji={cat.icon} />
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>{cat.name}</Text>
            <Text style={styles.sub}>
              {vehicleIcon(job.vehicle.type)} {job.vehicle.name} · {job.customer.name} · {ago(now - job.postedAt)}
            </Text>
          </View>
          <View style={[styles.badge, styles.badgeRow]}>
            <Icon name="clock" size={12} color={Colors.primary} />
            <Text style={[styles.badgeText, { color: Colors.primary }]}>{countdown(bidDeadline(job) - now)}</Text>
          </View>
        </View>
        <Text style={styles.desc} numberOfLines={2}>
          {job.description}
        </Text>
        {!!job.buddySummary && (
          <View style={styles.buddy}>
            <Text style={styles.buddyText}>🤖 Buddy: {job.buddySummary}</Text>
          </View>
        )}
        <View style={styles.chips}>
          {mediaChip(job)}
          <Chip text={`📍 කි.මී. ${job.distanceKm}`} />
          <Chip text={`🔩 ${SPARE_LABEL[job.sparePart]}`} />
          {job.doorstep && <Chip text="🚛 නිවසටම පැමිණීම" />}
          <Chip text={job.otherBids ? `🏷️ තවත් ලංසු ${job.otherBids}` : '🏷️ පළමු ලංසුව ඔබගේ විය හැක'} />
        </View>
        {bidActions(job)}
      </SwipeCard>
    );
  };

  const directCard = (d: DirectRequest) => {
    const cat = categoryInfo(d.categoryId);
    const left = d.respondBy - now;
    const urgent = left < 30 * 60 * 1000;
    return (
      <SwipeCard key={d.id} style={[styles.card, styles.cardDirect]} onOpen={() => setDetail({ kind: 'direct', id: d.id })}>
        <View style={styles.row}>
          <GlassIcon emoji={cat.icon} />
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>
              {cat.name}
              {d.service ? ` · ${d.service}` : ''}
            </Text>
            <Text style={styles.sub}>
              {vehicleIcon(d.vehicle.type)} {d.vehicle.name} · {d.customer.name} · {ago(now - d.requestedAt)}
            </Text>
          </View>
          {d.status === 'new' && (
            <View style={[styles.badge, styles.badgeRow, urgent && styles.badgeUrgent]}>
              <Icon name="clock" size={12} color={urgent ? Colors.errorText : Colors.success} />
              <Text style={[styles.badgeText, { color: urgent ? Colors.errorText : Colors.success }]}>{countdown(left)}</Text>
            </View>
          )}
        </View>
        <View style={styles.slot}>
          <Icon name="calendar" size={14} color={Colors.success} />
          <Text style={styles.slotText}>
            ඉල්ලූ වේලාව: {formatDate(d.preferredAt)} · {formatTime(d.preferredAt)}
          </Text>
        </View>
        <Text style={styles.desc} numberOfLines={2}>
          {d.description}
        </Text>
        <View style={styles.chips}>
          {mediaChip(d)}
          <Chip text={`📍 කි.මී. ${d.distanceKm}`} />
          <Chip text={`🔩 ${SPARE_LABEL[d.sparePart]}`} />
          {d.doorstep && <Chip text="🚛 නිවසටම පැමිණීම" />}
        </View>
        {directActions(d)}
      </SwipeCard>
    );
  };

  const bidCard = (bid: MyBid) => {
    const cat = categoryInfo(bid.job.categoryId);
    const s = STATUS[bid.status];
    return (
      <View key={bid.id} style={[styles.card, bid.status === 'withdrawn' && styles.dim]}>
        <View style={styles.row}>
          <GlassIcon emoji={cat.icon} small />
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>{cat.name}</Text>
            <Text style={styles.sub}>
              {bid.job.vehicle.name} · {bid.job.customer.name} · {ago(now - bid.submittedAt)}
            </Text>
          </View>
          <Text style={styles.price}>{money(bid.price)}</Text>
        </View>
        <View style={styles.chips}>
          <Chip text={`🛡️ ${bid.warrantyMonths ? `මාස ${bid.warrantyMonths} වගකීම` : 'වගකීමක් නැත'}`} />
          <Chip text={`⏱️ පැය ${bid.estHours}`} />
        </View>
        <View style={styles.rowBetween}>
          <View style={[styles.status, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.color() }]}>{s.label}</Text>
          </View>
          {bid.status === 'pending' && (
            <View style={styles.row}>
              <Pressable style={styles.linkBtn} onPress={() => withdrawBid(bid.id)}>
                <Text style={[styles.link, { color: Colors.errorText }]}>ඉවත් කරන්න</Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={() => setSheet({ job: bid.job, existing: bid })}>
                <Text style={styles.link}>සංස්කරණය</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

  const swipeHint = (
    <View style={styles.swipeHint}>
      <Text style={styles.swipeHintText}>⇆ ඡායාරූප, හඬ සටහන් සහ සම්පූර්ණ විස්තර සඳහා කාඩ්පතක් පැත්තට ස්වයිප් කරන්න</Text>
    </View>
  );

  return (
    <View style={styles.flex1}>
      <View style={styles.tabBar}>
        {segments.map((t) => {
          const active = segment === t.id;
          return (
            <Pressable key={t.id} style={[styles.tab, active && styles.tabActive]} onPress={() => setSegment(t.id)}>
              <Icon name={t.icon} size={14} color={active ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
                {t.label}
              </Text>
              {t.count > 0 && (
                <View style={[styles.tabCount, active && styles.tabCountActive, t.alert && styles.tabCountAlert]}>
                  <Text style={[styles.tabCountText, (active || t.alert) && { color: '#fff' }]}>{t.count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <ScrollView style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {segment === 'open' && (
          <>
            <View style={styles.chips}>
              {(
                [
                  ['services', `මගේ සේවා (${mine.length})`],
                  ['all', `සියල්ල (${open.length})`],
                ] as [Scope, string][]
              ).map(([id, label]) => (
                <Pressable key={id} style={[styles.filter, scope === id && styles.filterActive]} onPress={() => setScope(id)}>
                  <Text style={[styles.filterText, scope === id && styles.filterTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            {shown.length === 0 ? (
              <EmptyState icon="📭" title="නව රැකියා නැත" text="වාහන හිමියන් ඔබගේ සේවා සඳහා රැකියා පළ කළ විට ඒවා මෙහි පෙන්වනු ඇත." />
            ) : (
              <>
                {swipeHint}
                {shown.map(jobCard)}
              </>
            )}
          </>
        )}

        {segment === 'direct' && (
          <>
            <View style={styles.explain}>
              <Text style={styles.explainText}>
                📅 මෙම හිමියන් සේවා ප්‍රවර්ගයෙන් ඔබගේ ගරාජය ඍජුවම තෝරා ගත්තා — ලංසු තරගයක් නැත. පැය 2ක් ඇතුළත පිළිතුරු නොදුන්නොත් ඉල්ලීම කල් ඉකුත් වී හිමිකරුට වෙනත්
                ගරාජයක් තෝරා ගත හැක.
              </Text>
            </View>
            {directList.length === 0 ? (
              <EmptyState icon="📅" title="ඍජු ඉල්ලීම් නැත" text="හිමියන් ඔබගේ ගරාජය ඍජුවම වෙන් කළ විට ඒවා මෙහි පෙන්වනු ඇත." />
            ) : (
              <>
                {swipeHint}
                {directList.map(directCard)}
              </>
            )}
          </>
        )}

        {segment === 'mine' &&
          (bids.length === 0 ? (
            <EmptyState icon="🏷️" title="තවම ලංසු නැත" text="“ලංසු රැකියා” වෙතින් ලංසුවක් තැබූ විට එය මෙහි පෙන්වනු ඇත." />
          ) : (
            bids.map(bidCard)
          ))}
      </ScrollView>

      <JobDetailView
        target={detailTarget}
        onClose={() => setDetail(null)}
        renderActions={(t) => (t.kind === 'bid' ? bidActions(t.job, true) : t.kind === 'direct' ? directActions(t.job, true) : null)}
      />
      <BidSheet job={sheet?.job ?? null} existing={sheet?.existing} onClose={() => setSheet(null)} />
      <DirectReplySheet request={reply?.request ?? null} mode={reply?.mode ?? 'accept'} onClose={() => setReply(null)} />
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
    locked: { padding: 10, borderRadius: 12, backgroundColor: Colors.subtleFill, borderWidth: 1, borderColor: Colors.borderColor },
    lockedText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, lineHeight: 17 },
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    actionsRow: { flexDirection: 'row', gap: 8 },
    tabBar: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.borderColor,
      backgroundColor: Colors.bgCard,
    },
    tabActive: { backgroundColor: 'rgba(56, 189, 248, 0.14)', borderColor: 'rgba(56, 189, 248, 0.5)' },
    tabText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, flexShrink: 1 },
    tabTextActive: { color: Colors.primary },
    tabCount: {
      position: 'absolute',
      top: -7,
      right: -4,
      minWidth: 19,
      height: 19,
      paddingHorizontal: 5,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: Colors.bgBody,
      backgroundColor: Colors.bgCardHover,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabCountActive: { backgroundColor: Colors.primary },
    tabCountAlert: { backgroundColor: '#ef4444' },
    tabCountText: { fontSize: 9.5, fontWeight: '800', color: Colors.textMuted },
    body: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 100 },
    filter: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    filterActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    filterText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    filterTextActive: { color: '#fff' },
    swipeHint: { alignItems: 'center' },
    swipeHintText: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, textAlign: 'center' },
    explain: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(16, 185, 129, 0.08)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.35)' },
    explainText: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 17 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 18, padding: 14, gap: 10 },
    cardBid: { borderColor: 'rgba(245, 158, 11, 0.45)' },
    cardDirect: { borderColor: 'rgba(16, 185, 129, 0.45)' },
    dim: { opacity: 0.55 },
    cardTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    desc: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 18 },
    buddy: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(56, 189, 248, 0.08)', borderLeftWidth: 3, borderLeftColor: Colors.primary },
    buddyText: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: Colors.textSoft },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.45)', backgroundColor: 'rgba(56, 189, 248, 0.12)' },
    badgeUrgent: { borderColor: 'rgba(239, 68, 68, 0.45)', backgroundColor: 'rgba(239, 68, 68, 0.12)' },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    badgeText: { fontSize: 10, fontFamily: FONTS.bodySemiBold },
    slot: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(16, 185, 129, 0.1)' },
    slotText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    proposed: { padding: 10, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.1)', gap: 2 },
    proposedText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: Colors.subtleFill },
    chipAccent: { backgroundColor: 'rgba(56, 189, 248, 0.12)' },
    chipText: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    price: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.success },
    status: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
    statusText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold },
    linkBtn: { paddingHorizontal: 4, paddingVertical: 4 },
    link: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    hint: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center' },
  })
);
