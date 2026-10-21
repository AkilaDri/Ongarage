import { VehicleLabel } from '@ongarage/shared';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, Colors, FONTS, getThemeMode, PhotoStrip, pickPhotos, SERVICE_CATEGORIES, themedStyles, vehicleIcon } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { Sheet } from './Sheet';

export type InquiryInput = { categoryId: string; service?: string; vehicleId: string; text: string; photos: string[] };

/**
 * An inquiry to a garage before booking it: which service, which vehicle, what the owner wants to know (a price, a time, whether they can do it) and photos. It goes into the
 * chat with the garage, which answers there; the owner can then book the garage directly from the same chat.
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

  useEffect(() => {
    if (!visible) return;
    setCategoryId(initialCategory ?? '1');
    setService(undefined);
    setVehicleId(defaultVehicleId ?? vehicles[0]?.id ?? '');
    setText('');
    setPhotos([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const cat = SERVICE_CATEGORIES.find((c) => c.id === categoryId);

  return (
    <Sheet
      visible={visible}
      title="විමසීමක් යවන්න"
      subtitle={`${garageName} ගෙන් මිල / වේලාව / හැකියාව ගැන අසන්න`}
      onClose={onClose}
      footer={<ActionButton label="විමසීම යවන්න" icon="❓" variant="primary" disabled={text.trim().length < 3 || !vehicleId} onPress={() => onSend({ categoryId, service, vehicleId, text: text.trim(), photos })} />}
    >
      <Text style={styles.label}>සේවාව</Text>
      <View style={styles.chips}>
        {SERVICE_CATEGORIES.map((c) => (
          <Pressable key={c.id} style={[styles.chip, categoryId === c.id && styles.chipOn]} onPress={() => { setCategoryId(c.id); setService(undefined); }} accessibilityLabel={`Service ${c.name}`} accessibilityState={{ selected: categoryId === c.id }}>
            <Text style={[styles.chipText, categoryId === c.id && styles.chipTextOn]}>{c.icon} {c.name}</Text>
          </Pressable>
        ))}
      </View>
      {!!cat?.subcategories.length && (
        <View style={styles.chips}>
          {cat.subcategories.map((s) => (
            <Pressable key={s} style={[styles.chip, service === s && styles.chipOn]} onPress={() => setService((x) => (x === s ? undefined : s))} accessibilityLabel={`Sub-service ${s}`} accessibilityState={{ selected: service === s }}>
              <Text style={[styles.chipText, service === s && styles.chipTextOn]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.label}>වාහනය</Text>
      <View style={styles.chips}>
        {vehicles.map((v) => (
          <Pressable key={v.id} style={[styles.chip, vehicleId === v.id && styles.chipOn]} onPress={() => setVehicleId(v.id)} accessibilityLabel={`Vehicle ${v.name}`} accessibilityState={{ selected: vehicleId === v.id }}>
            <VehicleLabel type={v.type} style={[styles.chipText, vehicleId === v.id && styles.chipTextOn]}>{v.name}</VehicleLabel>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>ඔබට දැන ගැනීමට අවශ්‍ය දේ</Text>
      <TextInput style={styles.input} multiline placeholder="උදා: ඉදිරිපස බ්‍රේක් පෑඩ් මාරු කිරීමට මිල කීයද? හෙට දවසේ කළ හැකිද?" placeholderTextColor={Colors.textMuted} value={text} onChangeText={setText} maxLength={300} accessibilityLabel="Inquiry text" />
      <PhotoStrip photos={photos} height={70} onAdd={photos.length < 4 ? () => void pickPhotos(4 - photos.length).then((ph) => ph.length && setPhotos((p) => [...p, ...ph])) : undefined} addLabel="ඡායාරූපයක්" />
      <Text style={styles.hint}>ගරාජය චැට් එකේම පිළිතුරු දෙයි. කැමති නම් එම චැට් එකෙන්ම “වෙන් කරන්න” ඔබා ඍජුවම වෙන් කර ගන්න.</Text>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    label: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 4 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard },
    chipOn: { borderColor: Colors.primary, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    chipText: { fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    chipTextOn: { color: Colors.primary, fontFamily: FONTS.bodyBold },
    input: { minHeight: 90, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderColor, backgroundColor: Colors.bgCard, color: Colors.textMain, fontSize: 13.5, fontFamily: FONTS.bodyRegular, textAlignVertical: 'top' },
    hint: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
  })
);
