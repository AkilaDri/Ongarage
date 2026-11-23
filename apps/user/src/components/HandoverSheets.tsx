import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, FONTS, getThemeMode, LkPlate, normalisePlate, themedStyles, type Vehicle } from '@ongarage/shared';
import { Sheet } from './Sheet';
import { FlowButton } from './FlowButton';
import { useOpenWork } from './RemoveVehicleSheet';
import { useServiceRecords } from './ServiceRecordsSheet';
import { useVehicles } from '../context/VehiclesContext';
import { useHandover, HANDOVER_DAYS, type Handover } from '../context/HandoverContext';
import { formatDate } from '../utils/format';

const spaced = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

/**
 * The seller: the vehicle is sold, so its history goes to the buyer. First a preview of exactly what leaves (nothing before the owner confirms), then a code
 * valid for a week that can be cancelled. The price the owner paid is shared only if they tick it. Free.
 */
export const HandoverSheet: React.FC<{ vehicle: Vehicle | null; onClose: () => void }> = ({ vehicle, onClose }) => (vehicle ? <SellerBody vehicle={vehicle} onClose={onClose} /> : null);

const SellerBody: React.FC<{ vehicle: Vehicle; onClose: () => void }> = ({ vehicle, onClose }) => {
  const records = useServiceRecords(vehicle);
  const openWork = useOpenWork();
  const { openFor, create, cancel } = useHandover();
  const existing = openFor(vehicle.id);
  const [sharePrices, setSharePrices] = useState(false);
  const [made, setMade] = useState<Handover | null>(null);
  const handover = made && made.status === 'open' ? made : existing;
  const work = openWork(vehicle.id);
  const warranties = records.filter((r) => (r.warrantyUntil ?? 0) > Date.now()).length;

  return (
    <Sheet visible title="ඉතිහාසය භාර දෙන්න" subtitle={`${vehicle.name} · ${vehicle.plate}`} onClose={onClose}>
      {handover ? (
        <>
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>ගැනුම්කරුට දෙන්න</Text>
            <Text style={styles.code} accessibilityLabel={`Handover code ${handover.code}`}>{spaced(handover.code)}</Text>
            <Text style={styles.codeSub}>{formatDate(handover.expiresAt)} දක්වා වලංගුයි</Text>
          </View>
          <Text style={styles.body}>
            ගැනුම්කරු OnGarage හි “අලුත් වාහනයක් › කේතයකින්” යටතේ මෙම කේතය සහ වාහනයේ අංක තහඩුව ({vehicle.plate}) ඇතුළත් කළ විට වාර්තා ඔහුට ලැබේ. එවිට මෙම වාහනය ඔබගේ ලැයිස්තුවෙන් ඉවත් වේ; ඔබගේ වාර්තා ඔබට තවමත් බලාගත හැක.
          </Text>
          <FlowButton label="කේතය අවලංගු කරන්න" variant="ghost" onPress={() => { cancel(handover.code); setMade(null); }} />
        </>
      ) : records.length === 0 ? (
        <Text style={styles.body}>භාර දීමට සත්‍යාපිත සේවා වාර්තා තවම නැත. ගරාජයක රැකියාවක් ඔබගේ කේතයෙන් වසා දැමූ පසු එහි වාර්තාව මෙහි එකතු වේ.</Text>
      ) : (
        <>
          <Text style={styles.body}>වාහනය විකුණා ඇත්නම්, එහි සේවා ඉතිහාසය ගැනුම්කරුට භාර දිය හැක. මෙය නොමිලේයි. ඔබ තහවුරු කරන තුරු කිසිවක් යැවෙන්නේ නැත.</Text>

          <View style={styles.box}>
            <Text style={styles.boxTitle}>බෙදාගන්නා දේ</Text>
            <Text style={styles.line}>✓ සේවා වාර්තා {records.length} ක් (දිනය, සේවාව, ගරාජය, මීටර් කියවීම)</Text>
            {warranties > 0 && <Text style={styles.line}>✓ ක්‍රියාත්මක වගකීම් {warranties} ක් ගැනුම්කරුට හිමි වේ</Text>}
          </View>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>බෙදා නොගන්නා දේ</Text>
            <Text style={styles.line}>✕ ඔබගේ නම, දුරකථනය, ලිපිනය</Text>
            <Text style={styles.line}>✕ ඔබගේ ශ්‍රේණිගත කිරීම්, බිල්පත් අංක සහ රක්ෂණ අංකය</Text>
          </View>

          <Pressable style={styles.shareRow} onPress={() => setSharePrices(!sharePrices)} accessibilityRole="switch" accessibilityState={{ checked: sharePrices }} accessibilityLabel="Share the prices I paid">
            <View style={styles.flex1}>
              <Text style={styles.shareTitle}>මා ගෙවූ මිල ද බෙදාගන්න</Text>
              <Text style={styles.shareSub}>{sharePrices ? 'ගැනුම්කරුට සෑම සේවාවකම මිල පෙනේ.' : 'මිල ගැනුම්කරුට නොපෙනේ (ඔබ අවසර දෙන්නේ නම් පමණක්).'}</Text>
            </View>
            <View style={[styles.switch, sharePrices && styles.switchOn]}>
              <View style={[styles.knob, sharePrices && styles.knobOn]} />
            </View>
          </Pressable>

          {work.length > 0 && (
            <>
              <Text style={styles.warn}>මෙම වාහනයට තවමත් ක්‍රියාත්මක වන වැඩ ඇත. ඒවා අවසන් වූ පසු භාර දිය හැක:</Text>
              {work.map((l, i) => (
                <Text key={i} style={styles.line}>• {l}</Text>
              ))}
            </>
          )}
          <FlowButton label="කේතයක් සාදන්න" icon="🔑" variant="primary" disabled={work.length > 0} onPress={() => setMade(create(vehicle, records, sharePrices))} />
          <Text style={styles.note}>කේතය දින {HANDOVER_DAYS} ක් වලංගුයි. ඕනෑම වේලාවක අවලංගු කළ හැක.</Text>
        </>
      )}
    </Sheet>
  );
};

/**
 * The buyer: the code the seller gave and the vehicle's plate, then a preview of what comes with it, then accepting. The history stays under the new vehicle as
 * the previous owner's records; the seller's vehicle leaves their list.
 */
export const ClaimHandoverSheet: React.FC<{ visible: boolean; onClose: () => void; onClaimed: (vehicle: Vehicle, records: number) => void }> = ({ visible, onClose, onClaimed }) => {
  const { check, accept } = useHandover();
  const { addVehicle, removeVehicle, setActiveVehicleId } = useVehicles();
  const [code, setCode] = useState('');
  const [plate, setPlate] = useState('');
  const [found, setFound] = useState<Handover | null>(null);
  const [error, setError] = useState('');

  const reset = () => {
    setCode('');
    setPlate('');
    setFound(null);
    setError('');
  };
  const close = () => {
    reset();
    onClose();
  };
  const look = () => {
    const r = check(code, plate);
    if (r.ok) {
      setError('');
      setFound(r.handover);
      return;
    }
    setError(
      r.reason === 'plate' ? 'වාහනයේ අංක තහඩුව කේතයට ගැළපෙන්නේ නැත. විකුණුම්කරුගෙන් නැවත විමසන්න.' : r.reason === 'expired' ? 'මෙම කේතය කල් ඉකුත් වී ඇත. විකුණුම්කරුගෙන් අලුත් කේතයක් ඉල්ලන්න.' : r.reason === 'cancelled' ? 'විකුණුම්කරු මෙම කේතය අවලංගු කර ඇත.' : r.reason === 'used' ? 'මෙම කේතය දැනටමත් භාවිතා කර ඇත.' : 'මෙම කේතය හමු නොවීය. අංක 6 නැවත පරීක්ෂා කරන්න.'
    );
  };
  const take = () => {
    if (!found) return;
    const v = addVehicle(found.vehicle);
    accept(found, v.id);
    // The seller's copy leaves their list (this phone plays both, so it is archived here).
    removeVehicle(found.fromVehicleId);
    setActiveVehicleId(v.id);
    const count = found.records.length;
    reset();
    onClaimed(v, count);
  };

  const warranties = found ? found.records.filter((r) => (r.warrantyUntil ?? 0) > Date.now()).length : 0;
  return (
    <Sheet visible={visible} title="කේතයකින් එක් කරන්න" subtitle="විකුණුම්කරු ඔබට දුන් කේතය" onClose={close}>
      {!found ? (
        <>
          <Text style={styles.label}>කේතය (අංක 6)</Text>
          <TextInput style={styles.input} value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="000 000" placeholderTextColor={Colors.textMuted} accessibilityLabel="Handover code" />
          <Text style={styles.label}>වාහනයේ අංක තහඩුව</Text>
          <TextInput style={styles.input} value={plate} onChangeText={(t) => setPlate(normalisePlate(t))} autoCapitalize="characters" placeholder="CAD-8821" placeholderTextColor={Colors.textMuted} accessibilityLabel="Vehicle plate" />
          {!!error && <Text style={styles.warn}>{error}</Text>}
          <FlowButton label={code.length < 6 ? 'කේතය ඇතුළත් කරන්න' : plate.trim() ? 'පරීක්ෂා කරන්න' : 'අංක තහඩුව ඇතුළත් කරන්න'} variant="primary" disabled={code.length < 6 || !plate.trim()} onPress={look} />
        </>
      ) : (
        <>
          <View style={styles.plateRow}>
            <LkPlate plate={found.vehicle.plate} />
            <Text style={styles.shareTitle}>{found.vehicle.name}</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>ඔබට ලැබෙන දේ</Text>
            <Text style={styles.line}>✓ සත්‍යාපිත සේවා වාර්තා {found.records.length} ක් (පෙර හිමියාගේ වාර්තා ලෙස)</Text>
            {warranties > 0 && <Text style={styles.line}>✓ ක්‍රියාත්මක වගකීම් {warranties} ක් ඔබට හිමි වේ</Text>}
            <Text style={styles.line}>{found.sharePrices ? '✓ සේවාවල මිල ද පෙනේ' : '• පෙර හිමියා මිල බෙදා ගත්තේ නැත'}</Text>
          </View>
          <Text style={styles.note}>වාර්තා වෙනස් කළ නොහැක. ඔබගේ අලුත් රැකියා වෙනම පෙන්වයි.</Text>
          <View style={styles.actions}>
            <View style={styles.flex1}>
              <FlowButton label="ආපසු" variant="ghost" onPress={() => setFound(null)} />
            </View>
            <View style={styles.flex1}>
              <FlowButton label="වාහනය එක් කරන්න" variant="primary" onPress={take} />
            </View>
          </View>
        </>
      )}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    body: { fontSize: 13.5, lineHeight: 21, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    warn: { fontSize: 13.5, lineHeight: 21, fontFamily: FONTS.bodySemiBold, color: Colors.warning },
    note: { fontSize: 12.5, lineHeight: 18, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center' },
    label: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    line: { fontSize: 13.5, lineHeight: 21, fontFamily: FONTS.bodyRegular, color: Colors.textMain },
    box: { gap: 4, padding: 14, borderRadius: 18, backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#f3f4f6' },
    boxTitle: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain, marginBottom: 2 },
    shareRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#f3f4f6' },
    shareTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    shareSub: { fontSize: 12.5, lineHeight: 18, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    switch: { width: 42, height: 24, borderRadius: 12, padding: 3, backgroundColor: Colors.subtleBorder, justifyContent: 'center' },
    switchOn: { backgroundColor: Colors.success },
    knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
    knobOn: { alignSelf: 'flex-end' },
    codeCard: { alignItems: 'center', gap: 4, paddingVertical: 20, borderRadius: 26, backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#dbeafe', borderWidth: 1.5, borderColor: '#facc15' },
    codeLabel: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1e3a8a' },
    code: { fontSize: 36, lineHeight: 44, letterSpacing: 4, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1e3a8a' },
    codeSub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    input: { height: 48, paddingHorizontal: 16, borderRadius: 24, backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#f3f4f6', color: Colors.textMain, fontSize: 16, fontFamily: FONTS.bodySemiBold, letterSpacing: 1 },
    plateRow: { gap: 8, alignItems: 'flex-start' },
    actions: { flexDirection: 'row', gap: 10 },
  })
);
