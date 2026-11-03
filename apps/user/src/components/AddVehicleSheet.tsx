import { LkPlate } from '@ongarage/shared';
import { elevation1, outline } from '../utils/material';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Colors, themedStyles } from '@ongarage/shared';
import { FONTS } from '@ongarage/shared';
import { ActionButton, glassStyle } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { normalisePlate, VEHICLE_TYPES, VehicleIcon3D } from '@ongarage/shared';
import type { Vehicle } from '@ongarage/shared';

// Sri Lankan plates: optional province letters, 2–3 letters (or digits), dash, 4 digits.
const PLATE_PATTERN = /^([A-Z]{2}-)?([A-Z]{2,3}|\d{2,3})-\d{4}$/;

// A labelled field: the label sits above the box, so the example inside it is never mistaken for a value.
const Field: React.FC<React.ComponentProps<typeof TextInput> & { label: string; error?: string | null; hint?: string }> = ({ label, error, hint, style, ...input }) => (
  <>
    <Text style={styles.label}>{label}</Text>
    <TextInput style={[styles.input, error ? styles.inputError : null, style]} placeholderTextColor={Colors.textSoft} {...input} />
    {!!hint && !error && <Text style={styles.hintText}>{hint}</Text>}
    {!!error && <Text style={styles.error}>{error}</Text>}
  </>
);

interface AddVehicleSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdded: (vehicle: Vehicle) => void;
}

export const AddVehicleSheet: React.FC<AddVehicleSheetProps> = ({ visible, onClose, onAdded }) => {
  const { vehicles, addVehicle } = useVehicles();
  const [mounted, setMounted] = useState(visible);
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [type, setType] = useState<string>('Sedan');
  const [registrationNo, setRegistrationNo] = useState('');
  const [chassisNo, setChassisNo] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [insuranceNo, setInsuranceNo] = useState('');
  const [touched, setTouched] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [saved, setSaved] = useState<Vehicle | null>(null);
  const slide = useRef(new Animated.Value(0)).current;
  const iconPop = useRef(new Animated.Value(1)).current;
  const success = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setName('');
      setPlate('');
      setType('Sedan');
      setRegistrationNo('');
      setChassisNo('');
      setEngineNo('');
      setMake('');
      setModel('');
      setColor('');
      setInsuranceNo('');
      setTouched(false);
      setShowDetails(false);
      setSaved(null);
      success.setValue(0);
      Animated.spring(slide, { toValue: 1, stiffness: 200, damping: 24, mass: 1, useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(slide, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() =>
        setMounted(false)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pickType = (id: string) => {
    setType(id);
    iconPop.setValue(0.6);
    Animated.spring(iconPop, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }).start();
  };

  const cleanPlate = normalisePlate(plate);
  const duplicate = vehicles.some((v) => v.plate === cleanPlate);
  const nameError = touched && !name.trim() ? 'වාහනයේ නම / මාදිලිය ඇතුළත් කරන්න' : null;
  const plateError = !touched
    ? null
    : !cleanPlate
      ? 'අංක තහඩුව ඇතුළත් කරන්න'
      : !PLATE_PATTERN.test(cleanPlate)
        ? 'වලංගු අංකයක් ඇතුළත් කරන්න (උදා: CAB-1234 / WP-CAB-1234)'
        : duplicate
          ? 'මෙම අංකය සහිත වාහනයක් දැනටමත් ඇත'
          : null;
  const valid = !!name.trim() && PLATE_PATTERN.test(cleanPlate) && !duplicate;
  const typeInfo = VEHICLE_TYPES.find((t) => t.id === type) ?? VEHICLE_TYPES[0];

  const save = () => {
    setTouched(true);
    if (!valid) return;
    const vehicle = addVehicle({ name: name.trim(), plate: cleanPlate, type, registrationNo, chassisNo, engineNo, make, model, color, insuranceNo });
    setSaved(vehicle);
    Animated.spring(success, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }).start();
    setTimeout(() => onAdded(vehicle), 1100);
  };

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: slide }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.anchor} pointerEvents="box-none">
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [520, 0] }) }] }]}
        >
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>නව වාහනයක් එක් කරන්න</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <View style={styles.preview}>
              <Animated.View style={[styles.previewIcon, { transform: [{ scale: iconPop }] }]}>
                <VehicleIcon3D type={typeInfo.id} size={50} />
              </Animated.View>
              <View style={styles.flex1}>
                <Text style={styles.previewName} numberOfLines={1}>
                  {name.trim() || 'වාහනයේ නම'}
                </Text>
                <Text style={styles.sub}>{typeInfo.label}</Text>
                <LkPlate plate={cleanPlate || 'XXX-0000'} stacked={type === 'Motorbike'} small />
              </View>
            </View>

            <Text style={styles.label}>වාහන වර්ගය</Text>
            <View style={styles.types}>
              {VEHICLE_TYPES.map((t) => {
                const active = t.id === type;
                return (
                  <Pressable key={t.id} style={styles.typeItem} onPress={() => pickType(t.id)}>
                    <View style={[styles.typeTile, active && styles.typeTileActive]}>
                      <VehicleIcon3D type={t.id} size={40} />
                    </View>
                    <Text style={[styles.typeLabel, active && { color: Colors.primary }]} numberOfLines={1}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Field
              label="වාහනයේ නම / මාදිලිය *"
              placeholder="උදා: Toyota Aqua"
              value={name}
              onChangeText={setName}
              maxLength={32}
              error={nameError}
            />

            <Field
              label="අංක තහඩුව *"
              placeholder="උදා: CAB-1234"
              autoCapitalize="characters"
              autoCorrect={false}
              value={plate}
              onChangeText={(t) => setPlate(t.toUpperCase())}
              maxLength={14}
              style={styles.plateInput}
              error={plateError}
              hint="ශ්‍රී ලංකා ආකෘතිය: CAB-1234 හෝ WP-CAB-1234"
            />

            {/* The rest is optional: collapsed, so the form stays short until the owner wants more. */}
            <Pressable style={styles.detailsToggle} onPress={() => setShowDetails((v) => !v)} accessibilityLabel="Vehicle details, optional">
              <Text style={styles.detailsToggleText}>{showDetails ? '▾' : '▸'} වාහනයේ විස්තර (විකල්පයි)</Text>
            </Pressable>
            {showDetails && (
              <>
                <Field label="ලියාපදිංචි අංකය" placeholder="උදා: 12-3456" value={registrationNo} onChangeText={setRegistrationNo} maxLength={32} />
                <Field label="Chassis අංකය" placeholder="උදා: MR0FR22G..." value={chassisNo} onChangeText={setChassisNo} maxLength={32} />
                <Field label="Engine අංකය" placeholder="උදා: 1NZ-1234567" value={engineNo} onChangeText={setEngineNo} maxLength={32} />
                <Field label="Make" placeholder="උදා: Toyota" value={make} onChangeText={setMake} maxLength={32} />
                <Field label="Model" placeholder="උදා: Aqua" value={model} onChangeText={setModel} maxLength={32} />
                <Field label="Color" placeholder="උදා: Pearl White" value={color} onChangeText={setColor} maxLength={32} />
                <Field label="Insurance Number" placeholder="උදා: INS-000123" value={insuranceNo} onChangeText={setInsuranceNo} maxLength={32} />
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <ActionButton label={valid ? 'වාහනය එක් කරන්න' : !name.trim() ? 'නම ඇතුළත් කරන්න' : 'අංක තහඩුව ඇතුළත් කරන්න'} icon="＋" variant="primary" disabled={!valid} onPress={save} />
          </View>

          {saved && (
            <Animated.View style={[styles.successLayer, { opacity: success }]} pointerEvents="none">
              <Animated.View style={[styles.successBadge, { transform: [{ scale: success }] }]}>
                <Text style={styles.successCheck}>✓</Text>
              </Animated.View>
              <Text style={styles.title}>වාහනය එක් කළා!</Text>
              <Text style={styles.sub}>
                {saved.name} · {saved.plate}
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: Colors.overlay },
    anchor: { flex: 1, justifyContent: 'flex-end' },
    sheet: { maxHeight: '88%', backgroundColor: Colors.sheetBg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, overflow: 'hidden' },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8, backgroundColor: Colors.sheetBg, zIndex: 2 },
    title: { fontSize: 20, lineHeight: 28, fontFamily: FONTS.titleBold, color: Colors.textMain },
    closeBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: Colors.subtleFill,
      borderWidth: 1,
      borderColor: Colors.borderColor,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeText: { fontSize: 12, color: Colors.textMain },
    body: { paddingHorizontal: 6, paddingVertical: 18, gap: 10 },
    preview: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: outline(), ...elevation1(), marginBottom: 4 },
    previewIcon: { width: 72, height: 72, borderRadius: 12, ...glassStyle(), justifyContent: 'center', alignItems: 'center' },
    previewEmoji: { fontSize: 38 },
    previewName: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.primary },
    sub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    plate: {
      alignSelf: 'flex-start',
      marginTop: 6,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 7,
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(56, 189, 248, 0.4)',
    },
    plateText: { fontSize: 12, fontWeight: '800', color: Colors.primary, letterSpacing: 1 },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4, marginTop: 6 },
    types: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
    typeItem: { width: '33.33%', alignItems: 'center', gap: 5 },
    typeTile: { width: 56, height: 56, borderRadius: 17, ...glassStyle(), justifyContent: 'center', alignItems: 'center' },
    typeTileActive: { backgroundColor: 'rgba(56, 189, 248, 0.2)', borderColor: Colors.primary, shadowColor: Colors.primary, shadowOpacity: 0.5 },
    typeEmoji: { fontSize: 26 },
    typeLabel: { fontSize: 10, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    input: {
      height: 46,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: Colors.borderColor,
      color: Colors.textMain,
      fontSize: 14,
      fontFamily: FONTS.bodyMedium,
    },
    plateInput: { letterSpacing: 1.5, fontWeight: '700' },
    hintText: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textSoft },
    detailsToggle: { paddingVertical: 12, marginTop: 6, borderTopWidth: 1, borderTopColor: Colors.borderColor },
    detailsToggleText: { fontSize: 14, fontFamily: FONTS.bodyBold, color: '#1d4ed8' },
    inputError: { borderColor: Colors.error },
    error: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.errorText },
    footer: { padding: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderColor, backgroundColor: Colors.barBg },
    successLayer: {
      ...StyleSheet.absoluteFill,
      backgroundColor: Colors.sheetBg,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    successBadge: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: Colors.success,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
      shadowColor: Colors.success,
      shadowOpacity: 0.6,
      shadowRadius: 24,
      elevation: 8,
    },
    successCheck: { fontSize: 40, fontWeight: '900', color: '#fff' },
  })
);
