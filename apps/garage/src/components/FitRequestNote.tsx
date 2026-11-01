import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, FIT_DECLINE_REASONS, FITTING_SUPPLY, FONTS, getThemeMode, themedStyles, type PartFitRequest } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { WaitingDots } from './WaitingDots';
import { openPartsRequest } from '../utils/scheduleSignal';
import { Sheet } from './Sheet';
import type { Booking } from '../types';

/** Why the garage turns a fitting request down: a reason from the list (the owner reads it), and an optional note. */
const DeclineSheet: React.FC<{ booking: Booking; request: PartFitRequest | null; onClose: () => void }> = ({ booking, request, onClose }) => {
  const { respondFit } = useGarage();
  const [shown, setShown] = useState(request);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!request) return;
    setShown(request);
    setReason(null);
    setNote('');
  }, [request?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const r = request ?? shown;
  if (!r) return null;

  return (
    <Sheet
      visible={!!request}
      title="ඉල්ලීම ප්‍රතික්ෂේප කරන්න"
      subtitle={`${booking.customer.name} · ${r.partName}`}
      onClose={onClose}
      footer={
        <ActionButton
          label="ප්‍රතික්ෂේප කර දැනුම් දෙන්න"
          icon="✖"
          variant="primary"
          disabled={!reason}
          onPress={() => {
            if (reason) respondFit(booking.id, r.id, false, `${reason}${note.trim() ? ` · ${note.trim()}` : ''}`);
            onClose();
          }}
        />
      }
    >
      <Text style={styles.heading}>හේතුව (අයිතිකරුට පෙනේ)</Text>
      <View style={styles.chips}>
        {FIT_DECLINE_REASONS.map((x) => (
          <Pressable key={x} style={[styles.chip, reason === x && styles.chipOn]} onPress={() => setReason(x)} accessibilityLabel={`Reason ${x}`} accessibilityState={{ selected: reason === x }}>
            <Text style={[styles.chipText, reason === x && styles.chipTextOn]}>{reason === x ? '✓ ' : ''}{x}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={styles.note} multiline placeholder="තවත් විස්තර (විකල්ප)" placeholderTextColor={Colors.textMuted} value={note} onChangeText={setNote} maxLength={160} accessibilityLabel="Decline note" />
    </Sheet>
  );
};

/**
 * On a job card and in its chat: the customer asked for another part to be fitted. A pending request is answered here (accept, or decline with a reason);
 * the last answered one stays as a line of its own.
 */
export const FitRequestNote: React.FC<{ booking: Booking }> = ({ booking: b }) => {
  const { respondFit, confirmFitPart } = useGarage();
  const [declining, setDeclining] = useState<PartFitRequest | null>(null);
  const all = b.progress?.fitRequests ?? [];
  // While a cancellation request is open the work is on hold: a fitting request waits too (it can be answered once the job carries on).
  const onHold = !!b.progress?.cancelRequest;
  // Until the garage has confirmed the customer's arrival / the vehicle's receipt, no other request is answered.
  const notReceived = b.progress?.stage === 'booked';
  const pending = all.filter((r) => r.status === 'requested');
  const lastAnswered = [...all].reverse().find((r) => r.status !== 'requested');
  if (!pending.length && !lastAnswered) return null;
  const how = (r: PartFitRequest) => FITTING_SUPPLY.find((x) => x.id === r.supply)?.short ?? '';

  return (
    <View style={styles.wrap} accessibilityLabel="Parts fitting request">
      {pending.map((r) => (
        <View key={r.id} style={styles.box}>
          <Text style={styles.title}>🔩 සවි කිරීමට යෝජිත කොටස</Text>
          <Text style={styles.text}>
            {r.partName} — {how(r)}
            {r.note ? ` · “${r.note}”` : ''}
          </Text>
          {onHold ? (
            <Text style={styles.text}>⏸ අවලංගු කිරීමේ ඉල්ලීම සමථයකට පත් වන තුරු මෙයට පිළිතුරු දිය නොහැක.</Text>
          ) : notReceived ? null : (
          <View style={styles.row}>
            <View style={styles.flex1}>
              <ActionButton label="පිළිගන්න" icon="✓" variant="success" compact onPress={() => respondFit(b.id, r.id, true)} />
            </View>
            <View style={styles.flex1}>
              <ActionButton label="ප්‍රතික්ෂේප" icon="✖" variant="ghost" compact onPress={() => setDeclining(r)} />
            </View>
          </View>
          )}
        </View>
      ))}
      {/* An accepted request: if the customer brings the part, wait for it and confirm it; if the garage supplies it, order it from OnMart. */}
      {all
        .filter((x) => x.status === 'accepted')
        .map((x) => (
          <View key={`part-${x.id}`} style={styles.partBox}>
            {x.supply === 'owner' ? (
              x.partReceivedAt ? (
                <Text style={[styles.text, { color: Colors.successText }]}>📦 ✓ {x.partName} — පාරිභෝගිකයාගේ කොටස ලැබුණා</Text>
              ) : (
                <>
                  <View style={styles.waitRow}>
                    <WaitingDots color="#f59e0b" />
                    <Text style={[styles.text, { flex: 1 }]}>{x.partName} — පාරිභෝගිකයා OnMart එකෙන් ගෙන වාහනය සමඟ භාර දෙන තෙක් රැඳී සිටී</Text>
                  </View>
                  {!notReceived && <ActionButton label="කොටස ලැබුණා බව සනාථ කරන්න" icon="✓" variant="success" compact onPress={() => confirmFitPart(b.id, x.id)} />}
                </>
              )
            ) : (
              <>
                <Text style={styles.text}>{x.partName} — ගරාජය කොටස සපයයි</Text>
                <ActionButton label="OnMart එකෙන් කොටස ඇණවුම් කරන්න" icon="🛒" variant="primary" compact onPress={() => openPartsRequest(b.id)} />
              </>
            )}
          </View>
        ))}
      {!!lastAnswered && !pending.length && (
        <Text style={[styles.text, { color: lastAnswered.status === 'accepted' ? Colors.successText : Colors.errorText }]}>
          {lastAnswered.status === 'accepted' ? '✅' : '✖'} {lastAnswered.partName} සවි කිරීම {lastAnswered.status === 'accepted' ? 'පිළිගත්තා — මිල සහ කාලය අමතර වැඩ ඉල්ලීමක් ලෙස යවන්න' : `ප්‍රතික්ෂේප කළා${lastAnswered.declineReason ? ` — ${lastAnswered.declineReason}` : ''}`}
        </Text>
      )}
      <DeclineSheet booking={b} request={declining} onClose={() => setDeclining(null)} />
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    partBox: { gap: 8, padding: 12, borderRadius: 10, backgroundColor: getThemeMode() === 'dark' ? 'rgba(245, 158, 11, 0.08)' : '#fef7e0' },
    waitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    wrap: { gap: 8 },
    row: { flexDirection: 'row', gap: 8 },
    box: { gap: 6, padding: 12, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? 'rgba(20, 184, 166, 0.1)' : '#e6f7f5', borderWidth: 1, borderColor: 'rgba(20, 184, 166, 0.45)' },
    title: { fontSize: 13, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    text: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 18 },
    heading: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    chips: { gap: 8 },
    chip: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    chipOn: { borderColor: Colors.primary, backgroundColor: 'rgba(56, 189, 248, 0.14)' },
    chipText: { fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, lineHeight: 18 },
    chipTextOn: { color: Colors.primary, fontFamily: FONTS.bodyBold },
    note: { minHeight: 64, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard, color: Colors.textMain, fontSize: 13, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top' },
  })
);
