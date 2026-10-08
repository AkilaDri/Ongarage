import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, FONTS, themedStyles, softFill, softEdge, softShadow } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { MEMBER_ROLES } from '../constants/mockData';

export const AddMemberSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { addMember, crew } = useGarage();
  const [mounted, setMounted] = useState(visible);
  const [name, setName] = useState('');
  const [role, setRole] = useState(MEMBER_ROLES[1]);
  const [phone, setPhone] = useState('');
  const [presentToday, setPresentToday] = useState(true);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setName('');
      setRole(MEMBER_ROLES[1]);
      setPhone('');
      setPresentToday(true);
      Animated.spring(slide, { toValue: 1, stiffness: 200, damping: 24, useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(slide, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;
  const phoneDigits = phone.replace(/\D/g, '');
  const valid = name.trim().length > 1 && phoneDigits.length === 10;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: slide }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.anchor} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [560, 0] }) }] }]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>නව සේවකයෙකු එක් කරන්න</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>නම</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="උදා: චමින්ද රත්නායක" placeholderTextColor={Colors.textMuted} maxLength={40} />

            <Text style={styles.label}>භූමිකාව</Text>
            <View style={styles.chips}>
              {MEMBER_ROLES.map((r) => (
                <Pressable key={r} style={[styles.choice, role === r && styles.choiceActive]} onPress={() => setRole(r)}>
                  <Text style={[styles.choiceText, role === r && styles.choiceTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>දුරකථන අංකය</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="07X XXX XXXX" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" maxLength={12} />
            {phone.length > 0 && phoneDigits.length !== 10 && <Text style={styles.error}>ඉලක්කම් 10 ක දුරකථන අංකයක් ඇතුළත් කරන්න</Text>}

            {crew.confirmed && (
              <Pressable style={[styles.toggleRow, presentToday && styles.toggleRowOn]} onPress={() => setPresentToday((p) => !p)}>
                <View style={[styles.check, presentToday && styles.checkOn]}>{presentToday && <Text style={styles.checkMark}>✓</Text>}</View>
                <Text style={styles.toggleText}>අද පැමිණ සිටී (අද SOS ධාරිතාවට එක් වේ)</Text>
              </Pressable>
            )}
          </ScrollView>
          <View style={styles.footer}>
            <ActionButton
              label="සේවකයා එක් කරන්න"
              icon="＋"
              variant="primary"
              disabled={!valid}
              onPress={() => {
                addMember({ name: name.trim(), role, phone: phoneDigits }, presentToday);
                onClose();
              }}
            />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: Colors.overlay },
    anchor: { flex: 1, justifyContent: 'flex-end' },
    sheet: {
      maxHeight: '88%',
      backgroundColor: Colors.sheetBg,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: 'transparent',
      paddingTop: 10,
      overflow: 'hidden',
    },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12 },
    title: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: softFill(), borderWidth: 1, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
    closeText: { fontSize: 12, color: Colors.textMain },
    body: { padding: 18, gap: 10 },
    label: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    input: {
      height: 46,
      paddingHorizontal: 14,
      borderRadius: 18,
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: softEdge(),
      color: Colors.textMain,
      fontSize: 14,
      fontFamily: FONTS.bodyMedium,
      ...softShadow(),
    },
    error: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.errorText },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choice: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'transparent', backgroundColor: softFill() },
    choiceActive: { borderColor: Colors.primary, backgroundColor: 'rgba(56, 189, 248, 0.14)' },
    choiceText: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    choiceTextActive: { color: Colors.primary, fontFamily: FONTS.bodyBold },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: softEdge(), backgroundColor: Colors.bgCard, marginTop: 6, ...softShadow() },
    toggleRowOn: { borderColor: 'rgba(16, 185, 129, 0.45)' },
    check: { width: 22, height: 22, borderRadius: 7, borderWidth: 1, borderColor: 'transparent', backgroundColor: softFill(), justifyContent: 'center', alignItems: 'center' },
    checkOn: { backgroundColor: Colors.success, borderColor: Colors.success },
    checkMark: { fontSize: 12, fontWeight: '900', color: '#fff' },
    toggleText: { flex: 1, fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textMain },
    footer: { padding: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderColor, backgroundColor: Colors.barBg },
  })
);
