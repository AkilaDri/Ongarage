import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, categoryInfo, Colors, garageSubServices, FONTS, GlassIcon, themedStyles, type VoiceNote } from '@ongarage/shared';
import { MediaAttachments } from './MediaAttachments';
import { useVehicles } from '../context/VehiclesContext';
import { Sheet } from './Sheet';
import { CategoryStrip } from './home/CategoryStrip';

export type InquiryInput = { categoryId: string; service?: string; vehicleId: string; text: string; photos: string[]; voiceNotes: VoiceNote[] };

/**
 * An inquiry to a garage before booking it: which service, which vehicle, what the owner wants to know (a price, a time, whether they can do it) and photos. It goes into the
 * chat with the garage, which answers there; the owner can then book the garage directly from the same chat. Laid out like the booking form (`DirectBookingSheet`).
 */
export const InquirySheet: React.FC<{ visible: boolean; garageName: string; categoryId?: string; defaultVehicleId?: string; onClose: () => void; onSend: (r: InquiryInput) => void }> = ({
  visible,
  garageName,
  categoryId: initialCategory,
  defaultVehicleId,
  onClose,
  onSend,
}) => {
  const { vehicles } = useVehicles();
  const [categoryId, setCategoryId] = useState(initialCategory ?? '1');
  const [service, setService] = useState<string | undefined>();
  const [vehicleId, setVehicleId] = useState(defaultVehicleId ?? vehicles[0]?.id ?? '');
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);

  useEffect(() => {
    if (!visible) return;
    setCategoryId(initialCategory ?? '1');
    setService(undefined);
    setVehicleId(defaultVehicleId ?? vehicles[0]?.id ?? '');
    setText('');
    setPhotos([]);
    setVoiceNotes([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const cat = categoryInfo(categoryId);

  return (
    <Sheet
      visible={visible}
      noDividers
      title="විමසීමක් යවන්න"
      subtitle="ගරාජය චැට් එකේම පිළිතුරු දෙයි"
      onClose={onClose}
      footer={<ActionButton label="විමසීම යවන්න" icon="❓" variant="primary" disabled={(text.trim().length < 3 && !voiceNotes.length) || !vehicleId} onPress={() => onSend({ categoryId, service, vehicleId, text: text.trim(), photos, voiceNotes })} />}
    >
      <View style={styles.garage}>
        <GlassIcon emoji="🛠️" small />
        <View style={styles.flex1}>
          <Text style={styles.title} numberOfLines={1}>
            {garageName}
          </Text>
          <Text style={styles.sub}>මිල / වේලාව / හැකියාව ගැන අසන්න</Text>
        </View>
      </View>

      <Text style={styles.label}>සේවාව</Text>
      <CategoryStrip
        include={(id) => garageSubServices(id).length > 0}
        selectedId={categoryId}
        onSelect={(c) => {
          setCategoryId(c.id);
          setService(undefined);
        }}
      />
      <View style={styles.chips}>
        {garageSubServices(categoryId).map((s) => (
          <Chip key={s} label={s} on={service === s} onPress={() => setService((x) => (x === s ? undefined : s))} small color={cat.color} />
        ))}
      </View>

      <Text style={styles.label}>වාහනය</Text>
      <View style={styles.chips}>
        {vehicles.map((v) => (
          <Chip key={v.id} label={`${v.name} · ${v.plate}`} on={vehicleId === v.id} onPress={() => setVehicleId(v.id)} />
        ))}
      </View>

      <Text style={styles.label}>ඔබට දැන ගැනීමට අවශ්‍ය දේ</Text>
      <TextInput style={styles.input} multiline placeholder="උදා: ඉදිරිපස බ්‍රේක් පෑඩ් මාරු කිරීමට මිල කීයද? හෙට දවසේ කළ හැකිද?" placeholderTextColor={Colors.textMuted} value={text} onChangeText={setText} maxLength={300} accessibilityLabel="Inquiry text" />

      <Text style={styles.label}>ඡායාරූප සහ හඬ සටහන් (විකල්ප)</Text>
      <MediaAttachments photos={photos} voiceNotes={voiceNotes} onPhotos={setPhotos} onVoiceNotes={setVoiceNotes} />
      <Text style={styles.hint}>කැමති නම් චැට් එකෙන්ම “වෙන් කරන්න” ඔබා ඍජුවම වෙන් කර ගන්න.</Text>
    </Sheet>
  );
};

/** The booking form's chip (`color`: sub-services wear their service's colour). */
const Chip: React.FC<{ label: string; on: boolean; onPress: () => void; small?: boolean; color?: string }> = ({ label, on, onPress, small, color }) => (
  <Pressable
    style={[styles.chip, small && styles.chipSmall, on && styles.chipOn, color && { backgroundColor: on ? color : `${color}26`, borderColor: on ? color : `${color}8c` }]}
    onPress={onPress}
    accessibilityState={{ selected: on }}
  >
    <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
  </Pressable>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    garage: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    title: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.4, marginTop: 6 },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    chipSmall: { paddingHorizontal: 9, paddingVertical: 5 },
    chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chipTextOn: { color: '#fff' },
    input: { minHeight: 80, padding: 12, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor, color: Colors.textMain, fontSize: 13, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top' },
  })
);
