import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton, categoryInfo, Colors, EmptyState, FONTS, GlassIcon, Icon, SwipeCard, themedStyles, vehicleIcon, type IconName, softEdge, softShadow, NAVY, softFill, getThemeMode, PinnedEdge, usePinnedEdge, ReferralBadge } from '@ongarage/shared';
import { allowedTypes, buyerLabel, useShop, variantFor } from '../context/ShopContext';
import { PART_TYPE_LABEL } from '../constants/mockData';
import { QuoteSheet } from '../components/QuoteSheet';
import { RequestDetailSheet } from '../components/RequestDetailSheet';
import { OfferSheet } from '../components/OfferSheet';
import { StockLine } from '../components/StockLine';
import { ago, countdown, formatTime, money } from '../utils/format';
import type { CustomerRequest, IncomingRequest, MyOffer, MyQuote, OfferStatus, QuoteStatus } from '../types';

// The shop's inbox: garages nearby asking for parts. Like the garage app's job feed,
// one section to answer and one for what the shop already offered.
type Segment = 'new' | 'customers' | 'wall' | 'mine';

const STATUS: Record<QuoteStatus, { label: string; color: () => string; bg: string }> = {
  pending: { label: 'ගරාජය සලකා බලමින්', color: () => Colors.warning, bg: 'rgba(245, 158, 11, 0.12)' },
  won: { label: 'තෝරා ගත්තා · ඇණවුමක් විය', color: () => Colors.successText, bg: 'rgba(16, 185, 129, 0.12)' },
  lost: { label: 'වෙනත් මිල ගණනක් තෝරා ගත්තා', color: () => Colors.errorText, bg: 'rgba(239, 68, 68, 0.12)' },
  withdrawn: { label: 'ඉවත් කළා', color: () => Colors.textMuted, bg: 'rgba(148, 163, 184, 0.12)' },
};

const OFFER_STATUS: Record<OfferStatus, { label: string; color: () => string; bg: string }> = {
  pending: { label: 'ගනුදෙනුකරු සලකා බලමින්', color: () => Colors.warning, bg: 'rgba(245, 158, 11, 0.12)' },
  reserved: { label: 'වෙන් කළා · විකුණුමක් විය', color: () => Colors.successText, bg: 'rgba(16, 185, 129, 0.12)' },
  bought: { label: 'මිලදී ගත්තා', color: () => Colors.successText, bg: 'rgba(16, 185, 129, 0.12)' },
  lost: { label: 'වෙනත් වෙළඳසැලක් තෝරා ගත්තා', color: () => Colors.errorText, bg: 'rgba(239, 68, 68, 0.12)' },
  withdrawn: { label: 'ඉවත් කළා', color: () => Colors.textMuted, bg: 'rgba(148, 163, 184, 0.12)' },
};

export const RequestsScreen: React.FC = () => {
  const { progress: edge, scrollProps } = usePinnedEdge();
  const { isOpen, setOpen, profile, newRequests, quotes, passRequest, withdrawQuote, newCustomer, newWall, offers, withdrawOffer, passCustomer, stock } = useShop();
  const [segment, setSegment] = useState<Segment>('new');
  const [detail, setDetail] = useState<IncomingRequest | null>(null);
  const [quoting, setQuoting] = useState<IncomingRequest | null>(null);
  const [answering, setAnswering] = useState<CustomerRequest | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const segments: { id: Segment; label: string; icon: IconName; count: number; alert?: boolean }[] = [
    { id: 'new', label: 'ගරාජ', icon: 'inbox', count: newRequests.length, alert: newRequests.length > 0 },
    { id: 'customers', label: 'ගනුදෙනුකරු', icon: 'inbox', count: newCustomer.length, alert: newCustomer.length > 0 },
    { id: 'wall', label: 'විවෘත', icon: 'inbox', count: newWall.length, alert: newWall.length > 0 },
    { id: 'mine', label: 'මගේ', icon: 'tag', count: quotes.filter((q) => q.status === 'pending').length + offers.filter((o) => o.status === 'pending').length },
  ];

  const quote = (r: IncomingRequest) => {
    setDetail(null);
    setQuoting(r);
  };
  const pass = (r: IncomingRequest) => {
    setDetail(null);
    passRequest(r.id);
  };

  const requestCard = (r: IncomingRequest) => {
    const types = allowedTypes(r, profile.types);
    const cat = r.categoryId ? categoryInfo(r.categoryId) : undefined;
    const left = r.quoteUntil - now;
    const urgent = left < 15 * 60 * 1000;
    return (
      <SwipeCard key={r.id} style={styles.card} onOpen={() => setDetail(r)}>
        <Pressable style={styles.row} onPress={() => setDetail(r)} accessibilityLabel={`${r.garage.name} request`}>
          <GlassIcon emoji={cat?.icon ?? '🔩'} />
          <View style={styles.flex1}>
            <Text style={styles.title} numberOfLines={1}>
              {r.garage.name}
            </Text>
            <Text style={styles.sub}>
              ★ {r.garage.rating} · කි.මී. {r.distanceKm} · {ago(now - r.receivedAt)}
            </Text>
          </View>
          <View style={[styles.badge, urgent && styles.badgeUrgent]}>
            <Icon name="clock" size={12} color={urgent ? Colors.errorText : Colors.primary} />
            <Text style={[styles.badgeText, { color: urgent ? Colors.errorText : Colors.primary }]}>{countdown(left)}</Text>
          </View>
        </Pressable>
        <Text style={styles.vehicle}>
          {vehicleIcon(r.vehicle.type)} {r.vehicle.name} · {r.vehicle.plate}
          {r.vehicle.chassis ? ` · ${r.vehicle.chassis}` : ''}
        </Text>
        <View style={styles.lines}>
          {r.lines.map((l) => (
            <StockLine key={l.id} line={l} types={types} />
          ))}
        </View>
        <View style={styles.chips}>
          <Chip text={PART_TYPE_LABEL[r.partType]} accent />
          {r.reconApproval === 'approved' && <Chip text="Recon අනුමත" warn />}
          <Chip text={`⏱️ ලැබිය යුත්තේ ${formatTime(r.needBy)}`} />
          {r.oldPartPhoto && <Chip text="📷 ඡායාරූපය" />}
          <Chip text={r.otherQuotes ? `🏷️ තවත් ${r.otherQuotes}` : '🏷️ පළමුවැන්නා විය හැක'} />
        </View>
        {types.length ? (
          <View style={styles.actions}>
            <View style={styles.flex1}>
              <ActionButton label="මඟ හරින්න" icon="✕" variant="ghost" compact onPress={() => pass(r)} />
            </View>
            <View style={styles.flex2}>
              <ActionButton label="මිල ගණන් යවන්න" icon="📨" variant="primary" compact onPress={() => quote(r)} />
            </View>
          </View>
        ) : (
          <View style={styles.rowBetween}>
            <Text style={[styles.sub, styles.flex1]}>ඔබ {PART_TYPE_LABEL[r.partType]} කොටස් අලෙවි නොකරයි.</Text>
            <Pressable onPress={() => pass(r)} hitSlop={6}>
              <Text style={styles.link}>මඟ හරින්න</Text>
            </Pressable>
          </View>
        )}
      </SwipeCard>
    );
  };

  const quoteCard = (q: MyQuote) => {
    const s = STATUS[q.status];
    const r = q.request;
    return (
      <View key={q.id} style={[styles.card, q.status === 'withdrawn' && styles.dim]}>
        <View style={styles.row}>
          <GlassIcon emoji={r.categoryId ? categoryInfo(r.categoryId).icon : '🔩'} small />
          <View style={styles.flex1}>
            <Text style={styles.title} numberOfLines={1}>
              {r.garage.name}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {r.lines.map((l) => `${l.name} ×${l.qty}`).join(', ')}
            </Text>
          </View>
          <Text style={styles.price}>{money(q.total)}</Text>
        </View>
        <View style={styles.chips}>
          <Chip text={q.partType} accent />
          <Chip text={q.delivery === 'courier' ? `🛵 ${q.courier}` : '🚚 අපගේ බෙදාහැරීම'} />
          <Chip text={`⏱️ මිනි. ${q.etaMin}`} />
          <Chip text={`🛡️ ${q.warrantyMonths ? `මාස ${q.warrantyMonths}` : 'නැත'}`} />
        </View>
        <View style={styles.rowBetween}>
          <View style={[styles.status, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.color() }]}>{s.label}</Text>
          </View>
          {q.status === 'pending' && (
            <Pressable onPress={() => withdrawQuote(q.id)} hitSlop={6}>
              <Text style={[styles.link, { color: Colors.errorText }]}>ඉවත් කරන්න</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const customerCard = (r: CustomerRequest) => {
    const e = r.enquiry;
    const left = e.quoteUntil - now;
    const urgent = left < 15 * 60 * 1000;
    const v = e.briefs[0].vehicle;
    const referred = !!e.jobRef && e.jobRef.recommendedShopIds.includes(profile.id);
    return (
      <View key={r.id} style={styles.card}>
        <Pressable style={styles.row} onPress={() => setAnswering(r)} accessibilityLabel={`${buyerLabel(r)} enquiry`}>
          <GlassIcon emoji={r.via === 'wall' ? '📣' : '🛍️'} />
          <View style={styles.flex1}>
            <Text style={styles.title} numberOfLines={1}>
              {buyerLabel(r)}
            </Text>
            <Text style={styles.sub}>
              කි.මී. {r.distanceKm} · {ago(now - r.receivedAt)}
            </Text>
          </View>
          <View style={[styles.badge, urgent && styles.badgeUrgent]}>
            <Icon name="clock" size={12} color={urgent ? Colors.errorText : Colors.primary} />
            <Text style={[styles.badgeText, { color: urgent ? Colors.errorText : Colors.primary }]}>{countdown(left)}</Text>
          </View>
        </Pressable>
        <Text style={styles.vehicle}>
          {vehicleIcon(v.type)} {v.name} · {v.plate}
          {v.chassisNo ? ` · ${v.chassisNo}` : ''}
        </Text>
        <View style={styles.lines}>
          {e.briefs.map((b) => {
            const have = (['Genuine', 'OEM', 'Recon'] as const).reduce((sum, t) => sum + (variantFor(stock, b.name, t)?.qty ?? 0), 0);
            return (
              <View key={b.id} style={styles.rowBetween}>
                <Text style={[styles.title, styles.flex1]} numberOfLines={1}>
                  {b.name} ×{b.qty} · {b.partType === 'GarageChoice' ? 'ඕනෑම' : b.partType}
                </Text>
                <Text style={[styles.sub, { color: have >= b.qty ? Colors.successText : Colors.warning }]}>{have >= b.qty ? `තොගයේ ${have}` : have ? `ඇත්තේ ${have}` : 'තොගයේ නැත'}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.chips}>
          <Chip text={r.via === 'wall' ? '📣 විවෘත පෝස්ට් එක' : '🛍️ සෘජු ඉල්ලීම'} accent />
          {e.briefs.some((b) => b.photos?.length) && <Chip text="📷 ඡායාරූප" />}
          {e.briefs.some((b) => b.partNo) && <Chip text={`# ${e.briefs.find((b) => b.partNo)!.partNo}`} />}
          {v.chassisNo && <Chip text="චැසි අංකය ඇත" />}
        </View>
        {referred && <ReferralBadge garageName={e.jobRef!.garage.name} />}
        <View style={styles.actions}>
          <View style={styles.flex1}>
            <ActionButton label="මඟ හරින්න" icon="✕" variant="ghost" compact onPress={() => passCustomer(r.id)} />
          </View>
          <View style={styles.flex2}>
            <ActionButton label="පිළිතුරු දෙන්න" icon="📨" variant="primary" compact onPress={() => setAnswering(r)} />
          </View>
        </View>
      </View>
    );
  };

  const offerCard = (o: MyOffer) => {
    const st = OFFER_STATUS[o.status];
    return (
      <View key={o.id} style={[styles.card, o.status === 'withdrawn' && styles.dim]}>
        <View style={styles.row}>
          <GlassIcon emoji={o.request.via === 'wall' ? '📣' : '🛍️'} small />
          <View style={styles.flex1}>
            <Text style={styles.title} numberOfLines={1}>
              {buyerLabel(o.request)}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {o.brief.name} ×{o.qty}
            </Text>
          </View>
          <Text style={styles.price}>{o.available ? money(o.total) : 'තොගයේ නැත'}</Text>
        </View>
        {o.available && (
          <View style={styles.chips}>
            <Chip text={o.partType} accent />
            {o.fitmentConfirmed && <Chip text="✓ ගැළපීම තහවුරුයි" />}
            <Chip text={`🛡️ ${o.warrantyMonths ? `මාස ${o.warrantyMonths}` : 'නැත'}`} />
            <Chip text={`🏪 මිනි. ${o.readyInMin}`} />
          </View>
        )}
        <View style={styles.rowBetween}>
          <View style={[styles.status, { backgroundColor: st.bg }]}>
            <Text style={[styles.statusText, { color: st.color() }]}>{st.label}</Text>
          </View>
          {o.status === 'pending' && (
            <Pressable onPress={() => withdrawOffer(o.id)} hitSlop={6}>
              <Text style={[styles.link, { color: Colors.errorText }]}>ඉවත් කරන්න</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const closedView = (
    <View style={styles.closed}>
      <Text style={styles.closedTitle}>🔒 වෙළඳසැල වසා ඇත</Text>
      <Text style={styles.sub}>විවෘත කළ විට ගනුදෙනුකරුවන්ගෙන් සහ විවෘත පෝස්ට් වලින් ඉල්ලීම් ලැබේ.</Text>
      <ActionButton label="වෙළඳසැල විවෘත කරන්න" icon="🔓" variant="success" compact onPress={() => setOpen(true)} />
    </View>
  );
  const customersView = !isOpen ? (
    closedView
  ) : newCustomer.length === 0 ? (
    <EmptyState icon="🛍️" title="ගනුදෙනුකරුවන්ගෙන් ඉල්ලීම් නැත" text="ළඟ වාහන හිමියන් කොටසක් සොයන විට ඒවා මෙහි පෙන්වනු ඇත." />
  ) : (
    <>{newCustomer.map(customerCard)}</>
  );
  const wallView = !isOpen ? (
    closedView
  ) : newWall.length === 0 ? (
    <EmptyState icon="📣" title="විවෘත පෝස්ට් නැත" text="මුළු ලංකාවෙන්ම දුර්ලභ කොටස් සොයන අයගේ පෝස්ට්, ඔබ අලෙවි කරන වර්ගවලට අදාළ ඒවා මෙහි පෙන්වනු ඇත." />
  ) : (
    <>
      <Text style={styles.hint}>📣 විවෘත දුර්ලභ කොටස් සෙවීමේ පෝස්ට් — ඔබ අලෙවි කරන කොටස් වර්ගයට අදාළ ඒවා පමණි</Text>
      {newWall.map(customerCard)}
    </>
  );
  const mineView =
    quotes.length === 0 && offers.length === 0 ? (
      <EmptyState icon="🏷️" title="තවම මිල ගණන් නැත" text="ඉල්ලීමකට මිල ගණනක් හෝ පිළිතුරක් යැවූ විට එය මෙහි පෙන්වනු ඇත." />
    ) : (
      <>
        {offers.length > 0 && <Text style={styles.hint}>ගනුදෙනුකරුවන්ට යැවූ පිළිතුරු</Text>}
        {offers.map(offerCard)}
        {quotes.length > 0 && <Text style={styles.hint}>ගරාජවලට යැවූ මිල ගණන්</Text>}
        {quotes.map(quoteCard)}
      </>
    );

  return (
    <View style={styles.flex1}>
      <View style={styles.tabBar}>
        <PinnedEdge progress={edge} />
        {segments.map((t) => {
          const active = segment === t.id;
          return (
            <Pressable key={t.id} style={[styles.tab, active && styles.tabActive]} onPress={() => setSegment(t.id)}>
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

      <ScrollView style={styles.flex1} {...scrollProps} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {segment === 'customers' ? (
          customersView
        ) : segment === 'wall' ? (
          wallView
        ) : segment === 'new' ? (
          !isOpen ? (
            <View style={styles.closed}>
              <Text style={styles.closedTitle}>🔒 වෙළඳසැල වසා ඇත</Text>
              <Text style={styles.sub}>විවෘත කළ විට කි.මී. {profile.deliveryRadiusKm} ඇතුළත ගරාජවලින් කොටස් ඉල්ලීම් ලැබේ.</Text>
              <ActionButton label="වෙළඳසැල විවෘත කරන්න" icon="🔓" variant="success" compact onPress={() => setOpen(true)} />
            </View>
          ) : newRequests.length === 0 ? (
            <EmptyState icon="📭" title="නව ඉල්ලීම් නැත" text={`කි.මී. ${profile.deliveryRadiusKm} ඇතුළත ගරාජ කොටස් ඉල්ලූ විට ඒවා මෙහි පෙන්වනු ඇත.`} />
          ) : (
            <>
              <Text style={styles.hint}>⇆ ඡායාරූපය, සිතියම සහ සම්පූර්ණ විස්තර සඳහා කාඩ්පතක් පැත්තට ස්වයිප් කරන්න</Text>
              {newRequests.map(requestCard)}
            </>
          )
        ) : (
          mineView
        )}
      </ScrollView>

      <RequestDetailSheet request={detail} onClose={() => setDetail(null)} onQuote={quote} onPass={pass} />
      <QuoteSheet request={quoting} onClose={() => setQuoting(null)} />
      <OfferSheet request={answering} onClose={() => setAnswering(null)} />
    </View>
  );
};

const Chip: React.FC<{ text: string; accent?: boolean; warn?: boolean }> = ({ text, accent, warn }) => (
  <View style={[styles.chip, accent && styles.chipAccent, warn && styles.chipWarn]}>
    <Text style={[styles.chipText, accent && { color: Colors.primary }, warn && { color: Colors.warning }]}>{text}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    actions: { flexDirection: 'row', gap: 8 },
    tabBar: { zIndex: 5, flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 22, backgroundColor: softFill() },
    tabActive: { backgroundColor: NAVY, shadowColor: NAVY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 4 },
    tabText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
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
    body: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 100 },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, textAlign: 'center' },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 20, padding: 14, gap: 10, ...softShadow() },
    dim: { opacity: 0.55 },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1, lineHeight: 16 },
    vehicle: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: Colors.textSoft },
    lines: { gap: 6, padding: 10, borderRadius: 12, backgroundColor: Colors.subtleFill },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.45)', backgroundColor: 'rgba(56, 189, 248, 0.12)' },
    badgeUrgent: { borderColor: 'rgba(239, 68, 68, 0.45)', backgroundColor: 'rgba(239, 68, 68, 0.12)' },
    badgeText: { fontSize: 10, fontFamily: FONTS.bodySemiBold },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: Colors.subtleFill },
    chipAccent: { backgroundColor: 'rgba(56, 189, 248, 0.12)' },
    chipWarn: { backgroundColor: 'rgba(245, 158, 11, 0.14)' },
    chipText: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    price: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.success },
    status: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
    statusText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold },
    link: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    closed: { padding: 16, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), gap: 10, alignItems: 'center', ...softShadow() },
    closedTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
  })
);
