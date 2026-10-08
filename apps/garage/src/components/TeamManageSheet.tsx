import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, GlassIcon, glassStyle, themedStyles, softEdge, softShadow, softFill } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { VANS } from '../constants/mockData';
import { Sheet } from './Sheet';
import { AddMemberSheet } from './AddMemberSheet';

/** The staff register and vans: changed rarely, so it lives behind the main screen. */
export const TeamManageSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { team, crew, removeMember } = useGarage();
  const [addOpen, setAddOpen] = useState(false);
  // Removal takes a second tap, so a stray touch can't drop someone from the register.
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <Sheet visible={visible} title="කණ්ඩායම සහ වාහන" subtitle={`සේවකයන් ${team.length} · වාහන ${VANS.length}`} onClose={onClose}>
      <Text style={styles.section}>සේවකයන්</Text>
      <View style={styles.list}>
        {team.map((m, i) => {
          const onJob = crew.onJobIds.includes(m.id);
          const confirming = confirmId === m.id;
          return (
            <View key={m.id} style={[styles.item, i > 0 && styles.divider]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>👨‍🔧</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.name}>{m.name}</Text>
                <Text style={styles.sub}>
                  {m.role} · {m.phone}
                </Text>
              </View>
              {onJob ? (
                <Text style={[styles.tag, { color: Colors.primary }]}>🚐 SOS රැකියාවක</Text>
              ) : confirming ? (
                <View style={styles.row}>
                  <Pressable style={styles.cancelBtn} onPress={() => setConfirmId(null)}>
                    <Text style={styles.cancelText}>නැත</Text>
                  </Pressable>
                  <Pressable
                    style={styles.removeConfirm}
                    onPress={() => {
                      removeMember(m.id);
                      setConfirmId(null);
                    }}
                  >
                    <Text style={styles.removeConfirmText}>ඉවත් කරන්න</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.removeBtn} hitSlop={6} onPress={() => setConfirmId(m.id)} accessibilityLabel={`Remove ${m.name}`}>
                  <Text style={styles.removeText}>✕</Text>
                </Pressable>
              )}
            </View>
          );
        })}
        <Pressable style={({ pressed }) => [styles.item, styles.divider, pressed && { opacity: 0.7 }]} onPress={() => setAddOpen(true)}>
          <View style={[styles.avatar, styles.addAvatar]}>
            <Text style={styles.addPlus}>＋</Text>
          </View>
          <Text style={[styles.name, { color: Colors.primary }]}>සේවකයෙකු එක් කරන්න</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>සේවා වාහන</Text>
      <View style={styles.list}>
        {VANS.map((v, i) => (
          <View key={v.id} style={[styles.item, i > 0 && styles.divider]}>
            <GlassIcon emoji="🚐" small />
            <View style={styles.flex1}>
              <Text style={styles.name}>{v.name}</Text>
              <Text style={styles.sub}>{v.plate}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.hint}>SOS රැකියාවක සිටින කාර්මිකයෙකු ඉවත් කළ නොහැක. කාර්මිකයෙකුට තමන්ගේම යතුරුපැදියෙන් ද යා හැක.</Text>
      <AddMemberSheet visible={addOpen} onClose={() => setAddOpen(false)} />
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    section: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    list: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 20, overflow: 'hidden', ...softShadow() },
    item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
    divider: { borderTopWidth: 1, borderTopColor: Colors.borderColor },
    avatar: { width: 38, height: 38, borderRadius: 19, ...glassStyle(), justifyContent: 'center', alignItems: 'center' },
    avatarEmoji: { fontSize: 18 },
    addAvatar: { borderStyle: 'dashed' },
    addPlus: { fontSize: 18, color: Colors.primary },
    name: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    tag: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold },
    removeBtn: { width: 28, height: 28, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: softFill(), borderWidth: 1, borderColor: 'transparent' },
    removeText: { fontSize: 11, color: Colors.textMuted },
    cancelBtn: { paddingHorizontal: 8, paddingVertical: 6 },
    cancelText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    removeConfirm: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(239, 68, 68, 0.14)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.45)' },
    removeConfirmText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: Colors.errorText },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', lineHeight: 16 },
  })
);
