import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { reconDecisionText, canRequestCancel, Colors, FONTS, getThemeMode, pendingExtra, pendingRecon, PhotoStrip, themedStyles, type DiagnosisLine } from '@ongarage/shared';
import { useWorkshops } from '../context/WorkshopContext';
import { RatingSheet } from './workshop/RatingSheet';
import { ProblemSheet } from './workshop/ProblemSheet';
import { WarrantySheet } from './workshop/WarrantySheet';
import { ReceiptSheet } from './workshop/ReceiptSheet';
import { CancelJobSheet } from './workshop/CancelJobSheet';
import { CancelRequestSheet } from './workshop/CancelRequestSheet';
import { PaymentStatus } from './workshop/PaymentStatus';
import { money } from '../utils/format';
import { elevation1, outline } from '../utils/material';

/** A gentle, repeating swell on the thing the owner must do (so it is not missed). */
const NudgePulse: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(t, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  return <Animated.View style={{ transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }] }}>{children}</Animated.View>;
};

const names = (l: DiagnosisLine) => (l.qty > 1 ? `${l.name} ×${l.qty}` : l.name);

const Section: React.FC<{ title: string; lines: DiagnosisLine[]; hidePrice?: boolean; /** Line by line: the ticked line ids, and a tap on a line. */ picked?: string[]; onToggle?: (lineId: string) => void }> = ({ title, lines, hidePrice, picked, onToggle }) =>
  lines.length === 0 ? null : (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!hidePrice && <Text style={styles.sectionTotal}>{money(lines.reduce((sum, l) => sum + l.price, 0))}</Text>}
      </View>
      {lines.map((l) => (
        <Pressable key={l.id} style={styles.lineBlock} disabled={!onToggle} onPress={() => onToggle?.(l.id)} accessibilityLabel={`Line ${l.name}`} accessibilityState={onToggle ? { checked: !!picked?.includes(l.id) } : undefined}>
          <Text style={[styles.line, !!onToggle && !picked?.includes(l.id) && styles.lineOff]}>
            {onToggle ? (picked?.includes(l.id) ? '☑ ' : '☐ ') : ''}{hidePrice ? names(l) : `${names(l)} · ${money(l.price)}`}
          </Text>
          {!!l.photos?.length && <PhotoStrip photos={l.photos} height={40} />}
        </Pressable>
      ))}
    </View>
  );

/**
 * What the garage is waiting for from the owner, as cards at the end of the job's chat, answered right there: that the vehicle
 * was handed over, the diagnosis (all of it, or declined), extra parts or work found mid-repair (all of it, or declined), and whether
 * Recon parts may replace the Genuine ones the garage could not find.
 * The same answers are in the job card's tracker; each answer also goes into the chat as an update line.
 */
export const ChatJobCards: React.FC<{ id: string; onUpdate: (text: string) => void; /** Search a part in OnMart (a part the owner has to buy). */ onOpenMart?: (part: string) => void; /** Several parts to buy: the whole basket is asked of OnMart together. */ onOpenBasket?: (workshopId: string) => void }> = ({ id, onUpdate, onOpenMart, onOpenBasket }) => {
  const { workshops, approveDiagnosis, declineDiagnosis, decideExtra, decideRecon, confirmReceived, showCloseCode, rateJob, acknowledgeClosed, withdrawCancel } = useWorkshops();
  const [codeShown, setCodeShown] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  // The other forms of the job, opened from the chat: a problem at handover, the receipt, a warranty claim, cancelling.
  const [sheet, setSheet] = useState<'problem' | 'receipt' | 'warranty' | 'cancel' | 'decide' | null>(null);
  const [quick, setQuick] = useState(0);
  // The report's lines the owner has left unticked (all are approved unless some are untouched-off).
  const [off, setOff] = useState<string[]>([]);
  const w = workshops[id];
  if (!w) return null;
  const p = w.progress;
  // A cancelled job asks nothing more of the owner.
  if (p.cancelled) return null;
  // A cancellation the owner asked for is the only thing to answer now: the garage's compensation (or its silence) and what to do about it.
  if (p.cancelRequest) {
    const cr = p.cancelRequest;
    return (
      <View style={styles.wrap}>
        <View style={styles.card} accessibilityLabel="Cancellation request">
          <Text style={styles.head}>{cr.status === 'quoted' ? '💰 ගරාජයේ වන්දි යෝජනාව' : '🛑 අවලංගු කිරීමේ ඉල්ලීම — ගරාජයේ පිළිතුර බලාපොරොත්තුවෙන්'}</Text>
          <Text style={styles.text}>
            හේතුව: {cr.reason}
            {cr.note ? ` · “${cr.note}”` : ''}
          </Text>
          {cr.status === 'quoted' ? (
            <>
              <Text style={styles.total}>වන්දිය {money(cr.compensation ?? 0)}</Text>
              {!!cr.workDone && <Text style={styles.text}>මෙතෙක් කළ වැඩ: {cr.workDone}</Text>}
              <View style={styles.buttons}>
                <Pressable style={[styles.btn, styles.yes]} onPress={() => setSheet('decide')} accessibilityLabel="Accept compensation">
                  <Text style={styles.yesText}>✓ වන්දියට එකඟයි</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.no]} onPress={() => withdrawCancel(id)} accessibilityLabel="Withdraw cancellation request">
                  <Text style={styles.noText}>↩️ වැඩ දිගටම</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.buttons}>
              <Pressable style={[styles.btn, styles.no]} onPress={() => withdrawCancel(id)} accessibilityLabel="Withdraw cancellation request">
                <Text style={styles.noText}>↩️ ඉල්ලීම ඉවත් කරන්න</Text>
              </Pressable>
            </View>
          )}
        </View>
        <CancelRequestSheet workshop={sheet === 'decide' ? w : null} onClose={() => setSheet(null)} />
      </View>
    );
  }
  const extra = pendingExtra(p);
  const recon = pendingRecon(p);
  // Parts the owner buys themselves: the repair waits for them, so this is a nudge card of its own (amber, with a filled button), not a quiet chip.
  const ownerBuys = (lines: DiagnosisLine[]) => {
    const buys = lines.filter((l) => l.kind === 'part' && l.source === 'owner');
    const part = buys[0];
    if (!part) return null;
    const several = buys.length > 1 && !!onOpenBasket;
    if (!several && !onOpenMart) return null;
    const names = buys.map((l) => l.name).join(', ');
    return (
      <View style={styles.mustBuy} accessibilityLabel="Parts you must buy">
        <Text style={styles.mustBuyHead}>⚠️ ඔබ OnMart හි මිලදී ගත යුතුය - {names}</Text>
        <Text style={styles.mustBuyText}>{buys.length > 1 ? 'මෙම කොටස් ඔබම මිලදී ගත යුතුයි' : 'මෙම කොටස ඔබම මිලදී ගත යුතුයි'} — නැත්නම් අලුත්වැඩියාව ප්‍රමාද වේ. ගරාජය ඒවා ලැබෙන තෙක් වැඩ නවතා තබයි.</Text>
        <NudgePulse>
          <Pressable
            style={styles.mustBuyBtn}
            onPress={() => (several ? onOpenBasket!(id) : onOpenMart!(part.name))}
            accessibilityLabel={several ? 'Buy all these parts in OnMart' : 'Buy this part in OnMart'}
          >
            <Text style={styles.mustBuyBtnText}>🛍️ OnMart හි මිලදී ගන්න{several ? ` · කොටස් ${buys.length}` : ''}</Text>
          </Pressable>
        </NudgePulse>
      </View>
    );
  };
  // The job closed with the owner's code and is not rated yet: the chat asks them to rate the garage.
  const toRate = p.stage === 'closed' && !w.review;
  const inWarranty = p.stage === 'closed' && !!p.warrantyUntil && p.warrantyUntil > Date.now() && !p.warrantyClaim;
  const extraBoth = !!extra && extra.lines.some((l) => l.kind === 'part') && extra.lines.some((l) => l.kind === 'labour');
  const asked = p.stage === 'awaitingApproval' && p.diagnosis;
  const dxPicked = asked ? p.diagnosis!.lines.map((l) => l.id).filter((x) => !off.includes(x)) : [];
  const toggleLine = (lineId: string) => setOff((o) => (o.includes(lineId) ? o.filter((x) => x !== lineId) : [...o, lineId]));
  const toConfirm = !!p.receivedAt && !w.receiptConfirmed && p.stage !== 'closed' && p.stage !== 'declined';

  return (
    <View style={styles.wrap}>
      {toConfirm && (
        <View style={styles.card} accessibilityLabel="Confirm vehicle handed over">
          <Text style={styles.head}>🚗 වාහනය භාර දුන් බව තහවුරු කරන්න</Text>
          <Text style={styles.text}>{w.garageName} ඔබගේ වාහනය ලැබුණා කියා දන්වා ඇත. එය නිවැරදි නම් තහවුරු කරන්න.</Text>
          {!!p.checkInPhotos?.length && <PhotoStrip photos={p.checkInPhotos} height={46} />}
          <View style={styles.buttons}>
            <Pressable
              style={[styles.btn, styles.yes]}
              onPress={() => {
                confirmReceived(id, true);
                onUpdate('✅ අයිතිකරු වාහනය භාර දුන් බව තහවුරු කළා.');
              }}
              accessibilityLabel="Confirm handed over"
            >
              <Text style={styles.yesText}>✓ තහවුරුයි</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.no]}
              onPress={() => {
                confirmReceived(id, false);
                onUpdate('⚠️ අයිතිකරු වාහනය භාර දුන් බව තහවුරු නොකරයි — ගරාජය පරීක්ෂා කළ යුතුයි.');
              }}
              accessibilityLabel="Not handed over"
            >
              <Text style={styles.noText}>✖ එසේ නොවේ</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!toConfirm && p.stage === 'readyForHandover' && (
        <View style={styles.card} accessibilityLabel="Show your code">
          <Text style={styles.head}>🔑 වැඩ අවසන් — ඔබගේ කේතය</Text>
          <Text style={styles.text}>{w.garageName} වැඩ අවසන් කර ඇත. වාහනය පරීක්ෂා කර, හරි නම් ඔබගේ QR / ඉලක්කම් 6 කේතය ගරාජයට පෙන්වන්න — එවිට රැකියාව වැසේ.</Text>
          <Text style={styles.total}>කේතය: {p.closeCode}</Text>
          <View style={styles.buttons}>
            <Pressable
              style={[styles.btn, styles.yes, codeShown && { opacity: 0.5 }]}
              disabled={codeShown}
              onPress={() => {
                setCodeShown(true);
                showCloseCode(id);
                onUpdate(`🔑 අයිතිකරු කේතය (${p.closeCode}) ගරාජයට පෙන්වුවා.`);
              }}
              accessibilityLabel="Show close code"
            >
              <Text style={styles.yesText}>{codeShown ? '✓ පෙන්වුවා' : '🔑 කේතය පෙන්වන්න'}</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.no]} onPress={() => setSheet('problem')} accessibilityLabel="Report a problem">
              <Text style={styles.noText}>⚠️ ගැටලුවක්</Text>
            </Pressable>
          </View>
        </View>
      )}

      {p.stage === 'closed' && (
        <View style={styles.card} accessibilityLabel="Job finished">
          <Text style={styles.head}>✅ රැකියාව අවසන් — {w.garageName}</Text>
          <Text style={styles.text}>
            ගරාජය රැකියාව ඔබගේ කේතයෙන් වසා ඇත.{p.handover ? ` ගෙවූ මුළු මුදල ${money(p.handover.bill.total)}.` : ''}{p.warrantyUntil ? ' වගකීම ක්‍රියාත්මකයි.' : ''}
          </Text>
          <View style={styles.buttons}>
            <Pressable style={[styles.btn, styles.part]} onPress={() => setSheet('receipt')} accessibilityLabel="Open receipt">
              <Text style={styles.partText}>🧾 රිසිට්පත</Text>
            </Pressable>
            {inWarranty && (
              <Pressable style={[styles.btn, styles.part]} onPress={() => setSheet('warranty')} accessibilityLabel="Warranty claim">
                <Text style={styles.partText}>🛡️ වගකීම් ඉල්ලීමක්</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {p.stage === 'closed' && p.payment && p.payment.status === 'partial' && (
        <View style={styles.card} accessibilityLabel="Payment record">
          <Text style={styles.head}>💰 ගෙවීම් සටහන — {w.garageName}</Text>
          <PaymentStatus workshop={w} />
        </View>
      )}

      {toRate && (
        <View style={styles.card} accessibilityLabel="Rate the garage">
          <Text style={styles.head}>⭐ {w.garageName} ශ්‍රේණිගත කරන්න</Text>
          <Text style={styles.text}>රැකියාව අවසන්. ඔබගේ අත්දැකීම කොහොමද? තරු තෝරන්න — එය ගරාජයේ විශ්වාස ලකුණට බලපායි.</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                hitSlop={6}
                accessibilityLabel={`Rate garage ${n} stars`}
                onPress={() => {
                  setQuick(n);
                  rateJob(id, { dimensions: { quality: n, pricing: n, onTime: n, communication: n }, technician: w.technician ? n : undefined, text: '' });
                  acknowledgeClosed(id);
                  onUpdate(`⭐ අයිතිකරු ගරාජය ★${n} ලෙස ශ්‍රේණිගත කළා.`);
                }}
              >
                <Text style={[styles.star, n <= quick && styles.starOn]}>{n <= quick ? '★' : '☆'}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.buttons}>
            <Pressable style={[styles.btn, styles.part]} onPress={() => setRateOpen(true)} accessibilityLabel="Rate in detail">
              <Text style={styles.partText}>📝 විස්තරාත්මකව ශ්‍රේණිගත කරන්න</Text>
            </Pressable>
          </View>
        </View>
      )}
      <RatingSheet
        workshop={rateOpen ? w : null}
        onClose={() => {
          setRateOpen(false);
          acknowledgeClosed(id);
        }}
      />

      {!toConfirm && asked && (
        <View style={styles.card} accessibilityLabel="Approve diagnosis">
          <Text style={styles.head}>📋 පරීක්ෂා වාර්තාව — ඔබගේ අනුමැතිය</Text>
          {!!p.diagnosis!.photos?.length && <PhotoStrip photos={p.diagnosis!.photos} height={46} />}
          <Text style={styles.text}>එක් එක් පේළිය ඔබට තෝරා අනුමත කළ හැක — ඉවත් කරන්නේ ඔබට අවශ්‍ය නැති ඒවා පමණයි.</Text>
          <Section title="🔩 කොටස්" lines={p.diagnosis!.lines.filter((l) => l.kind === 'part')} picked={dxPicked} onToggle={toggleLine} />
          <Section title="🔧 වැඩ" lines={p.diagnosis!.lines.filter((l) => l.kind === 'labour')} picked={dxPicked} onToggle={toggleLine} />
          <Text style={styles.total}>{dxPicked.length === p.diagnosis!.lines.length ? `මුළු අගය ${money(p.diagnosis!.revisedTotal)}` : `තෝරපු අගය ${money(p.diagnosis!.lines.filter((l) => dxPicked.includes(l.id)).reduce((s, l) => s + l.price, 0))}`}</Text>
          {ownerBuys(p.diagnosis!.lines.filter((l) => dxPicked.includes(l.id)))}
          <View style={styles.buttons}>
            <Pressable style={[styles.btn, styles.yes, !dxPicked.length && { opacity: 0.5 }]} disabled={!dxPicked.length} onPress={() => approveDiagnosis(id, dxPicked)} accessibilityLabel="Approve ticked diagnosis lines">
              <Text style={styles.yesText}>{dxPicked.length === p.diagnosis!.lines.length ? '✓ සියල්ල අනුමත කරන්න' : `✓ තෝරපු ${dxPicked.length} අනුමත කරන්න`}</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.no]} onPress={() => declineDiagnosis(id)} accessibilityLabel="Decline diagnosis">
              <Text style={styles.noText}>✖ ප්‍රතික්ෂේප</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!toConfirm && extra && p.stage === 'repairing' && (
        <View style={styles.card} accessibilityLabel="Approve extra work">
          <Text style={styles.head}>➕ අමතර කොටස් / වැඩ — ඔබගේ අනුමැතිය</Text>
          <Text style={styles.text}>{extra.reason}</Text>
          {!!extra.photos?.length && <PhotoStrip photos={extra.photos} height={46} />}
          <Section title="🔩 අමතර කොටස්" lines={extra.lines.filter((l) => l.kind === 'part')} />
          <Section title="🔧 අමතර වැඩ" lines={extra.lines.filter((l) => l.kind === 'labour')} />
          <Text style={styles.total}>මුළු අගය {money(extra.lines.reduce((s, l) => s + l.price, 0))}</Text>
          {ownerBuys(extra.lines)}
          {extraBoth && (
            <View style={styles.buttons}>
              <Pressable style={[styles.btn, styles.part]} onPress={() => decideExtra(id, extra.id, extra.lines.filter((l) => l.kind === 'part').map((l) => l.id))} accessibilityLabel="Approve extra parts only">
                <Text style={styles.partText}>✓ කොටස් පමණක්</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.part]} onPress={() => decideExtra(id, extra.id, extra.lines.filter((l) => l.kind === 'labour').map((l) => l.id))} accessibilityLabel="Approve extra work only">
                <Text style={styles.partText}>✓ වැඩ පමණක්</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.buttons}>
            <Pressable style={[styles.btn, styles.yes]} onPress={() => decideExtra(id, extra.id, extra.lines.map((l) => l.id))} accessibilityLabel="Approve all extra lines">
              <Text style={styles.yesText}>{extraBoth ? '✓ දෙකම අනුමත' : '✓ අනුමත කරන්න'}</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.no]} onPress={() => decideExtra(id, extra.id, [])} accessibilityLabel="Decline extra work">
              <Text style={styles.noText}>✖ ප්‍රතික්ෂේප</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!toConfirm && recon && p.stage === 'repairing' && (
        <View style={styles.card} accessibilityLabel="Approve recon parts">
          <Text style={styles.head}>♻️ Genuine කොටස් නොමැත — Recon සඳහා ඔබගේ අවසරය</Text>
          <Text style={styles.text}>ඔබ Genuine කොටස් ඉල්ලුවා. {w.garageName} ළඟම වෙළඳසැල්වල මේ වන විට Genuine සොයාගත නොහැකි විය:</Text>
          <Section title="🔩 කොටස්" lines={recon.partNames.map((n, i) => ({ id: `rc-${i}`, name: n, qty: 1, price: 0 }) as unknown as DiagnosisLine)} hidePrice />
          <View style={styles.compare}>
            <View style={styles.compareCol}>
              <Text style={styles.compareLabel}>Genuine (ඇස්තමේන්තුව)</Text>
              <Text style={styles.total}>{money(recon.genuinePrice)}</Text>
              <Text style={styles.compareSub}>සොයා ගැනීමට අමතර දිනයක් පමණ</Text>
            </View>
            <View style={[styles.compareCol, styles.compareRecon]}>
              <Text style={styles.compareLabel}>Recon</Text>
              <Text style={[styles.total, { color: Colors.success }]}>{money(recon.reconPrice)}</Text>
              <Text style={styles.compareSub}>දැන් ලබා ගත හැක · රු. {(recon.genuinePrice - recon.reconPrice).toLocaleString()} අඩුයි</Text>
            </View>
          </View>
          <Text style={styles.compareSub}>Recon යනු භාවිත කළ, පරීක්ෂා කර නැවත සකස් කළ මුල් කොටස්ය — වගකීම සාමාන්‍යයෙන් කෙටියි. අනුමත නොකළොත් ගරාජය Genuine පමණක් යොදයි.</Text>
          <View style={styles.buttons}>
            <Pressable
              style={[styles.btn, styles.yes]}
              onPress={() => {
                decideRecon(id, recon.id, true);
                onUpdate(reconDecisionText(true));
              }}
              accessibilityLabel="Approve recon parts"
            >
              <Text style={styles.yesText}>✓ Recon අනුමතයි</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.no]}
              onPress={() => {
                decideRecon(id, recon.id, false);
                onUpdate(reconDecisionText(false));
              }}
              accessibilityLabel="Wait for genuine parts"
            >
              <Text style={styles.noText}>Genuine බලා සිටින්න</Text>
            </Pressable>
          </View>
        </View>
      )}

      <ProblemSheet workshop={sheet === 'problem' ? w : null} onClose={() => setSheet(null)} />
      <ReceiptSheet workshop={sheet === 'receipt' ? w : null} onClose={() => setSheet(null)} />
      <WarrantySheet workshop={sheet === 'warranty' ? w : null} onClose={() => setSheet(null)} />
      <CancelJobSheet workshop={sheet === 'cancel' ? w : null} onClose={() => setSheet(null)} />
    </View>
  );
};

const BLUE = () => (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8');

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { gap: 8, paddingVertical: 4 },
    card: { alignSelf: 'center', width: '94%', gap: 6, padding: 14, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    head: { fontSize: 13.5, fontFamily: FONTS.bodyBold, color: BLUE() },
    text: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 18 },
    lineBlock: { gap: 4 },
    section: { gap: 4, padding: 10, borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.08)' : '#f8fafd', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e8eaed' },
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    sectionTotal: { fontSize: 12.5, fontFamily: FONTS.bodyBold, color: BLUE() },
    part: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    partText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: BLUE() },
    mustBuy: { gap: 8, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: getThemeMode() === 'dark' ? 'rgba(253, 214, 99, 0.5)' : '#f9ab00', backgroundColor: getThemeMode() === 'dark' ? 'rgba(253, 214, 99, 0.1)' : '#fef7e0' },
    mustBuyHead: { fontSize: 14, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#fdd663' : '#b06000', lineHeight: 20 },
    mustBuyText: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 18 },
    mustBuyBtn: { minHeight: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8' },
    mustBuyBtnText: { fontSize: 14.5, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    line: { fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textMain },
    lineOff: { color: Colors.textMuted, textDecorationLine: 'line-through' },
    total: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 2 },
    compare: { flexDirection: 'row', gap: 8 },
    compareCol: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: Colors.subtleFill, gap: 2 },
    compareRecon: { borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.45)' },
    compareLabel: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    compareSub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    cancelLink: { alignSelf: 'center', paddingVertical: 6 },
    cancelText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#f28b82' : '#d93025' },
    stars: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 4 },
    star: { fontSize: 34, color: Colors.textMuted },
    starOn: { color: '#f59e0b' },
    buttons: { flexDirection: 'row', gap: 8, marginTop: 6 },
    btn: { flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    yes: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.16)' : '#e6f4ea', borderColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.3)' : '#ceead6' },
    yesText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#81c995' : '#188038' },
    no: { backgroundColor: Colors.bgCard, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0' },
    noText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#f28b82' : '#d93025' },
  })
);
