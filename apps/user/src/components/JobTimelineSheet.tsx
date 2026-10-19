import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FONTS, Icon, PhotoStrip, themedStyles, type DiagnosisLine, type OwnerDecision } from '@ongarage/shared';
import { elevation1, outline, pageBg } from '../utils/material';
import { useWorkshops } from '../context/WorkshopContext';
import { formatDate, formatTime, money } from '../utils/format';

const stamp = (t?: number) => (t ? `${formatDate(t)} · ${formatTime(t)}` : '');
const VIA = { app: 'ඔබගේ යෙදුමෙන්', phone: 'දුරකථනයෙන් ගරාජයට දැන්වූවා', deferred: 'පසුවට තබා ගත්තා' } as const;
const CLAIM = { open: 'විවෘතයි', accepted: 'පිළිගත්තා', rejected: 'ප්‍රතික්ෂේප විය', escalated: 'OnGarage වෙත' } as const;

/** Who ordered / bought a part line: the garage (from its stock or from a shop) or the customer (OnMart). */
const sourceOf = (l: DiagnosisLine) =>
  l.kind !== 'part' ? '' : l.source === 'owner' ? '🛍️ ඔබ (පාරිභෝගිකයා) OnMart හි මිලදී ගත්තා' : l.source === 'order' ? '🏭 ගරාජය වෙළඳසැලකින් ඇණවුම් කළා' : '📦 ගරාජයේ තොගයෙන්';

/** The colour of an event's dot, by what kind of step it is. */
const TONE: Record<string, string> = { '📅': '#2457e6', '🚗': '#0891b2', '🔍': '#8b5cf6', '✅': '#0e9f6e', '♻️': '#0e9f6e', '➕': '#f59e0b', '🔩': '#f59e0b', '🔧': '#2457e6', '🔑': '#0e9f6e', '💵': '#0e9f6e', '⚠️': '#e5483d', '⭐': '#f59e0b' };

type Event = { icon: string; title: string; at?: number; body: React.ReactNode };

/** The whole story of a finished job, step by step: who did what and when, every part asked for (and whether the garage or the customer ordered it), and what the technician reported. */
export const JobTimelineSheet: React.FC<{ id: string | null; onClose: () => void }> = ({ id, onClose }) => {
  const { workshops } = useWorkshops();
  const [shownId, setShownId] = React.useState<string | null>(id);
  React.useEffect(() => {
    if (id) setShownId(id);
  }, [id]);
  const w = shownId ? workshops[shownId] : undefined;
  if (!id || !w) return null;
  const p = w.progress;
  const tech = w.technician;
  const who = tech ? `කාර්මිකයා ${tech}` : w.garageName;

  const lineRows = (lines: DiagnosisLine[], decision?: OwnerDecision) =>
    lines.map((l) => {
      const state = decision ? (decision.approvedLineIds.includes(l.id) ? 'approved' : 'declined') : 'approved';
      const bought = l.source === 'owner' ? w.partsBought?.[l.id] : undefined;
      return (
        <View key={l.id} style={styles.lineRow}>
          <View style={styles.flex1}>
            <Text style={[styles.lineName, state === 'declined' && styles.struck]}>
              {l.kind === 'part' ? '🔩' : '🛠️'} {l.name}
              {l.qty > 1 ? ` ×${l.qty}` : ''}
              {l.partType ? ` · ${l.partType}` : ''}
            </Text>
            {!!sourceOf(l) && <Text style={styles.sub}>{sourceOf(l)}</Text>}
            {!!bought && (
              <Text style={styles.sub}>
                ✓ {bought.shopName} · {money(bought.amount)} · {stamp(bought.at)}
              </Text>
            )}
            {l.source === 'owner' && !bought && <Text style={styles.sub}>OnMart ගැනුම ගැන වාර්තාවක් නැත</Text>}
          </View>
          <Text style={[styles.linePrice, state === 'declined' && styles.struck]}>{money(l.price)}</Text>
        </View>
      );
    });

  const events: Event[] = [];
  events.push({
    icon: '📅',
    title: 'වෙන් කළා',
    at: w.scheduledAt,
    body: (
      <Text style={styles.sub}>
        {w.garageName} · එකඟ මිල {money(w.agreedPrice)} · {w.doorstep ? 'ගරාජය ඔබ වෙත පැමිණියා' : 'ඔබ වාහනය ගරාජයට ගෙන ගියා'}
      </Text>
    ),
  });
  if (p.receivedAt)
    events.push({
      icon: '🚗',
      title: 'වාහනය භාර ගත්තා',
      at: p.receivedAt,
      body: (
        <>
          <Text style={styles.sub}>{who} වාහනය භාර ගෙන තත්ත්වය ඡායාරූප ගත්තා.</Text>
          {!!p.checkInPhotos?.length && <PhotoStrip photos={p.checkInPhotos} height={80} emptyText="" />}
        </>
      ),
    });
  if (p.diagnosis)
    events.push({
      icon: '🔍',
      title: `${tech ? `කාර්මිකයා ${tech} ලියූ` : 'ගරාජය ලියූ'} විනිශ්චය වාර්තාව`,
      at: p.diagnosis.sentAt,
      body: (
        <>
          <Text style={styles.report}>{p.diagnosis.findings}</Text>
          {!!p.diagnosis.photos?.length && <PhotoStrip photos={p.diagnosis.photos} height={80} emptyText="" />}
          {!!p.diagnosis.voiceNotes?.length && <Text style={styles.sub}>🎙️ හඬ සටහන් {p.diagnosis.voiceNotes.length}</Text>}
          <Text style={styles.subHead}>කොටස් සහ වැඩ</Text>
          {lineRows(p.diagnosis.lines, p.decision)}
          <Text style={styles.sub}>සංශෝධිත මුළු මුදල {money(p.diagnosis.revisedTotal)}</Text>
        </>
      ),
    });
  if (p.decision)
    events.push({
      icon: '✅',
      title: p.decision.approvedLineIds.length ? `ඔබ අනුමත කළා (රේඛා ${p.decision.approvedLineIds.length})` : 'ඔබ එකඟ වූ වැඩ පමණක් කරන්නැයි කීවා',
      at: p.decision.decidedAt,
      body: <Text style={styles.sub}>{VIA[p.decision.via ?? 'app']}{p.decision.declinedLineIds.length ? ` · ප්‍රතික්ෂේප කළ රේඛා ${p.decision.declinedLineIds.length}` : ''}</Text>,
    });
  for (const r of p.recon ?? [])
    events.push({
      icon: '♻️',
      title: `Recon ඉල්ලීම · ${r.partNames.join(', ')}`,
      at: r.askedAt,
      body: (
        <Text style={styles.sub}>
          Genuine {money(r.genuinePrice)} වෙනුවට Recon {money(r.reconPrice)} · {r.status === 'approved' ? 'ඔබ අනුමත කළා' : r.status === 'declined' ? 'ඔබ ප්‍රතික්ෂේප කළා' : 'පිළිතුරු බලාපොරොත්තුවෙන්'}
        </Text>
      ),
    });
  (p.extras ?? []).forEach((x, i) =>
    events.push({
      icon: '➕',
      title: `අමතර වැඩ ${i + 1} · ${who} සොයා ගත්තා`,
      at: x.sentAt,
      body: (
        <>
          <Text style={styles.report}>{x.reason}</Text>
          {!!x.photos?.length && <PhotoStrip photos={x.photos} height={80} emptyText="" />}
          {lineRows(x.lines, x.decision)}
          <Text style={styles.sub}>
            {x.decision ? `${VIA[x.decision.via ?? 'app']} · ${stamp(x.decision.decidedAt)}` : 'පිළිතුරු නැත'}
          </Text>
        </>
      ),
    })
  );
  for (const f of p.fitRequests ?? [])
    events.push({
      icon: '🔩',
      title: `කොටසක් සවි කිරීමට ඉල්ලුවා · ${f.partName}`,
      at: f.requestedAt,
      body: (
        <Text style={styles.sub}>
          {f.supply === 'owner' ? 'ඔබ කොටස ගෙන ආවා' : 'ගරාජය කොටස සපයන්නේ'} · {f.status === 'accepted' ? 'ගරාජය පිළිගත්තා' : f.status === 'declined' ? `ගරාජය ප්‍රතික්ෂේප කළා${f.declineReason ? ` (${f.declineReason})` : ''}` : 'පිළිතුරු බලාපොරොත්තුවෙන්'}
          {f.note ? ` · ${f.note}` : ''}
        </Text>
      ),
    });
  if (p.handover) {
    const h = p.handover;
    events.push({
      icon: '🔧',
      title: `${who} අලුත්වැඩියාව අවසන් කර භාර දීමට සූදානම් කළා`,
      at: h.readyAt,
      body: (
        <>
          {h.checklist.map((c) => (
            <Text key={c.label} style={styles.sub}>
              {c.done ? '☑' : '☐'} {c.label}
            </Text>
          ))}
          <Text style={styles.sub}>🔩 ගැලවූ පරණ කොටස් {h.oldPartsKept ? 'ඔබට ලබා දුන්නා' : 'තබා නැත'}</Text>
          {!!h.beforePhotos?.length && (
            <>
              <Text style={styles.subHead}>අලුත්වැඩියාවට පෙර</Text>
              <PhotoStrip photos={h.beforePhotos} height={80} emptyText="" />
            </>
          )}
          {!!h.afterPhotos?.length && (
            <>
              <Text style={styles.subHead}>අලුත්වැඩියාවෙන් පසු</Text>
              <PhotoStrip photos={h.afterPhotos} height={80} emptyText="" />
            </>
          )}
          <Text style={styles.sub}>
            බිල: වැඩ {money(h.bill.labour)} + කොටස් {money(h.bill.parts)} = {money(h.bill.total)}
          </Text>
        </>
      ),
    });
  }
  if (p.closedAt)
    events.push({
      icon: '🔑',
      title: 'ඔබගේ කේතයෙන් වසා දැමුවා',
      at: p.closedAt,
      body: (
        <Text style={styles.sub}>
          රිසිට්පත {w.receiptNo ?? '—'} · වගකීම මාස {w.warrantyMonths}
          {p.warrantyUntil ? ` (${formatDate(p.warrantyUntil)} දක්වා)` : ''}
        </Text>
      ),
    });
  if (p.payment)
    events.push({
      icon: '💵',
      title: p.payment.balance > 0 ? 'ගෙවීම (කොටසක් පමණි)' : 'සම්පූර්ණයෙන් ගෙවුවා',
      at: p.payment.recordedAt,
      body: (
        <Text style={styles.sub}>
          බිල {money(p.payment.total)} · ලැබුණු {money(p.payment.received)}
          {p.payment.balance > 0 ? ` · ඉතිරි ${money(p.payment.balance)}${p.payment.promisedAt ? ` (${formatDate(p.payment.promisedAt)} දක්වා)` : ''}` : ''}
        </Text>
      ),
    });
  for (const x of p.payment?.installments ?? [])
    events.push({ icon: '💵', title: 'ඉතිරි මුදලින් කොටසක් ගෙවුවා', at: x.at, body: <Text style={styles.sub}>{money(x.amount)}</Text> });
  if (p.warrantyClaim)
    events.push({ icon: '⚠️', title: 'වගකීම් ඉල්ලීමක්', at: p.warrantyClaim.raisedAt, body: <Text style={styles.sub}>{p.warrantyClaim.text} · {CLAIM[p.warrantyClaim.status]}</Text> });
  if (w.review)
    events.push({
      icon: '⭐',
      title: `ඔබගේ සමාලෝචනය · ${'★'.repeat(Math.round(w.review.rating))}${'☆'.repeat(5 - Math.round(w.review.rating))}`,
      at: w.review.at,
      body: (
        <>
          {!!w.review.text && <Text style={styles.sub}>“{w.review.text}”</Text>}
          {!!w.review.reply && <Text style={styles.sub}>ගරාජයේ පිළිතුර: {w.review.reply.text}</Text>}
        </>
      ),
    });

  // Every part asked for during the job, by who ordered it.
  const all: DiagnosisLine[] = [...(p.diagnosis?.lines ?? []), ...(p.extras ?? []).flatMap((x) => x.lines)].filter((l) => l.kind === 'part');
  const byGarage = all.filter((l) => l.source !== 'owner');
  const byOwner = all.filter((l) => l.source === 'owner');

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <SafeAreaView style={styles.flex1} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Pressable style={styles.iconBtn} onPress={onClose} hitSlop={8} accessibilityLabel="Close timeline">
              <Icon name="x" size={16} color={Colors.textMain} />
            </Pressable>
            <Text style={styles.headerTitle}>රැකියාවේ සම්පූර්ණ කාල රේඛාව</Text>
          </View>
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {all.length > 0 && (
              <View style={styles.partsPlain}>
                <Text style={styles.sub}>
                  🏭 ගරාජය සැපයූ කොටස්: <Text style={styles.partsNames}>{byGarage.length ? byGarage.map((l) => l.name).join(', ') : '—'}</Text>
                </Text>
                <Text style={styles.sub}>
                  🛍️ ඔබ මිලදී ගත් කොටස්: <Text style={styles.partsNames}>{byOwner.length ? byOwner.map((l) => l.name).join(', ') : '—'}</Text>
                </Text>
              </View>
            )}
            <View style={styles.card}>
              {events.map((e, i) => (
                <View key={`${e.title}-${i}`} style={styles.event}>
                  <View style={styles.rail}>
                    <View style={[styles.dot, { backgroundColor: (TONE[e.icon] ?? '#2457e6') + '22', borderColor: (TONE[e.icon] ?? '#2457e6') + '55' }]}>
                      <Text style={styles.dotIcon}>{e.icon}</Text>
                    </View>
                    {i < events.length - 1 && <View style={styles.railLine} />}
                  </View>
                  <View style={[styles.flex1, styles.eventBody]}>
                    <Text style={styles.eventTitle}>{e.title}</Text>
                    {!!e.at && <Text style={styles.time}>{stamp(e.at)}</Text>}
                    <View style={styles.eventContent}>{e.body}</View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    root: { flex: 1, backgroundColor: pageBg() },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 6, minHeight: 56, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: outline(), ...elevation1() },
    iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    body: { paddingHorizontal: 6, paddingTop: 12, gap: 12, paddingBottom: 28 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), borderRadius: 20, padding: 16, gap: 8, ...elevation1() },
    partsPlain: { gap: 4, paddingHorizontal: 2 },
    partsNames: { fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    event: { flexDirection: 'row', gap: 12 },
    rail: { alignItems: 'center', width: 34 },
    dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    dotIcon: { fontSize: 16 },
    railLine: { flex: 1, width: 2, marginVertical: 2, borderRadius: 1, backgroundColor: outline() },
    eventBody: { paddingBottom: 18 },
    eventTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain, lineHeight: 18 },
    time: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, marginTop: 1 },
    eventContent: { gap: 6, marginTop: 8, padding: 12, borderRadius: 16, backgroundColor: pageBg() },
    report: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 19 },
    sub: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    subHead: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMain, marginTop: 4 },
    lineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 12, backgroundColor: Colors.bgCard },
    lineName: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    linePrice: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    struck: { textDecorationLine: 'line-through', opacity: 0.55 },
  })
);
