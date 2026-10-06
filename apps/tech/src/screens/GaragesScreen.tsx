import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, FONTS, GlassIcon, themedStyles } from '@ongarage/shared';
import { useTech } from '../context/TechContext';
import { ago, money } from '../utils/format';

// The garages this technician works for: invitations, joining with a code, and each
// garage's terms (employee or freelance, per-job rates), with check-in.
export const GaragesScreen: React.FC = () => {
  const { profile, links, invites, duty, acceptInvite, declineInvite, joinWithCode, checkIn } = useTech();
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(false);

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {invites.length > 0 && <Text style={styles.section}>ආරාධනා ({invites.length})</Text>}
      {invites.map((inv) => (
        <View key={inv.id} style={[styles.card, styles.inviteCard]}>
          <View style={styles.row}>
            <GlassIcon emoji="✉️" small />
            <View style={styles.flex1}>
              <Text style={styles.title}>{inv.garage.name}</Text>
              <Text style={styles.sub}>
                ★ {inv.garage.rating} · {inv.kind === 'employee' ? 'සේවකයෙකු ලෙස' : 'නිදහස් කාර්මිකයෙකු ලෙස'}
              </Text>
            </View>
          </View>
          {!!inv.message && <Text style={styles.note}>“{inv.message}”</Text>}
          <View style={styles.rates}>
            <Rate label="SOS රැකියාවකට" value={money(inv.rates.sos)} />
            <Rate label="වැඩමුළු රැකියාවකට" value={money(inv.rates.workshop)} />
          </View>
          <View style={styles.actions}>
            <View style={styles.flex1}>
              <ActionButton label="ප්‍රතික්ෂේප" variant="ghost" compact onPress={() => declineInvite(inv.id)} />
            </View>
            <View style={styles.flex2}>
              <ActionButton label="සම්බන්ධ වන්න" icon="🤝" variant="success" compact onPress={() => acceptInvite(inv.id)} />
            </View>
          </View>
        </View>
      ))}

      <Text style={styles.section}>මගේ ගරාජ ({links.length})</Text>
      {links.map((l) => {
        const here = duty.garageId === l.garage.id;
        return (
          <View key={l.garage.id} style={[styles.card, here && styles.hereCard]}>
            <View style={styles.row}>
              <GlassIcon emoji="🛠️" />
              <View style={styles.flex1}>
                <Text style={styles.title}>{l.garage.name}</Text>
                <Text style={styles.sub}>
                  ★ {l.garage.rating} · {l.garage.address}
                </Text>
              </View>
              <View style={[styles.kind, l.kind === 'freelance' && styles.kindFree]}>
                <Text style={[styles.kindText, l.kind === 'freelance' && { color: Colors.warning }]}>{l.kind === 'employee' ? 'සේවකයා' : 'නිදහස්'}</Text>
              </View>
            </View>
            <View style={styles.rates}>
              <Rate label="SOS රැකියාවකට" value={money(l.rates.sos)} />
              <Rate label="වැඩමුළු රැකියාවකට" value={money(l.rates.workshop)} />
              <Rate label="කළ රැකියා" value={String(l.jobsDone)} />
            </View>
            <Text style={styles.sub}>සම්බන්ධ වූයේ {ago(Date.now() - l.since)}</Text>
            <View style={styles.actions}>
              <View style={styles.flex1}>
                <ActionButton label="අමතන්න" icon="📞" variant="ghost" compact onPress={() => Linking.openURL(`tel:${l.garage.phone}`)} />
              </View>
              <View style={styles.flex1}>
                {here ? (
                  <View style={styles.hereTag}>
                    <Text style={styles.hereText}>{duty.onBreak ? '☕ මෙහි විවේකයේ' : '✅ මෙහි රාජකාරියේ'}</Text>
                  </View>
                ) : (
                  <ActionButton label="රාජකාරියට පැමිණෙන්න" icon="✅" variant="success" compact onPress={() => checkIn(l.garage.id)} />
                )}
              </View>
            </View>
          </View>
        );
      })}

      <Text style={styles.section}>නව ගරාජයකට සම්බන්ධ වන්න</Text>
      <View style={styles.card}>
        <Text style={styles.sub}>ගරාජය ලබා දුන් ආරාධනා කේතය ඇතුළත් කරන්න (උදා: MRM-4821)</Text>
        <View style={styles.codeRow}>
          <TextInput
            style={[styles.input, codeError && styles.inputError]}
            value={code}
            onChangeText={(t) => {
              setCode(t.toUpperCase());
              setCodeError(false);
            }}
            placeholder="XXX-0000"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
            accessibilityLabel="Invite code"
          />
          <Pressable
            style={[styles.codeBtn, code.trim().length < 4 && styles.off]}
            disabled={code.trim().length < 4}
            onPress={() => {
              const ok = joinWithCode(code);
              setCodeError(!ok);
              if (ok) setCode('');
            }}
          >
            <Text style={styles.codeBtnText}>සම්බන්ධ වන්න</Text>
          </Pressable>
        </View>
        {codeError && <Text style={[styles.sub, { color: Colors.errorText }]}>කේතය හමු නොවීය — ගරාජයෙන් නැවත විමසන්න.</Text>}
        <View style={styles.divider} />
        <Text style={styles.sub}>නැත්නම් ඔබගේ කේතය ගරාජයට දෙන්න — ඔවුන් ඔබට ආරාධනා කරයි:</Text>
        <Text style={styles.myCode}>{profile.techCode}</Text>
      </View>
      <Text style={styles.hint}>නිදහස් කාර්මිකයෙකුට ගරාජ කිහිපයක් සඳහා වැඩ කළ හැක — නමුත් රාජකාරියේ සිටිය හැක්කේ එකවර එකකට පමණි.</Text>
    </ScrollView>
  );
};

const Rate: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.rate}>
    <Text style={styles.rateValue}>{value}</Text>
    <Text style={styles.rateLabel}>{label}</Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    actions: { flexDirection: 'row', gap: 8 },
    body: { padding: 16, gap: 12, paddingBottom: 100 },
    section: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.5, marginTop: 4 },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, borderRadius: 18, padding: 14, gap: 10 },
    inviteCard: { borderColor: 'rgba(56, 189, 248, 0.55)' },
    hereCard: { borderColor: 'rgba(16, 185, 129, 0.55)' },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1, lineHeight: 16 },
    note: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, fontStyle: 'italic' },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', lineHeight: 16 },
    kind: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    kindFree: { backgroundColor: 'rgba(245, 158, 11, 0.14)' },
    kindText: { fontSize: 10, fontWeight: '800', color: Colors.successText },
    rates: { flexDirection: 'row', gap: 6 },
    rate: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, backgroundColor: Colors.subtleFill },
    rateValue: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    rateLabel: { fontSize: 9.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 1 },
    hereTag: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.12)', minHeight: 40 },
    hereText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: Colors.successText },
    codeRow: { flexDirection: 'row', gap: 8 },
    input: {
      flex: 1,
      minWidth: 0,
      height: 46,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: Colors.subtleFill,
      borderWidth: 1,
      borderColor: Colors.borderColor,
      color: Colors.textMain,
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 1,
    },
    inputError: { borderColor: Colors.errorText },
    codeBtn: { paddingHorizontal: 14, height: 46, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center' },
    codeBtnText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#fff' },
    off: { opacity: 0.4 },
    divider: { height: 1, backgroundColor: Colors.borderColor },
    myCode: { fontSize: 22, fontWeight: '900', color: Colors.primary, letterSpacing: 2, textAlign: 'center' },
  })
);
