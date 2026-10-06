import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { ActionButton, Colors, FONTS, PhotoStrip, themedStyles } from '@ongarage/shared';
import { useWorkshops, type OwnerWorkshop } from '../../context/WorkshopContext';
import { SAMPLE_UPLOAD_PHOTOS } from '../../constants/mockData';
import { formatDate } from '../../utils/format';
import { Sheet } from '../Sheet';

/** The same fault came back within the warranty: ask the garage to fix it free. */
export const WarrantySheet: React.FC<{ workshop: OwnerWorkshop | null; onClose: () => void }> = ({ workshop, onClose }) => {
  const { claimWarranty } = useWorkshops();
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!workshop) return;
    setText('');
    setPhotos([]);
  }, [workshop?.id, workshop]);

  const until = workshop?.progress.warrantyUntil;
  return (
    <Sheet
      visible={!!workshop}
      title="වගකීම් ඉල්ලීම"
      subtitle={workshop && until ? `${workshop.garageName} · ${formatDate(until)} දක්වා වලංගුයි` : undefined}
      onClose={onClose}
      footer={
        <ActionButton
          label="ගරාජයට යවන්න"
          icon="🛡️"
          variant="primary"
          disabled={text.trim().length < 5}
          onPress={() => {
            if (workshop) claimWarranty(workshop.id, text.trim(), photos.length ? photos : undefined);
            onClose();
          }}
        />
      }
    >
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="නැවත ආපු ගැටලුව කියන්න (උදා: බ්‍රේක් සද්දය ආයෙත් එනවා)"
        placeholderTextColor={Colors.textMuted}
        multiline
        accessibilityLabel="Warranty claim description"
      />
      <PhotoStrip photos={photos} height={70} onAdd={photos.length < 4 ? () => setPhotos((p) => [...p, SAMPLE_UPLOAD_PHOTOS[p.length % SAMPLE_UPLOAD_PHOTOS.length]]) : undefined} />
      <Text style={styles.hint}>වගකීම ආවරණය කරන්නේ එම රැකියාවේ කළ වැඩ සහ සවි කළ කොටස් පමණි. ගරාජය ප්‍රතික්ෂේප කළොත් OnGarage කණ්ඩායම සලකා බලයි.</Text>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    input: {
      minHeight: 84,
      padding: 12,
      borderRadius: 14,
      backgroundColor: Colors.bgCard,
      borderWidth: 1,
      borderColor: Colors.borderColor,
      color: Colors.textMain,
      fontSize: 12.5,
      fontFamily: FONTS.bodyRegular,
      textAlignVertical: 'top',
    },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
  })
);
