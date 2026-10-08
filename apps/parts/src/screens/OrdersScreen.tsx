import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton, categoryInfo, CloseJobSheet, Colors, ReferralBadge, EmptyState, FONTS, GlassIcon, Icon, themedStyles, type IconName, softEdge, softShadow, NAVY, softFill, getThemeMode } from '@ongarage/shared';
import { Toast } from '../components/Toast';
import { buyerLabel, useShop } from '../context/ShopContext';
import { VerifyPurchaseSheet } from '../components/VerifyPurchaseSheet';
import { DispatchSheet } from '../components/DispatchSheet';
import { countdown, formatTime, isSameDay, money } from '../utils/format';
import type { ShopOrder, ShopOrderStatus, ShopSale } from '../types';

// Won quotes become orders. The shop confirms stock, packs, sends, and is paid when
// the garage checks the parts in — the shop-side mirror of the garage's Parts tab.
type Segment = 'active' | 'done';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const STEPS: { id: ShopOrderStatus; label: string }[] = [
  { id: 'confirming', label: 'තහවුරු' },
  { id: 'packing', label: 'ඇසුරුම්' },
  { id: 'dispatched', label: 'මගදී' },
  { id: 'arrived', label: 'භාර දුන්නා' },
  { id: 'received', label: 'ගෙවුවා' },
];
const PICKUP_STEPS: { id: ShopOrderStatus; label: string }[] = [
  { id: 'confirming', label: 'තහවුරු' },
  { id: 'packing', label: 'ඇසුරුම්' },
  { id: 'ready', label: 'කවුන්ටරයේ' },
  { id: 'received', label: 'භාර දී ගෙවුවා' },
];
const ACTIVE: ShopOrderStatus[] = ['confirming', 'packing', 'ready', 'dispatched', 'arrived', 'problem'];

export const OrdersScreen: React.FC = () => {
  const { orders, confirmStock, declineStock, acceptReturn, markReady, handOverPickup, sales, salesNeedingAction, markSaleReady, dispatchSale, saleUnavailable, profile } = useShop();
  const [checking, setChecking] = useState<ShopOrder | null>(null);
  const [segment, setSegment] = useState<Segment>('active');
  const [kind, setKind] = useState<'garages' | 'customers'>('garages');
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifying, setVerifying] = useState<ShopSale | null>(null);
  const [dispatching, setDispatching] = useState<ShopOrder | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const active = orders.filter((o) => ACTIVE.includes(o.status));
  const done = orders.filter((o) => !ACTIVE.includes(o.status));
  const paid = orders.filter((o) => o.status === 'received' && o.receivedAt);
  const salesPaid = sales.filter((x) => x.stage === 'bought' && x.purchase.boughtAt);
  const today = paid.filter((o) => isSameDay(o.receivedAt!, now)).reduce((s, o) => s + (o.payout ?? 0), 0) + salesPaid.filter((x) => isSameDay(x.purchase.boughtAt!, now)).reduce((s, x) => s + (x.payout ?? 0), 0);
  const week = paid.filter((o) => now - o.receivedAt! < WEEK_MS).reduce((s, o) => s + (o.payout ?? 0), 0) + salesPaid.filter((x) => now - x.purchase.boughtAt! < WEEK_MS).reduce((s, x) => s + (x.payout ?? 0), 0);
  const needsAction = active.filter((o) => o.status === 'confirming' || o.status === 'packing' || o.status === 'problem' || (o.status === 'ready' && !!o.pickup?.arrivedAt)).length;

  const segments: { id: Segment; label: string; icon: IconName; count: number; alert?: boolean }[] = [
    { id: 'active', label: 'ක්‍රියාත්මක', icon: 'clock', count: active.length, alert: needsAction > 0 },
    { id: 'done', label: 'අවසන්', icon: 'check-circle', count: done.length },
  ];

  const card = (o: ShopOrder) => {
    const q = o.quote;
    const r = q.request;
    const failed = o.status === 'unavailable' || o.status === 'problem' || o.status === 'returned';
    const steps = o.pickup ? PICKUP_STEPS : STEPS;
    const step = steps.findIndex((s) => s.id === o.status);
    return (
      <View key={o.id} style={[styles.card, o.status === 'confirming' && styles.cardUrgent, failed && styles.cardFailed]}>
        <View style={styles.row}>
          <GlassIcon emoji={r.categoryId ? categoryInfo(r.categoryId).icon : '🔩'} small />
          <View style={styles.flex1}>
            <Text style={styles.title} numberOfLines={1}>
              {r.garage.name}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {r.vehicle.name} · {r.vehicle.plate} · ඇණවුම {formatTime(o.placedAt)}
            </Text>
          </View>
          <Text style={styles.price}>{money(o.pickup ? q.partsTotal : q.total)}</Text>
        </View>
        <View style={styles.lines}>
          {r.lines.map((l, i) => (
            <View key={l.id} style={styles.rowBetween}>
              <Text style={styles.lineText}>
                {l.name} ×{l.qty} · {q.partType}
              </Text>
              <Text style={styles.sub}>{money(q.unitPrices[i] * l.qty)}</Text>
            </View>
          ))}
        </View>

        {!failed && (
          <View style={styles.steps}>
            {steps.map((s, i) => (
              <View key={s.id} style={styles.step}>
                <View style={[styles.stepDot, i <= step && styles.stepDone]} />
                <Text style={[styles.stepText, i <= step && { color: Colors.textMain }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {o.status === 'confirming' && (
          <>
            <Text style={styles.urgent}>⏳ තොගය තහවුරු කිරීමට {countdown(o.confirmBy - now)} — නැත්නම් ඇණවුම අහෝසි වී ශ්‍රේණියට බලපායි.</Text>
            <View style={styles.actions}>
              <View style={styles.flex1}>
                <ActionButton label="තොග නැත" icon="✕" variant="ghost" compact onPress={() => declineStock(o.id)} />
              </View>
              <View style={styles.flex2}>
                <ActionButton label="තොගයේ ඇත" icon="✓" variant="success" compact onPress={() => confirmStock(o.id)} />
              </View>
            </View>
          </>
        )}
        {o.pickup && o.status !== 'received' && !failed && <Text style={styles.sub}>🏪 ගරාජය කවුන්ටරයෙන් එකතු කරයි · {o.pickup.collector}</Text>}
        {o.status === 'packing' &&
          (o.pickup ? (
            <ActionButton label="ඇසුරුම් කළා · කවුන්ටරයේ සූදානම්" icon="🏪" variant="primary" compact onPress={() => markReady(o.id)} />
          ) : (
            <ActionButton label="ඇසුරුම් කළා · බෙදාහැරීමට යවන්න" icon="📦" variant="primary" compact onPress={() => setDispatching(o)} />
          ))}
        {o.status === 'ready' && o.pickup && (
          o.pickup.arrivedAt ? (
            <ActionButton label="පිකප් කේතය පරීක්ෂා කර භාර දෙන්න" icon="🔳" variant="success" compact onPress={() => setChecking(o)} />
          ) : (
            <Text style={styles.sub}>⏳ එකතු කිරීමට පැමිණෙන තුරු{o.pickup.holdUntil ? ` · ${formatTime(o.pickup.holdUntil)} දක්වා තබා ගන්න` : ''}</Text>
          )
        )}
        {o.status === 'dispatched' && o.delivery && (
          <View style={styles.rowBetween}>
            <Text style={[styles.sub, styles.flex1]}>
              🛵 {o.delivery.rider.name} · {o.delivery.courier ?? 'අපගේ රියදුරු'} · මිනි. {Math.max(0, Math.round((o.delivery.etaAt - now) / 60000))}කින්
            </Text>
            <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${o.delivery!.rider.phone}`)}>
              <Text style={styles.callText}>📞 රියදුරු</Text>
            </Pressable>
          </View>
        )}
        {o.status === 'arrived' && <Text style={styles.sub}>📦 ගරාජයට භාර දුන්නා — ගරාජය පරීක්ෂා කර ගෙවමින්…</Text>}
        {o.status === 'received' && (
          <View style={styles.rowBetween}>
            <Text style={styles.paid}>💰 ලැබුණා {money(o.payout ?? 0)}</Text>
            {o.rating ? <Text style={styles.stars}>{'★'.repeat(o.rating)}{'☆'.repeat(5 - o.rating)}</Text> : <Text style={styles.sub}>ශ්‍රේණිය බලාපොරොත්තුවෙන්</Text>}
          </View>
        )}
        {o.status === 'problem' && (
          <>
            <Text style={styles.fail}>↩️ ගරාජය වාර්තා කළා: {o.problem}</Text>
            <View style={styles.actions}>
              <View style={styles.flex1}>
                <ActionButton label="ගරාජය අමතන්න" icon="📞" variant="ghost" compact onPress={() => Linking.openURL(`tel:${r.garage.phone}`)} />
              </View>
              <View style={styles.flex1}>
                <ActionButton label="ආපසු ගන්න" icon="↩" variant="primary" compact onPress={() => acceptReturn(o.id)} />
              </View>
            </View>
          </>
        )}
        {o.status === 'returned' && <Text style={styles.sub}>↩️ ආපසු ගත්තා · කොටස තොගයට නැවත එක් කළා</Text>}
        {o.status === 'unavailable' && <Text style={styles.fail}>⛔ තොග නොමැති බැවින් අවලංගු විය — ගරාජය වෙනත් වෙළඳසැලක් තෝරා ගත්තා</Text>}
      </View>
    );
  };

  const saleCard = (x: ShopSale) => {
    const o = x.offer;
    const r = o.request;
    const delivery = x.purchase.fulfilment === 'delivery';
    const steps = delivery
      ? [{ id: 'reserved', label: 'වෙන් කළා' }, { id: 'dispatched', label: 'මගදී' }, { id: 'bought', label: 'ගෙවුවා' }]
      : [{ id: 'reserved', label: 'වෙන් කළා' }, { id: 'ready', label: 'කවුන්ටරයේ' }, { id: 'bought', label: 'ගෙවුවා' }];
    const step = steps.findIndex((t) => t.id === x.stage);
    const failed = x.stage === 'released';
    const v = o.brief.vehicle;
    return (
      <View key={x.id} style={[styles.card, x.stage === 'reserved' && styles.cardUrgent, failed && styles.cardFailed]}>
        <View style={styles.row}>
          <GlassIcon emoji={r.via === 'wall' ? '📣' : '🛍️'} small />
          <View style={styles.flex1}>
            <Text style={styles.title} numberOfLines={1}>
              {buyerLabel(r)}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {v.name} · {v.plate} · {delivery ? '🛵 බෙදාහැරීම' : '🏪 කවුන්ටරයෙන් එකතු කරයි'}
            </Text>
          </View>
          <Text style={styles.price}>{money(o.total)}</Text>
        </View>
        <View style={styles.lines}>
          <View style={styles.rowBetween}>
            <Text style={styles.lineText}>
              {o.brief.name} ×{o.qty} · {o.partType}
            </Text>
            <Text style={styles.sub}>{money(o.unitPrice)} × {o.qty}</Text>
          </View>
        </View>
        {!!r.enquiry.jobRef && <ReferralBadge garageName={r.enquiry.jobRef.garage.name} />}
        {!failed && (
          <View style={styles.steps}>
            {steps.map((t, i) => (
              <View key={t.id} style={styles.step}>
                <View style={[styles.stepDot, i <= step && styles.stepDone]} />
                <Text style={[styles.stepText, i <= step && { color: Colors.textMain }]}>{t.label}</Text>
              </View>
            ))}
          </View>
        )}
        {x.stage === 'reserved' && (
          <>
            <Text style={styles.urgent}>🔒 වෙන් කළා · {formatTime(x.purchase.reservedUntil)} දක්වා තබා ගන්න</Text>
            <View style={styles.actions}>
              <View style={styles.flex1}>
                <ActionButton label="කොටස නැත" icon="✕" variant="ghost" compact onPress={() => saleUnavailable(x.id)} />
              </View>
              {delivery ? (
                <>
                  {profile.courierEnabled && (
                    <View style={styles.flex2}>
                      <ActionButton label="PickMe වෙත යවන්න" icon="🛵" variant="primary" compact onPress={() => dispatchSale(x.id, 'courier')} />
                    </View>
                  )}
                  {profile.ownDelivery && (
                    <View style={styles.flex2}>
                      <ActionButton label="අපගේ රියදුරා" icon="🚚" variant="success" compact onPress={() => dispatchSale(x.id, 'shop')} />
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.flex2}>
                  <ActionButton label="ඇසුරුම් කළා · කවුන්ටරයේ සූදානම්" icon="🏪" variant="primary" compact onPress={() => markSaleReady(x.id)} />
                </View>
              )}
            </View>
          </>
        )}
        {x.stage === 'ready' &&
          (x.arrivedAt ? (
            <ActionButton label="කේතය පරීක්ෂා කර මුදල් ලබා ගන්න" icon="🔳" variant="success" compact onPress={() => { setVerifying(x); setVerifyOpen(true); }} />
          ) : (
            <Text style={styles.sub}>⏳ ගනුදෙනුකරු පැමිණෙන තුරු · {formatTime(x.purchase.reservedUntil)} දක්වා තබා ගන්න</Text>
          ))}
        {x.stage === 'dispatched' && x.delivery && (
          <View style={styles.rowBetween}>
            <Text style={[styles.sub, styles.flex1]}>
              🛵 {x.delivery.rider.name} · {x.delivery.method === 'courier' ? 'PickMe Flash' : 'අපගේ රියදුරු'} · මිනි. {Math.max(0, Math.round((x.delivery.etaAt - now) / 60000))}කින්
            </Text>
            <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${x.delivery!.rider.phone}`)}>
              <Text style={styles.callText}>📞 රියදුරු</Text>
            </Pressable>
          </View>
        )}
        {x.stage === 'bought' && (
          <View style={styles.rowBetween}>
            <Text style={styles.paid}>💰 ලැබුණා {money(x.payout ?? 0)}</Text>
            {x.purchase.returnBy && <Text style={styles.sub}>ආපසු දීමට {formatTime(x.purchase.returnBy)} දක්වා</Text>}
          </View>
        )}
        {x.stage === 'released' && <Text style={styles.fail}>⛔ කොටස නොතිබුණු බැවින් වෙන් කිරීම අහෝසි විය</Text>}
      </View>
    );
  };

  const activeSales = sales.filter((x) => x.stage !== 'bought' && x.stage !== 'released');
  const doneSales = sales.filter((x) => x.stage === 'bought' || x.stage === 'released');
  const customersView = (
    <>
      <ActionButton label="මිලදී ගැනීමේ කේතයක් පරීක්ෂා කරන්න" icon="🔳" variant="primary" compact onPress={() => { setVerifying(null); setVerifyOpen(true); }} />
      {sales.length === 0 ? (
        <EmptyState icon="🛍️" title="ගනුදෙනුකරු ඇණවුම් නැත" text="ගනුදෙනුකරුවෙක් ඔබගේ පිළිතුර තෝරා කොටස වෙන් කළ විට ඒවා මෙහි පෙන්වනු ඇත." />
      ) : (
        <>
          {activeSales.length > 0 && <Text style={styles.sectionLabel}>ක්‍රියාත්මක</Text>}
          {activeSales.map(saleCard)}
          {doneSales.length > 0 && <Text style={styles.sectionLabel}>අවසන්</Text>}
          {doneSales.map(saleCard)}
        </>
      )}
    </>
  );

  const list = segment === 'active' ? active : done;

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        <Stat value={money(today)} label="අද ආදායම" color={Colors.success} />
        <Stat value={money(week)} label="දින 7 ආදායම" color={Colors.primary} />
        <Stat value={String(paid.length + salesPaid.length)} label="ගෙවූ ඇණවුම්" color={Colors.warning} />
      </View>

      <View style={styles.tabBar}>
        {(
          [
            ['garages', 'ගරාජ ඇණවුම්', needsAction],
            ['customers', 'ගනුදෙනුකරුවන්', salesNeedingAction.length],
          ] as const
        ).map(([id, label, count]) => (
          <Pressable key={id} style={[styles.tab, kind === id && styles.tabActive]} onPress={() => setKind(id)} accessibilityLabel={`Orders ${id}`}>
            <Text style={[styles.tabText, kind === id && styles.tabTextActive]}>{label}</Text>
            {count > 0 && (
              <View style={[styles.tabCount, styles.tabCountAlert]}>
                <Text style={[styles.tabCountText, { color: '#fff' }]}>{count}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {kind === 'customers' ? (
        customersView
      ) : (
        <>
      <View style={styles.tabBar}>
        {segments.map((t) => {
          const on = segment === t.id;
          return (
            <Pressable key={t.id} style={[styles.tab, on && styles.tabActive]} onPress={() => setSegment(t.id)}>
              <Icon name={t.icon} size={14} color={on ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.tabText, on && styles.tabTextActive]}>{t.label}</Text>
              {t.count > 0 && (
                <View style={[styles.tabCount, on && styles.tabCountActive, t.alert && styles.tabCountAlert]}>
                  <Text style={[styles.tabCountText, (on || t.alert) && { color: '#fff' }]}>{t.count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {list.length === 0 ? (
        segment === 'active' ? (
          <EmptyState icon="📦" title="ක්‍රියාත්මක ඇණවුම් නැත" text="ගරාජයක් ඔබගේ මිල ගණන තෝරා ගත් විට ඇණවුම මෙහි පෙන්වනු ඇත." />
        ) : (
          <EmptyState icon="✅" title="අවසන් ඇණවුම් නැත" text="ගෙවූ, ආපසු ගත් සහ අවලංගු ඇණවුම් මෙහි පෙන්වනු ඇත." />
        )
      ) : (
        list.map(card)
      )}
        </>
      )}
      <DispatchSheet order={dispatching} onClose={() => setDispatching(null)} />
      <VerifyPurchaseSheet visible={verifyOpen} sale={verifying} onClose={() => setVerifyOpen(false)} />
      <CloseJobSheet
        visible={!!checking}
        onClose={() => setChecking(null)}
        overlay={<Toast topOffset={40} />}
        expectedCode={checking?.pickup?.code ?? ''}
        total={checking?.quote.partsTotal ?? 0}
        showSimulatedCode
        onConfirmed={() => checking && handOverPickup(checking.id)}
        text={{
          title: 'පිකප් කේතය පරීක්ෂා කරන්න',
          subtitle: checking ? `${checking.quote.request.garage.name} · ${checking.pickup?.collector}` : undefined,
          hint: 'එකතු කිරීමට පැමිණි අයගේ දුරකථනයේ QR කේතය ස්කෑන් කරන්න, නැත්නම් ඔවුන් කියන ඉලක්කම් 6 ඇතුළත් කරන්න. නිවැරදි ගරාජයට පමණක් භාර දෙන්න.',
          scan: 'QR ස්කෑන් කිරීම අනුකරණය කරන්න',
        }}
      />
    </ScrollView>
  );
};

const Stat: React.FC<{ value: string; label: string; color: string }> = ({ value, label, color }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    sectionLabel: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    actions: { flexDirection: 'row', gap: 8 },
    body: { padding: 16, gap: 12, paddingBottom: 100 },
    statsRow: { flexDirection: 'row', gap: 8 },
    stat: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, borderRadius: 20, borderWidth: 1, borderColor: softEdge(), backgroundColor: Colors.bgCard, ...softShadow() },
    statValue: { fontSize: 15, fontFamily: FONTS.titleBold },
    statLabel: { fontSize: 10, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    tabBar: { flexDirection: 'row', gap: 8, paddingTop: 4 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 22, backgroundColor: softFill() },
    tabActive: { backgroundColor: NAVY, shadowColor: NAVY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 4 },
    tabText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    tabTextActive: { color: '#ffffff' },
    tabCount: {
      position: 'absolute',
      top: -7,
      right: -4,
      minWidth: 19,
      height: 19,
      paddingHorizontal: 5,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: getThemeMode() === 'dark' ? Colors.bgBody : '#ffffff',
      backgroundColor: Colors.bgCardHover,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabCountActive: { backgroundColor: '#4ca1d1' },
    tabCountAlert: { backgroundColor: '#ef4444' },
    tabCountText: { fontSize: 9.5, fontWeight: '800', color: Colors.textMuted },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 20, padding: 14, gap: 10, ...softShadow() },
    cardUrgent: { borderColor: 'rgba(245, 158, 11, 0.55)' },
    cardFailed: { borderColor: 'rgba(239, 68, 68, 0.4)' },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1, lineHeight: 16 },
    price: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.success },
    lines: { gap: 4, padding: 10, borderRadius: 12, backgroundColor: Colors.subtleFill },
    lineText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    steps: { flexDirection: 'row', justifyContent: 'space-between' },
    step: { alignItems: 'center', gap: 4, flex: 1 },
    stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.subtleBorder },
    stepDone: { backgroundColor: Colors.success },
    stepText: { fontSize: 9.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    urgent: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 17 },
    fail: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.errorText, lineHeight: 17 },
    paid: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.successText },
    stars: { fontSize: 13, color: Colors.warning, letterSpacing: 2 },
    callBtn: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    callText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.success },
  })
);
