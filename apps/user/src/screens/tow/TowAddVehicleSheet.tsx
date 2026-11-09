import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, FONTS, normalisePlate, VEHICLE_TYPES, VehicleIcon3D, themedStyles, type Vehicle } from '@ongarage/shared';
import { elevation1, outline } from '../../utils/material';

// Sri Lankan plates: optional province letters, 2–3 letters (or digits), dash, 4 digits.
const PLATE_PATTERN = /^([A-Z]{2}-)?([A-Z]{2,3}|\d{2,3})-\d{4}$/;

/**
 * The vehicle of someone else, for one tow. One window, two steps:
 * the type (a tap moves on), then the details: name and model, the plate, and the owner's phone number.
 * The vehicle is handed back for this job only; it is never saved to the owner's list.
 */
const STEP_TITLES = ['වාහන වර්ගය', 'විස්තර'];

export const TowAddVehicleSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  onAdded: (vehicle: Vehicle, ownerPhone: string) => void;
}> = ({ visible, onClose, onAdded }) => {
  const [step, setStep] = useState(0);
  const [type, setType] = useState('Sedan');
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [phone, setPhone] = useState('');

  const clean = normalisePlate(plate);
  const detailsOk = name.trim().length > 0 && PLATE_PATTERN.test(clean) && phone.replace(/\D/g, '').length >= 9;
  const stepOk = [true, detailsOk];
  const typeLabel = VEHICLE_TYPES.find((t) => t.id === type)?.label ?? type;
  const last = step === STEP_TITLES.length - 1;

  const reset = () => {
    setStep(0);
    setType('Sedan');
    setName('');
    setPlate('');
    setPhone('');
  };
  const close = () => {
    reset();
    onClose();
  };
  const back = () => (step === 0 ? close() : setStep(step - 1));
  const next = () => {
    if (!stepOk[step]) return;
    if (!last) return setStep(step + 1);
    onAdded({ id: `job-${Date.now()}`, name: name.trim(), plate: clean, type }, phone.trim());
    reset();
  };
  // Picking a type is the whole question, so the flow moves on by itself.
  const pickType = (id: string) => {
    setType(id);
    setStep(1);
  };

  const summary = step > 0 ? typeLabel : '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.head}>
            <Pressable style={styles.roundBtn} onPress={back} accessibilityLabel={step === 0 ? 'Close' : 'Back'}>
              <Text style={styles.roundText}>{step === 0 ? '✕' : '‹'}</Text>
            </Pressable>
            <View style={styles.flex1}>
              <Text style={styles.title}>වෙනත් අයෙකුගේ වාහනයක් එක් කරන්න</Text>
              <View style={styles.stepRow}>
                <View style={styles.stepChip}>
                  <Text style={styles.stepNo}>{`${step + 1}/${STEP_TITLES.length}`}</Text>
                </View>
                <Text style={styles.stepSub} numberOfLines={1}>{STEP_TITLES[step]}</Text>
              </View>
            </View>
          </View>

          <View style={styles.progressRow}>
            {STEP_TITLES.map((_, i) => (
              <View key={i} style={[styles.progressBar, i <= step && styles.progressBarOn]} />
            ))}
          </View>

          {!!summary && <Text style={styles.summary} numberOfLines={1}>{summary}</Text>}

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            {step === 0 && (
              <View style={styles.grid}>
                {VEHICLE_TYPES.map((t) => {
                  const on = t.id === type;
                  return (
                    <Pressable key={t.id} style={styles.item} onPress={() => pickType(t.id)} accessibilityLabel={`Vehicle type ${t.label}`}>
                      <View style={[styles.tile, on && styles.tileOn]}>
                        <VehicleIcon3D type={t.id} size={52} />
                        {on && (
                          <View style={styles.tick}>
                            <Text style={styles.tickText}>✓</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.itemLabel, on && styles.itemLabelOn]} numberOfLines={1}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {step === 1 && (
              <View style={styles.card}>
                <Text style={styles.label}>වාහනයේ නම / මාදිලිය *</Text>
                <TextInput autoFocus style={styles.input} value={name} onChangeText={setName} placeholder="උදා: Toyota Aqua" placeholderTextColor={Colors.textSoft} maxLength={32} accessibilityLabel="Vehicle name" />
                <Text style={styles.label}>අංක තහඩුව *</Text>
                <TextInput autoCapitalize="characters" autoCorrect={false} style={styles.input} value={plate} onChangeText={(t) => setPlate(t.toUpperCase())} placeholder="උදා: CAB-1234" placeholderTextColor={Colors.textSoft} maxLength={14} accessibilityLabel="Number plate" />
                <Text style={styles.hint}>ශ්‍රී ලංකා ආකෘතිය: CAB-1234 හෝ WP-CAB-1234</Text>
                <Text style={styles.label}>වාහන හිමිකරුගේ දුරකථන අංකය *</Text>
                <TextInput keyboardType="phone-pad" style={styles.input} value={phone} onChangeText={setPhone} placeholder="07X XXX XXXX" placeholderTextColor={Colors.textSoft} maxLength={15} accessibilityLabel="Vehicle owner phone" />
                <Text style={styles.hint}>රියදුරා වාහනයේ හිමිකරුට කතා කරන්න මෙය ඕන. මේ වාහනය ඔබේ ලැයිස්තුවට ගන්නේ නැහැ.</Text>
              </View>
            )}
          </ScrollView>

          {step > 0 && (
            <View style={styles.footer}>
              <Pressable style={[styles.action, !stepOk[step] && styles.actionOff]} disabled={!stepOk[step]} onPress={next} accessibilityLabel={last ? 'Use this vehicle for this tow' : 'Next'}>
                <Text style={styles.actionText}>{last ? 'Towing ඉල්ලීමට පමණයි' : 'ඊළඟ'}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    backdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
    sheet: { maxHeight: '92%', backgroundColor: Colors.sheetBg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, overflow: 'hidden' },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },
    head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 12 },
    roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.subtleFill, alignItems: 'center', justifyContent: 'center' },
    roundText: { fontSize: 18, color: Colors.textMain, marginTop: -2 },
    title: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    stepChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#dbeafe' },
    stepNo: { fontSize: 12, color: '#1d367f', fontFamily: FONTS.bodyBold },
    stepSub: { flex: 1, fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, marginTop: 12 },
    progressBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: Colors.subtleBorder },
    progressBarOn: { backgroundColor: '#1a73e8' },
    summary: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#1d367f', paddingHorizontal: 18, marginTop: 10 },
    body: { padding: 18, gap: 12, paddingBottom: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
    item: { width: '33.33%', alignItems: 'center', gap: 6 },
    tile: { width: 84, height: 80, borderRadius: 10, backgroundColor: 'rgba(143, 155, 176, 0.2)', borderWidth: 2, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
    tileOn: { borderColor: '#1a73e8', borderWidth: 3, backgroundColor: 'rgba(26, 115, 232, 0.16)' },
    tick: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#1a73e8', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    tickText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    itemLabel: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center' },
    itemLabelOn: { color: '#1a73e8' },
    card: { padding: 16, borderRadius: 18, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1(), gap: 10 },
    label: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
    input: { height: 50, borderRadius: 14, paddingHorizontal: 14, backgroundColor: Colors.subtleFill, color: Colors.textMain, fontFamily: FONTS.bodyRegular, fontSize: 16 },
    hint: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
    footer: { padding: 16, paddingTop: 12, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.subtleBorder },
    action: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a73e8' },
    actionOff: { opacity: 0.4 },
    actionText: { fontSize: 15, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  })
);
