import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Colors, themedStyles } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { ActionButton } from '../Glass';
import { Sheet } from '../Sheet';
import { PhotoStrip } from '../PhotoStrip';

/**
 * Vehicle received (at the garage, or at the owner's door): photos of its condition
 * before any work. They protect both sides if there's a dispute later, and guarantee
 * claims need them.
 */
export const CheckInSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  overlay?: React.ReactNode;
  subject: { title: string; vehicle: string };
  doorstep: boolean;
  samplePhotos: string[];
  onConfirm: (photos: string[]) => void;
}> = ({ visible, onClose, overlay, subject, doorstep, samplePhotos, onConfirm }) => {
  const [photos, setPhotos] = useState<string[]>([]);
  useEffect(() => {
    if (visible) setPhotos([]);
  }, [visible]);

  return (
    <Sheet
      visible={visible}
      title={doorstep ? 'අයිතිකරු වෙත පැමිණියා' : 'වාහනය ලැබුණා'}
      subtitle={`${subject.title} · ${subject.vehicle}`}
      onClose={onClose}
      overlay={overlay}
      footer={
        <ActionButton
          label="ලැබුණු බව තහවුරු කර පරීක්ෂාව අරඹන්න"
          icon="✓"
          variant="primary"
          disabled={photos.length < 2}
          onPress={() => {
            onConfirm(photos);
            onClose();
          }}
        />
      }
    >
      <Text style={styles.label}>වාහනයේ තත්ත්වය — අවම ඡායාරූප 2ක් (ඉදිරිපස, පසුපස / හානි)</Text>
      <PhotoStrip photos={photos} height={90} onAdd={photos.length < 6 ? () => setPhotos((p) => [...p, samplePhotos[p.length % samplePhotos.length]]) : undefined} addLabel="ඡායාරූපයක්" />
      <Text style={styles.hint}>මෙම ඡායාරූප අයිතිකරුටද පෙනේ. පසුව ගැටලුවක් ඇති වුවහොත් ඔබ දෙපාර්ශ්වයම ආරක්ෂා කරයි, සහ OnGarage Guarantee ඉල්ලීම් සඳහා අවශ්‍යයි.</Text>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    label: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    hint: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 16 },
  })
);
