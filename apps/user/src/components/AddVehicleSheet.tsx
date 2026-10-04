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
import { normalisePlate, useVehicles, VEHICLE_TYPES } from '../context/VehiclesContext';
import type { Vehicle } from '@ongarage/shared';

// Sri Lankan plates: optional province letters, 2–3 letters (or digits), dash, 4 digits.
const PLATE_PATTERN = /^([A-Z]{2}-)?([A-Z]{2,3}|\d{2,3})-\d{4}$/;

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
  const [touched, setTouched] = useState(false);
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
      setTouched(false);
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
    const vehicle = addVehicle({ name: name.trim(), plate: cleanPlate, type });
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
                <Text style={styles.previewEmoji}>{typeInfo.icon}</Text>
              </Animated.View>
              <View style={styles.flex1}>
                <Text style={styles.previewName} numberOfLines={1}>
                  {name.trim() || 'වාහනයේ නම'}
                </Text>
                <Text style={styles.sub}>{typeInfo.label}</Text>
                <View style={styles.plate}>
                  <Text style={styles.plateText}>{cleanPlate || 'XXX-0000'}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.label}>වාහන වර්ගය</Text>
            <View style={styles.types}>
              {VEHICLE_TYPES.map((t) => {
                const active = t.id === type;
                return (
                  <Pressable key={t.id} style={styles.typeItem} onPress={() => pickType(t.id)}>
                    <View style={[styles.typeTile, active && styles.typeTileActive]}>
                      <Text style={styles.typeEmoji}>{t.icon}</Text>
                    </View>
                    <Text style={[styles.typeLabel, active && { color: Colors.primary }]} numberOfLines={1}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>වාහනයේ නම / මාදිලිය</Text>
            <TextInput
              style={[styles.input, nameError && styles.inputError]}
              placeholder="උදා: Toyota Aqua"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={32}
            />
            {nameError && <Text style={styles.error}>{nameError}</Text>}

            <Text style={styles.label}>අංක තහඩුව</Text>
            <TextInput
              style={[styles.input, styles.plateInput, plateError && styles.inputError]}
              placeholder="උදා: CAB-1234"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              value={plate}
              onChangeText={setPlate}
              maxLength={14}
            />
            {plateError && <Text style={styles.error}>{plateError}</Text>}
          </ScrollView>

          <View style={styles.footer}>
            <ActionButton label="වාහනය එක් කරන්න" icon="＋" variant="primary" disabled={touched && !valid} onPress={save} />
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
    sheet: {
      maxHeight: '88%',
      backgroundColor: Colors.sheetBg,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: Colors.borderColor,
      paddingTop: 10,
      overflow: 'hidden',
    },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12 },
    title: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
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
    body: { padding: 18, gap: 10 },
    preview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      borderRadius: 20,
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: 'rgba(56, 189, 248, 0.35)',
      marginBottom: 4,
    },
    previewIcon: { width: 72, height: 72, borderRadius: 22, ...glassStyle(), justifyContent: 'center', alignItems: 'center' },
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
    types: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    typeItem: { width: 64, alignItems: 'center', gap: 5 },
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
