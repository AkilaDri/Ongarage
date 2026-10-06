import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton, Colors, FONTS, themedStyles } from '@ongarage/shared';
import { PROFILE_STEPS, useProfile, validateField, type Gender, type OwnerProfile, type ProfileField } from '../context/ProfileContext';
import { SAMPLE_UPLOAD_PHOTOS } from '../constants/mockData';
import { useNotice } from '../context/NoticeContext';
import { Sheet } from '../components/Sheet';
import { Toast } from '../components/Toast';

const GENDERS: { id: Gender; label: string }[] = [
  { id: 'male', label: 'පුරුෂ' },
  { id: 'female', label: 'ස්ත්‍රී' },
  { id: 'other', label: 'වෙනත්' },
];
const genderLabel = (g: OwnerProfile['gender']) => GENDERS.find((x) => x.id === g)?.label ?? '';

type Editor =
  | { kind: 'text'; title: string; fields: { field: ProfileField; label: string; keyboard?: 'default' | 'phone-pad' | 'email-address'; placeholder?: string }[] }
  | { kind: 'gender' };

/**
 * The owner's details on their own page: a completion bar, then one row per detail.
 * A row opens a small editor; everything saves on the device (a backend would hold it).
 */
export const EditProfileScreen: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { profile, update, fullName, initials, completed } = useProfile();
  const { notify } = useNotice();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [draft, setDraft] = useState<Partial<OwnerProfile>>({});
  const [error, setError] = useState('');

  const open = (e: Editor) => {
    setDraft(e.kind === 'text' ? Object.fromEntries(e.fields.map((f) => [f.field, profile[f.field]])) : {});
    setError('');
    setEditor(e);
  };
  const save = () => {
    if (editor?.kind !== 'text') return;
    for (const f of editor.fields) {
      const msg = validateField(f.field, String(draft[f.field] ?? ''));
      if (msg) {
        setError(msg);
        return;
      }
    }
    update(Object.fromEntries(editor.fields.map((f) => [f.field, String(draft[f.field] ?? '').trim()])));
    notify({ icon: '✓', title: 'සුරැකුවා', body: editor.title, tone: 'success' });
    setEditor(null);
  };

  const rows: { icon: string; label: string; value: string; empty: string; editor: Editor; accessibility: string }[] = [
    {
      icon: '👤',
      label: 'සම්පූර්ණ නම',
      value: fullName,
      empty: '',
      accessibility: 'Edit name',
      editor: { kind: 'text', title: 'සම්පූර්ණ නම', fields: [{ field: 'firstName', label: 'මුල් නම' }, { field: 'lastName', label: 'අවසාන නම' }] },
    },
    { icon: '📱', label: 'ජංගම දුරකථන අංකය', value: profile.phone, empty: 'ඔබගේ අංකය එක් කරන්න', accessibility: 'Edit phone', editor: { kind: 'text', title: 'ජංගම දුරකථන අංකය', fields: [{ field: 'phone', label: 'දුරකථන අංකය', keyboard: 'phone-pad', placeholder: '0771234567' }] } },
    { icon: '✉️', label: 'ඊමේල් ලිපිනය', value: profile.email, empty: 'ඔබගේ ඊමේල් එක් කරන්න', accessibility: 'Edit email', editor: { kind: 'text', title: 'ඊමේල් ලිපිනය', fields: [{ field: 'email', label: 'ඊමේල්', keyboard: 'email-address', placeholder: 'name@example.com' }] } },
    { icon: '🎂', label: 'උපන් දිනය', value: profile.birthday, empty: 'ඔබගේ උපන් දිනය එක් කරන්න', accessibility: 'Edit birthday', editor: { kind: 'text', title: 'උපන් දිනය', fields: [{ field: 'birthday', label: 'උපන් දිනය (YYYY-MM-DD)', placeholder: '1995-08-21' }] } },
    { icon: '🚻', label: 'ස්ත්‍රී පුරුෂ භාවය', value: genderLabel(profile.gender), empty: 'ඔබගේ ස්ත්‍රී පුරුෂ භාවය තෝරන්න', accessibility: 'Edit gender', editor: { kind: 'gender' } },
  ];
  const prefs: typeof rows = [
    {
      icon: '🚨',
      label: 'හදිසි සම්බන්ධතාව',
      value: profile.emergencyName ? `${profile.emergencyName} · ${profile.emergencyPhone}` : '',
      empty: 'හදිසි සම්බන්ධතාවක් එක් කරන්න',
      accessibility: 'Edit emergency contact',
      editor: { kind: 'text', title: 'හදිසි සම්බන්ධතාව', fields: [{ field: 'emergencyName', label: 'නම' }, { field: 'emergencyPhone', label: 'දුරකථන අංකය', keyboard: 'phone-pad', placeholder: '0771234567' }] },
    },
  ];

  const row = (r: (typeof rows)[number]) => (
    <Pressable key={r.label} style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={() => open(r.editor)} accessibilityLabel={r.accessibility}>
      <Text style={styles.rowIcon}>{r.icon}</Text>
      <View style={styles.flex1}>
        <Text style={styles.rowLabel}>{r.label}</Text>
        <Text style={[styles.rowValue, !r.value && styles.rowEmpty]} numberOfLines={1}>
          {r.value || r.empty}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close profile">
            <Text style={styles.back}>←</Text>
          </Pressable>
          <Text style={styles.title}>ඔබගේ පැතිකඩ</Text>
          <View style={styles.backSpace} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          <View style={styles.progressBox}>
            <Text style={styles.progressText}>ඔබ ලබා දෙන අමතර තොරතුරු ඔබට වඩා පෞද්ගලීකරණය කළ අත්දැකීමක් ලබා දීමට අපට උපකාරී වනු ඇත</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(completed / PROFILE_STEPS.length) * 100}%` }]} />
            </View>
            <View style={styles.progressRow}>
              <Text style={styles.progressCount} accessibilityLabel="Profile completion">
                {PROFILE_STEPS.length} න් {completed} ක් සම්පූර්ණයි
              </Text>
              <Text style={styles.secure}>🛡️ ඔබගේ තොරතුරු ආරක්ෂිතයි</Text>
            </View>
          </View>

          <Text style={styles.section}>ඔබගේ තොරතුරු</Text>
          <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={() => update({ photo: profile.photo ? '' : SAMPLE_UPLOAD_PHOTOS[0] })} accessibilityLabel="Toggle profile photo">
            {profile.photo ? <Image source={{ uri: profile.photo }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarEmpty]}><Text style={styles.avatarText}>{initials}</Text></View>}
            <View style={styles.flex1}>
              <Text style={styles.rowValue}>{profile.photo ? 'පැතිකඩ පින්තූරය ඉවත් කරන්න' : 'පැතිකඩ පින්තූරය එක් කරන්න'}</Text>
            </View>
            {!profile.photo && <View style={styles.dot} />}
          </Pressable>
          {rows.map(row)}

          <Text style={styles.section}>ඔබේ මනාපයන්</Text>
          <View style={styles.row}>
            <Text style={styles.rowIcon}>🔤</Text>
            <View style={styles.flex1}>
              <Text style={styles.rowLabel}>භාෂාව</Text>
              <Text style={styles.rowValue}>සිංහල</Text>
            </View>
          </View>
          {prefs.map(row)}
        </ScrollView>

        <Sheet
          visible={!!editor}
          title={editor?.kind === 'text' ? editor.title : 'ස්ත්‍රී පුරුෂ භාවය'}
          onClose={() => setEditor(null)}
          footer={editor?.kind === 'text' ? <ActionButton label="සුරකින්න" icon="✓" variant="primary" onPress={save} /> : undefined}
        >
          {editor?.kind === 'text' &&
            editor.fields.map((f) => (
              <View key={f.field} style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={String(draft[f.field] ?? '')}
                  onChangeText={(t) => {
                    setDraft((d) => ({ ...d, [f.field]: t }));
                    setError('');
                  }}
                  keyboardType={f.keyboard ?? 'default'}
                  autoCapitalize={f.field === 'email' ? 'none' : 'words'}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.textMuted}
                  accessibilityLabel={`Field ${f.field}`}
                />
              </View>
            ))}
          {editor?.kind === 'text' && !!error && <Text style={styles.error}>{error}</Text>}
          {editor?.kind === 'gender' && (
            <View style={styles.chips}>
              {GENDERS.map((g) => (
                <Pressable
                  key={g.id}
                  style={[styles.chip, profile.gender === g.id && styles.chipOn]}
                  onPress={() => {
                    update({ gender: g.id });
                    setEditor(null);
                  }}
                  accessibilityLabel={`Gender ${g.id}`}
                >
                  <Text style={[styles.chipText, profile.gender === g.id && styles.chipTextOn]}>{g.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </Sheet>
        <Toast topOffset={40} />
      </SafeAreaView>
    </Modal>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    container: { flex: 1, backgroundColor: Colors.bgBody },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    back: { fontSize: 24, color: Colors.textMain },
    backSpace: { width: 24 },
    title: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    body: { paddingBottom: 40 },
    progressBox: { backgroundColor: 'rgba(56, 189, 248, 0.12)', paddingHorizontal: 18, paddingVertical: 14, gap: 10 },
    progressText: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 18 },
    track: { height: 6, borderRadius: 3, backgroundColor: Colors.subtleFill, overflow: 'hidden' },
    fill: { height: 6, borderRadius: 3, backgroundColor: Colors.primary },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressCount: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    secure: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    section: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, paddingHorizontal: 18, paddingTop: 22, paddingBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 13, borderTopWidth: 1, borderTopColor: Colors.borderColor },
    pressed: { backgroundColor: Colors.bgCardHover },
    rowIcon: { fontSize: 20, width: 28, textAlign: 'center' },
    rowLabel: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    rowValue: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, marginTop: 1 },
    rowEmpty: { color: Colors.textSoft, fontFamily: FONTS.bodyMedium },
    chevron: { fontSize: 22, color: Colors.textMuted },
    avatar: { width: 36, height: 36, borderRadius: 18 },
    avatarEmpty: { backgroundColor: Colors.subtleFill, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 13, fontWeight: '800', color: Colors.textMuted },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
    fieldBox: { gap: 6 },
    fieldLabel: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    input: { height: 48, paddingHorizontal: 14, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, color: Colors.textMain, fontSize: 14, fontFamily: FONTS.bodyMedium },
    error: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.errorText, lineHeight: 17 },
    chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    chipOn: { borderColor: Colors.primary, backgroundColor: 'rgba(56, 189, 248, 0.14)' },
    chipText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: Colors.primary },
  })
);
