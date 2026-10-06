import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Colors, FONTS, glassStyle, themedStyles } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';

// The daily register: who came to work today. SOS capacity comes from this.
export const AttendanceSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { team, crew, confirmAttendance } = useGarage();
  const [mounted, setMounted] = useState(visible);
  const [present, setPresent] = useState<string[]>([]);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      // Start from today's register if there is one, otherwise assume everyone came.
      setPresent(crew.confirmed ? crew.presentIds : team.map((m) => m.id));
      Animated.spring(slide, { toValue: 1, stiffness: 200, damping: 24, useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(slide, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  const onJob = (id: string) => crew.onJobIds.includes(id);
  const capacity = Math.max(0, present.length - crew.committedJobs);
  const toggle = (id: string) => {
    if (onJob(id)) return;
    setPresent((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: slide }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <View style={styles.anchor} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [560, 0] }) }] }]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={styles.flex1}>
              <Text style={styles.title}>අද පැමිණීම</Text>
              <Text style={styles.sub}>{new Date().toDateString()}</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.capacity}>
              <Text style={styles.capacityNum}>{present.length}</Text>
              <View style={styles.flex1}>
                <Text style={styles.cardTitle}>අද පැමිණ සිටින කාර්මිකයන්</Text>
                <Text style={styles.sub}>
                  SOS ධාරිතාව: එකවර රැකියා {present.length}ක් · නිදහස් {capacity}
                </Text>
              </View>
            </View>
            <Text style={styles.why}>
              ඔබට එකවර භාර ගත හැක්කේ අද පැමිණ සිටින කාර්මිකයන් ගණනට සමාන SOS රැකියා පමණි — එවිට වෙනත් ගරාජයකට ලැබිය යුතු රැකියා අහිමි නොවේ.
            </Text>

            {team.map((m) => {
              const isPresent = present.includes(m.id);
              const busy = onJob(m.id);
              return (
                <Pressable key={m.id} style={[styles.member, isPresent && styles.memberPresent]} onPress={() => toggle(m.id)} disabled={busy}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarEmoji}>👨‍🔧</Text>
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.cardTitle}>{m.name}</Text>
                    <Text style={styles.sub}>{m.role}</Text>
                  </View>
                  {busy ? (
                    <View style={[styles.pill, styles.pillBusy]}>
                      <Text style={[styles.pillText, { color: Colors.primary }]}>🚐 SOS රැකියාවක</Text>
                    </View>
                  ) : (
                    <View style={[styles.pill, isPresent ? styles.pillOn : styles.pillOff]}>
                      <Text style={[styles.pillText, { color: isPresent ? Colors.success : Colors.textMuted }]}>{isPresent ? '✓ පැමිණ ඇත' : 'නිවාඩු'}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <ActionButton
              label={`අද පැමිණීම තහවුරු කරන්න (${present.length})`}
              icon="✓"
              variant="success"
              onPress={() => {
                confirmAttendance(present);
                onClose();
              }}
            />
          </View>
        </Animated.View>
      </View>
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
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, gap: 10 },
    title: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.subtleFill, borderWidth: 1, borderColor: Colors.borderColor, justifyContent: 'center', alignItems: 'center' },
    closeText: { fontSize: 12, color: Colors.textMain },
    body: { padding: 18, gap: 10 },
    capacity: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.4)' },
    capacityNum: { fontSize: 32, fontWeight: '900', color: Colors.success, minWidth: 40, textAlign: 'center' },
    why: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    member: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    memberPresent: { borderColor: 'rgba(16, 185, 129, 0.45)' },
    avatar: { width: 40, height: 40, borderRadius: 20, ...glassStyle(), justifyContent: 'center', alignItems: 'center' },
    avatarEmoji: { fontSize: 19 },
    cardTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
    pillOn: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.4)' },
    pillOff: { backgroundColor: Colors.subtleFill, borderColor: Colors.subtleBorder },
    pillBusy: { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.4)' },
    pillText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold },
    footer: { padding: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderColor, backgroundColor: Colors.barBg },
  })
);
