import React, { useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, ago, cartLeftMin, checkWindowText, Colors, countdown, dealLabel, DEFAULT_COMMISSION_PERCENT, directionsUrl, FitmentBadge, fitmentLevel, FONTS, getAi, getThemeMode, LkPlate, martShop, money, partCategoryOfBrief, PRICE_TAG_LABEL, priceTag, ReferralBadge, referralDisclosure, ringKm, SEARCH_RINGS, SUGGEST_MIN_CONFIDENCE, SwipeCard, themedStyles, type ShopOffer } from '@ongarage/shared';
import { useMart, type MartEnquiry } from '../../context/MartContext';
import { useUserLocation } from '../../context/LocationContext';
import { useVehicles } from '../../context/VehiclesContext';
import type { EnquiryPrefill } from './EnquirySheet';
import { Sheet } from '../Sheet';
import { CartPanel } from './CartSheet';
import { PartCategoryIcon } from './PartCategoryGrid';
import { ReachPanel } from './RequestCard';

export type OfferSort = 'price' | 'rating' | 'near' | 'fast';

const hasIt = (o: ShopOffer) => o.available && o.reply !== 'check' && o.reply !== 'none';
// A "have it" with no price (asked at the counter) sorts after every priced one.
const priceOf = (o: ShopOffer) => o.total || Number.MAX_SAFE_INTEGER;

/** The offers in the order the owner chose; the price breaks every tie. */
const sortOffers = (offers: ShopOffer[], by: OfferSort) => {
  const key = (o: ShopOffer) => (by === 'rating' ? -o.shop.rating : by === 'near' ? o.shop.distanceKm : by === 'fast' ? o.readyInMin : priceOf(o));
  return [...offers].sort((a, b) => key(a) - key(b) || priceOf(a) - priceOf(b));
};

const timeLeft = (ms: number) => {
  const days = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return days > 0 ? `දින ${days} ක් පැය ${h}` : h > 0 ? `පැය ${h} ක් ${m} මිනි.` : `මිනි. ${Math.max(1, m)}`;
};

const km = (d: number) => (d < 10 ? d.toFixed(1) : String(Math.round(d)));

/**
 * A request for one part, laid out as a job card on Bids: the part and the vehicle, the time left, and every shop that has it as an offer card on the page,
 * with Details, Directions and Add to cart. Everything else (who was asked, the wall post, cancelling) is in the request's details.
 */
export const SingleRequestCard: React.FC<{
  me: MartEnquiry;
  now: number;
  sort: OfferSort;
  onOpenShop: (shopId: string) => void;
  onChat: (offer: ShopOffer) => void;
  /** Told when one of the card's own windows opens or closes. */
  onWindow?: (open: boolean) => void;
  /** Open the part request form filled with this request; sending replaces it. */
  onEdit: (prefill: EnquiryPrefill) => void;
  /** Told when the request was sent again as it was. */
  onResent: (wallOnly: boolean) => void;
}> = ({ me, now, sort, onOpenShop, onChat, onWindow, onEdit, onResent }) => {
  const { offersFor, cart, addToCart, removeFromCart, postToWall, searchWithin, cancelEnquiry, createEnquiry } = useMart();
  const { vehicles } = useVehicles();
  const [summary, setSummary] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const user = useUserLocation();
  const e = me.enquiry;
  const brief = e.briefs[0];
  const [details, setDetails] = useState(false);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [wallText, setWallText] = useState('');
  const [wallError, setWallError] = useState<string | null>(null);

  // While a window of this card is open, the card must stay where it is: moving it would close the window.
  const windowOpen = details || !!offerId || cartOpen || rangeOpen || summary || deleting;
  const tell = useRef(onWindow);
  tell.current = onWindow;
  useEffect(() => {
    if (!windowOpen) return;
    tell.current?.(true);
    return () => tell.current?.(false);
  }, [windowOpen]);

  const offers = offersFor(e.id);
  const open = e.status === 'open' && e.quoteUntil > now;
  const have = sortOffers(offers.filter(hasIt), sort);
  const cheapest = sortOffers(have.filter((o) => o.total), 'price')[0];
  const checking = offers.filter((o) => !o.available && o.reply === 'check');
  const asked = me.askedShopIds;
  const answered = new Set(offers.map((o) => o.shop.id));
  const waiting = asked.filter((id) => !answered.has(id)).length;
  const category = partCategoryOfBrief(brief);
  const onWall = e.audience !== 'shops';
  const currentKm: number | 'all' = e.radiusKm ?? (ringKm(e.ring) === Infinity ? 'all' : ringKm(e.ring));
  const kmLabel = currentKm === 'all' ? 'මුළු ලංකාව' : `km ${currentKm}`;
  const hasRange = e.audience !== 'wall' && !me.onlyShopIds?.length;
  // A part nobody has can go to the open wall once the search has reached 100 km.
  const nobody = open && !me.searching && have.length === 0 && checking.length === 0;
  const canPost = open && !onWall && have.length === 0 && (currentKm === 'all' || currentKm >= 100);
  const myCart = cart.filter((l) => l.enquiryId === e.id);
  const cartTotal = myCart.reduce((t, l) => t + (offers.find((o) => o.id === l.offerId)?.total ?? 0), 0);
  const left = e.quoteUntil - now;
  const urgent = left < 3600000;
  const status: Record<string, string> = { reserved: 'වෙන් කළා', bought: 'මිලදී ගත්තා', cancelled: 'අවලංගු කළා', expired: 'කල් ඉකුත් විය' };
  const ended = !open ? status[e.status] ?? status.expired : null;
  const range: Record<string, 'good' | 'bad' | 'look' | 'wait'> = {};
  for (const id of asked) {
    const o = offers.find((x) => x.shop.id === id);
    range[id] = !o ? 'wait' : hasIt(o) ? 'good' : o.reply === 'check' ? 'look' : 'bad';
  }
  const viewed = offers.find((o) => o.id === offerId);
  // Still open with nothing to choose yet: the Pending card.
  const isPending = open && have.length === 0;
  const isExpired = !open && (e.status === 'open' || e.status === 'cancelled' || e.status === 'expired');
  const validDays = Math.max(1, Math.round((e.quoteUntil - e.createdAt) / 86400000));
  const kindLabel = brief.partType === 'GarageChoice' ? 'ඕනෑම වර්ගයක්' : brief.partType;
  const ringLabel = SEARCH_RINGS.find((r) => r.ring === e.ring)?.label ?? kmLabel;
  const summaryRows: [string, string][] = [
    ['🔩 කොටස', `${brief.name}${brief.qty > 1 ? ` ×${brief.qty}` : ''}`],
    ['🚗 වාහනය', `${brief.vehicle.name} · ${brief.vehicle.plate}`],
    ['🏷️ වර්ගය', kindLabel],
    ['🏪 ලැබෙන්නේ', me.onlyShopIds?.length ? 'තෝරාගත් වෙළඳසැල' : e.audience === 'wall' ? 'විවෘත පෝස්ට් එක' : e.audience === 'both' ? `${ringLabel} සහ විවෘත පෝස්ට් එක` : ringLabel],
    ['⏱️ ඉල්ලීම් කාලය', `දින ${validDays}`],
  ];

  const edit = () => {
    setSummary(false);
    onEdit({
      brief,
      vehicleId: vehicles.find((v) => v.plate === brief.vehicle.plate)?.id,
      audience: e.audience,
      ring: e.ring,
      days: validDays,
      onlyShopIds: me.onlyShopIds,
      shopName: me.onlyShopIds?.length ? martShop(me.onlyShopIds[0])?.name : undefined,
      jobRef: e.jobRef,
      replaces: e.id,
    });
  };
  const sendAgain = () => {
    setSummary(false);
    const { id: _id, ...rest } = brief;
    createEnquiry({ brief: rest, audience: e.audience, ring: e.ring, onlyShopIds: me.onlyShopIds, validDays, jobRef: e.jobRef, replaces: e.id });
    onResent(e.audience === 'wall');
  };

  const post = async () => {
    if (wallText.trim()) {
      const off = await getAi().checkOffPlatform(wallText);
      if (off.confidence >= SUGGEST_MIN_CONFIDENCE && off.value.flagged) {
        setWallError('දුරකථන අංක, ගෙවීම් හෝ වෙනත් යෙදුම් පණිවිඩ එක් නොකරන්න.');
        return;
      }
    }
    setWallError(null);
    postToWall(e.id, wallText);
  };

  const directions = (shopId: string) => {
    const shop = martShop(shopId);
    if (shop) void Linking.openURL(directionsUrl(shop.coords, user.coords));
  };

  const offerCard = (o: ShopOffer) => {
    const lowest = cheapest?.id === o.id && have.length > 1;
    const inCart = myCart.some((l) => l.offerId === o.id);
    const referred = !!e.jobRef && e.jobRef.recommendedShopIds.includes(o.shop.id);
    return (
      <SwipeCard key={o.id} style={[styles.offer, lowest && styles.offerLowest]} onOpen={() => setOfferId(o.id)}>
        <View style={styles.who}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{o.shop.name.charAt(0)}</Text>
          </View>
          <View style={styles.flex1}>
            <Text style={styles.shopName} numberOfLines={2}>
              {o.shop.name}
            </Text>
            <Text style={styles.rating} numberOfLines={1}>
              <Text style={styles.stars}>{'★'.repeat(Math.round(o.shop.rating))}{'☆'.repeat(5 - Math.round(o.shop.rating))}</Text> {o.shop.rating.toFixed(1)}
            </Text>
          </View>
        </View>
        <Text style={styles.subLine}>
          {o.partType}
          {o.brand ? ` · ${o.brand}` : ''}
          {lowest ? ' · 💰 අඩුම මිල' : ''}
          {o.dealPercent ? ` · 🏷️ ${dealLabel(o.dealPercent)}` : ''}
        </Text>
        <View style={styles.pad}>
          <View style={styles.priceBox}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{o.qty > 1 ? `මිල ×${o.qty}` : 'මිල'}</Text>
              {o.total ? <Text style={styles.price}>{money(o.total)}</Text> : <Text style={styles.priceAsk}>කවුන්ටරයේදී</Text>}
            </View>
          </View>
          <Text style={styles.facts}>
            🛡️ {o.warrantyMonths ? `මාස ${o.warrantyMonths} වගකීම` : 'වගකීමක් නැත'} · ⏱️ මිනි. {o.readyInMin}
          </Text>
          {o.delivery && <Text style={styles.muted}>🛵 බෙදාහැරීම {o.delivery.fee ? money(o.delivery.fee) : 'නොමිලේ'} · මිනි. {o.delivery.etaMin}</Text>}
          {o.qty < brief.qty && <Text style={styles.warn}>⚠ ඉල්ලූ {brief.qty} න් ඇත්තේ {o.qty} ක් පමණි</Text>}
          {o.unitPrice > 0 && (
            <Text style={[styles.market, priceTag(brief.name, o.partType, o.unitPrice) === 'high' ? styles.warnText : styles.good]}>{PRICE_TAG_LABEL[priceTag(brief.name, o.partType, o.unitPrice)]}</Text>
          )}
          <FitmentBadge level={fitmentLevel(brief, o.fitmentConfirmed)} />
          {referred && (
            <>
              <ReferralBadge garageName={e.jobRef!.garage.name} />
              <Text style={styles.muted}>{referralDisclosure(e.jobRef!.garage.name, martShop(o.shop.id)?.referralPercent ?? DEFAULT_COMMISSION_PERCENT)}</Text>
            </>
          )}
          <Text style={styles.muted}>📍 {km(o.shop.distanceKm)} km</Text>
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.action} onPress={() => setOfferId(o.id)} accessibilityLabel={`Offer from ${o.shop.name}`}>
            <Text style={styles.actionText}>📄 විස්තර</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={() => directions(o.shop.id)} accessibilityLabel={`Directions to ${o.shop.name}`}>
            <Text style={styles.actionText}>🗺️ දිශාවන්</Text>
          </Pressable>
          {open && (
            <Pressable
              style={[styles.action, styles.actionMain, lowest && styles.actionLowest, inCart && styles.actionDone]}
              onPress={() => (inCart ? removeFromCart(e.id) : addToCart([o.id]))}
              accessibilityRole="button"
              accessibilityState={{ selected: inCart }}
            >
              <Text style={[styles.actionText, styles.actionMainText]} numberOfLines={1}>
                {inCart ? '✓ Cart එකේ' : 'Add to cart'}
              </Text>
            </Pressable>
          )}
        </View>
      </SwipeCard>
    );
  };

  return (
    <View style={styles.card} accessibilityLabel="Request">
      <Pressable style={styles.head} onPress={() => setDetails(true)} accessibilityLabel={`Part ${brief.name}`}>
        <View style={styles.picture}>
          <PartCategoryIcon id={category?.id ?? ''} vehicleType={brief.vehicle.type} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.title} numberOfLines={2}>
            {brief.name}
            {brief.qty > 1 ? ` ×${brief.qty}` : ''}
          </Text>
          <Text style={styles.vehicle} numberOfLines={1}>
            {brief.vehicle.name}
            {brief.photos?.length ? `  ·  📷 ${brief.photos.length}` : ''}
          </Text>
          <LkPlate plate={brief.vehicle.plate} small />
        </View>
        {isPending && (
          <View style={styles.waitingBadge} accessibilityLabel="Time left for offers">
            <Text style={styles.waitingBadgeText}>⏱️ {countdown(left)}</Text>
          </View>
        )}
        {!!ended && (
          <View style={styles.ended}>
            <Text style={styles.endedText}>{ended}</Text>
          </View>
        )}
      </Pressable>

      {open && !isPending && (
        <View style={[styles.timeChip, urgent && styles.timeChipUrgent]} accessibilityLabel="Time left for offers">
          <Text style={[styles.timeText, urgent && styles.timeTextUrgent]}>⏱️ {timeLeft(left)} ඉතිරියි</Text>
        </View>
      )}

      {open && have.length > 0 && (
        <Text style={styles.count} accessibilityRole="header">{`වෙළඳසැල් ${have.length}ක් ළඟ ඇත · තෝරන්න`}</Text>
      )}
      {open && have.length === 0 && !nobody && (
        <View style={styles.waitRow}>
          <View style={styles.waitDot} />
          <View style={styles.flex1}>
            <Text style={styles.noneTitle}>පිළිතුරු එනතෙක් රැඳී සිටී</Text>
            <Text style={styles.muted}>{asked.length ? `වෙළඳසැල් ${asked.length} · පිළිතුරු ${answered.size} · ` : ''}{ago(now - e.createdAt)}</Text>
          </View>
        </View>
      )}

      {have.map(offerCard)}

      {nobody && (
        <View style={styles.none}>
          <Text style={styles.noneTitle}>තවම කොටස හමු වී නැත</Text>
          {hasRange && <ActionButton label="සෙවුම් පරාසය විශාල කරන්න" icon="🔭" variant="primary" compact onPress={() => setRangeOpen(true)} />}
          {canPost && <ActionButton label="විවෘත පෝස්ට් එකට දමන්න" icon="📣" variant="ghost" compact onPress={() => setDetails(true)} />}
        </View>
      )}

      {open && have.length > 0 && (waiting > 0 || checking.length > 0) && (
        <Text style={[styles.muted, styles.pad]}>
          {checking.length > 0 ? `කොටස සොයන වෙළඳසැල් ${checking.length}` : ''}
          {checking.length > 0 && waiting > 0 ? ' · ' : ''}
          {waiting > 0 ? `පිළිතුරු බලා සිටින වෙළඳසැල් ${waiting}` : ''}
        </Text>
      )}

      {myCart.length > 0 && (
        <Pressable style={styles.cartBar} onPress={() => setCartOpen(true)} accessibilityRole="button" accessibilityLabel="Open the cart">
          <View style={styles.flex1}>
            <Text style={styles.cartTitle}>🛒 Cart · {cartTotal ? money(cartTotal) : 'කවුන්ටරයේදී'}</Text>
            <Text style={styles.cartTime}>⏳ මිනි. {Math.min(...myCart.map((l) => cartLeftMin(l.addedAt, now)))} ක් ඉතිරියි</Text>
          </View>
          <Text style={styles.cartGo}>තහවුරු කරන්න ›</Text>
        </Pressable>
      )}

      {open && hasRange && (
        <Pressable style={styles.range} onPress={() => setRangeOpen(true)} accessibilityRole="button" accessibilityLabel="Open the search range">
          <Text style={[styles.rangeText, styles.flex1]}>📍 සෙවුම් පරාසය · {kmLabel}</Text>
          <Text style={styles.link}>වෙනස් කරන්න ›</Text>
        </Pressable>
      )}

      {/* As on Bids: a waiting request opens its summary (to change it), an ended one can be sent again. */}
      {isPending && <ActionButton label="සාරාංශය බලන්න / සංස්කරණය" icon="📝" variant={nobody ? 'ghost' : 'primary'} onPress={() => setSummary(true)} />}
      {isExpired && <ActionButton label="නැවත යවන්න" icon="🔁" variant="sos" onPress={() => setSummary(true)} />}

      <View style={styles.corner}>
        {isPending && (
          <Pressable onPress={() => setDeleting(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete this request">
            <Text style={styles.cancelText}>🗑️ මකන්න</Text>
          </Pressable>
        )}
        <Pressable onPress={() => setDetails(true)} hitSlop={8} accessibilityLabel="Request details">
          <Text style={styles.link}>විස්තර ›</Text>
        </Pressable>
      </View>

      <Sheet
        visible={summary}
        title={isExpired ? 'නැවත යවන්න' : 'ඉල්ලීමේ සාරාංශය'}
        subtitle={isExpired ? 'ඔබ යැවූ ඉල්ලීම' : 'වෙනස් කර යැවූ විට නව ඉල්ලීම මෙය වෙනුවට යයි'}
        onClose={() => setSummary(false)}
        footer={
          <View style={styles.buttons}>
            {isExpired && <ActionButton label="නැවත යවන්න" icon="🔁" variant="sos" onPress={sendAgain} />}
            <ActionButton label={isExpired ? 'සංස්කරණය කර යවන්න' : 'සංස්කරණය කර නැවත යවන්න'} icon="📝" variant={isExpired ? 'ghost' : 'primary'} onPress={edit} />
          </View>
        }
      >
        {summaryRows.map(([k, v]) => (
          <View key={k} style={styles.shopRow}>
            <Text style={styles.muted}>{k}</Text>
            <Text style={[styles.rowName, styles.flex1, styles.right]}>{v}</Text>
          </View>
        ))}
        {!!brief.note && <Text style={styles.facts}>{brief.note}</Text>}
        {!!brief.photos?.length && (
          <View style={styles.photos}>
            {brief.photos.slice(0, 4).map((p) => (
              <Image key={p} source={{ uri: p }} style={styles.photo} />
            ))}
          </View>
        )}
      </Sheet>

      <Sheet
        visible={deleting}
        title="ඉල්ලීම මකන්නද?"
        subtitle={brief.name}
        onClose={() => setDeleting(false)}
        footer={
          <View style={styles.buttons}>
            <ActionButton
              label="ඔව්, මකන්න"
              icon="🗑️"
              variant="sos"
              onPress={() => {
                setDeleting(false);
                cancelEnquiry(e.id);
              }}
            />
            <ActionButton label="තබා ගන්න" variant="ghost" onPress={() => setDeleting(false)} />
          </View>
        }
      >
        <Text style={styles.facts}>වෙළඳසැල්වලින් මෙයට තවත් පිළිතුරු නොලැබේ. ඉල්ලීම Expired හි තබයි; එතැනින් නැවත යැවිය හැක.</Text>
      </Sheet>

      <Sheet visible={details} title={brief.name} subtitle={`${brief.vehicle.name} · ${brief.vehicle.plate}`} onClose={() => setDetails(false)}>
        <Text style={styles.muted}>
          {brief.partType === 'GarageChoice' ? 'ඕනෑම වර්ගයක්' : brief.partType} · ×{brief.qty} · {ago(now - e.createdAt)}
          {brief.partNo ? ` · කොටස් අංකය ${brief.partNo}` : ''}
          {onWall ? ' · 📣 විවෘත පෝස්ට් එකේ' : ''}
        </Text>
        {!!brief.note && <Text style={styles.facts}>{brief.note}</Text>}
        {!!brief.photos?.length && (
          <View style={styles.photos}>
            {brief.photos.slice(0, 4).map((p) => (
              <Image key={p} source={{ uri: p }} style={styles.photo} />
            ))}
          </View>
        )}
        {asked.length > 0 && <Text style={styles.heading}>ඉල්ලීම ලැබුණු වෙළඳසැල් · {asked.length}</Text>}
        {asked.map((id) => {
          const o = offers.find((x) => x.shop.id === id);
          const state = !o ? (me.seenBy?.[id] ? 'බැලුවා' : 'යැව්වා') : hasIt(o) ? '✓ ඇත' : o.reply === 'check' ? `සොයමින්${o.checkUntil ? ` (${checkWindowText(o.checkUntil, now)})` : ''}` : '✕ නැත';
          return (
            <Pressable
              key={id}
              style={styles.shopRow}
              onPress={() => {
                setDetails(false);
                onOpenShop(id);
              }}
              accessibilityLabel={`Open ${martShop(id)?.name ?? id}`}
            >
              <Text style={[styles.rowName, styles.flex1]} numberOfLines={1}>
                {martShop(id)?.name ?? id}
              </Text>
              <Text style={styles.muted}>{state}</Text>
            </Pressable>
          );
        })}
        {canPost && (
          <View style={styles.none}>
            <Text style={styles.noneTitle}>📣 විවෘත පෝස්ට් එකට දමන්න</Text>
            <TextInput style={styles.input} multiline placeholder="මාදිලිය, වර්ෂය, කොටස් අංකය…" placeholderTextColor={Colors.textMuted} value={wallText} onChangeText={setWallText} maxLength={200} accessibilityLabel={`Wall description ${brief.name}`} />
            {!!wallError && <Text style={styles.warn}>{wallError}</Text>}
            <ActionButton label="පෝස්ට් එකක් ලෙස දමන්න" icon="📣" variant="primary" compact onPress={() => void post()} />
          </View>
        )}
        {open && !onWall && !canPost && have.length === 0 && <Text style={styles.muted}>km 100 දක්වා සෙවූ පසු විවෘත පෝස්ට් එකට දැමිය හැක.</Text>}
        {open && !isPending && (
          <Pressable
            style={styles.cancel}
            onPress={() => {
              setDetails(false);
              setDeleting(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Cancel enquiry"
          >
            <Text style={styles.cancelText}>ඉල්ලීම අවලංගු කරන්න</Text>
          </Pressable>
        )}
      </Sheet>

      <Sheet visible={!!viewed} title={viewed?.shop.name ?? ''} subtitle={brief.name} onClose={() => setOfferId(null)}>
        {!!viewed && (
          <>
            {offerCard(viewed)}
            <ActionButton label={`අමතන්න · ${viewed.shop.phone}`} icon="📞" variant="ghost" compact onPress={() => void Linking.openURL(`tel:${viewed.shop.phone.replace(/\s/g, '')}`)} />
            <ActionButton
              label="වෙළඳසැලෙන් අසන්න"
              icon="💬"
              variant="ghost"
              compact
              onPress={() => {
                setOfferId(null);
                onChat(viewed);
              }}
            />
            <ActionButton
              label="වෙළඳසැල බලන්න"
              icon="🏪"
              variant="ghost"
              compact
              onPress={() => {
                setOfferId(null);
                onOpenShop(viewed.shop.id);
              }}
            />
          </>
        )}
      </Sheet>

      <Sheet visible={cartOpen} title="Cart" subtitle={brief.name} onClose={() => setCartOpen(false)}>
        <CartPanel items={[me]} />
      </Sheet>

      <Sheet visible={rangeOpen} title="සෙවුම් පරාසය" subtitle="රවුම ඔබට ඕන තරමට වෙනස් කර සොයන්න" onClose={() => setRangeOpen(false)}>
        <ReachPanel
          coords={e.coords}
          status={range}
          current={currentKm}
          searchCount={open && have.length === 0 ? 1 : 0}
          onApply={(to) => {
            searchWithin([e.id], to);
            setRangeOpen(false);
          }}
        />
      </Sheet>
    </View>
  );
};

// Measured as the job card and bid card on Bids (the benchmark page).
const styles = themedStyles(() => {
  const dark = getThemeMode() === 'dark';
  return StyleSheet.create({
    flex1: { flex: 1 },
    card: { gap: 12, paddingVertical: 16, paddingHorizontal: 8, borderRadius: 26, borderWidth: 1, borderColor: dark ? Colors.borderColor : '#f3f4f6', backgroundColor: Colors.bgCard, shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: dark ? 0.4 : 0.16, shadowRadius: 22, elevation: 6 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
    picture: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.subtleFill },
    title: { fontSize: 14, lineHeight: 21, fontFamily: FONTS.titleBold, color: Colors.textMain },
    vehicle: { fontSize: 11.5, lineHeight: 17, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginBottom: 2 },
    ended: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)' },
    endedText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
    timeChip: { alignSelf: 'flex-start', marginLeft: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.16)' },
    timeChipUrgent: { backgroundColor: 'rgba(239, 68, 68, 0.14)' },
    timeText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#b45309' },
    timeTextUrgent: { color: '#b91c1c' },
    count: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, paddingHorizontal: 12 },
    waitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 12 },
    waitDot: { marginTop: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.warning },
    muted: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    offer: { borderRadius: 22, borderWidth: 1, borderColor: dark ? '#2a3b5c' : '#dbeafe', backgroundColor: Colors.bgCard, shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: dark ? 0.6 : 0.2, shadowRadius: 18, elevation: 8 },
    offerLowest: { borderColor: dark ? 'rgba(16, 185, 129, 0.4)' : '#a7f3d0', backgroundColor: dark ? 'rgba(16, 185, 129, 0.08)' : '#f4fcf8' },
    who: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
    avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e3a8a' },
    avatarText: { fontSize: 15, fontFamily: FONTS.titleBold, color: '#ffffff' },
    shopName: { fontSize: 15, lineHeight: 20, fontFamily: FONTS.titleBold, color: Colors.textMain },
    rating: { fontSize: 12, lineHeight: 16, fontFamily: FONTS.bodyMedium, color: Colors.textMain, marginTop: 1 },
    stars: { color: '#f5a623', letterSpacing: 1 },
    subLine: { fontSize: 12, lineHeight: 18, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, paddingHorizontal: 14 },
    pad: { paddingHorizontal: 14, gap: 4 },
    priceBox: { paddingVertical: 8, paddingHorizontal: 12, marginVertical: 4, borderRadius: 12, backgroundColor: Colors.subtleFill },
    priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    priceLabel: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    price: { fontSize: 22, fontFamily: FONTS.titleBold, color: Colors.success },
    priceAsk: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    facts: { fontSize: 14, lineHeight: 22, fontFamily: FONTS.bodyRegular, color: Colors.textMain },
    market: { fontSize: 12, lineHeight: 18, fontFamily: FONTS.bodySemiBold },
    good: { color: Colors.successText },
    warnText: { color: Colors.warning },
    warn: { fontSize: 12, lineHeight: 18, fontFamily: FONTS.bodySemiBold, color: Colors.warning },
    actions: { flexDirection: 'row', gap: 8, marginHorizontal: 8, marginTop: 10, marginBottom: 12 },
    action: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: '#facc15', backgroundColor: dark ? '#18233a' : '#ffffff' },
    actionText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: dark ? Colors.textMain : '#475569' },
    actionMain: { flex: 1.2, borderRadius: 22, backgroundColor: dark ? 'rgba(141, 177, 255, 0.2)' : '#dbeafe' },
    actionLowest: { backgroundColor: dark ? 'rgba(16, 185, 129, 0.2)' : '#bbf7d0' },
    actionDone: { backgroundColor: dark ? 'rgba(253, 214, 99, 0.2)' : '#fde68a' },
    actionMainText: { color: dark ? Colors.textMain : '#1e3a8a' },
    none: { gap: 8, padding: 12, borderRadius: 16, backgroundColor: Colors.subtleFill },
    noneTitle: { fontSize: 14, lineHeight: 21, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    cartBar: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: '#1e3a8a', borderWidth: 1.5, borderColor: '#facc15' },
    cartTitle: { fontSize: 14, lineHeight: 21, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    cartTime: { fontSize: 12, lineHeight: 18, fontFamily: FONTS.bodyRegular, color: '#fde68a' },
    cartGo: { fontSize: 13, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    range: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: Colors.subtleFill },
    rangeText: { fontSize: 13, lineHeight: 20, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    link: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    corner: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 16, marginRight: 8 },
    waitingBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: dark ? 'rgba(141, 177, 255, 0.3)' : '#bae6fd', backgroundColor: dark ? 'rgba(141, 177, 255, 0.14)' : '#f0f9ff' },
    waitingBadgeText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    buttons: { gap: 8 },
    right: { textAlign: 'right' },
    photos: { flexDirection: 'row', gap: 6 },
    photo: { width: 56, height: 56, borderRadius: 8 },
    heading: { fontSize: 14, lineHeight: 21, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    shopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: Colors.subtleFill },
    rowName: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    input: { minHeight: 72, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard, color: Colors.textMain, fontSize: 14, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top' },
    cancel: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
    cancelText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
  });
});
