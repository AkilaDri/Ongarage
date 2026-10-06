import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';

/**
 * A row of photos (check-in, diagnosis, handover, claim evidence) that open full screen.
 * `onAdd` shows an "add photo" tile; picking from the camera comes with the back end,
 * so the apps add a stand-in photo for now.
 */
export const PhotoStrip: React.FC<{ photos: string[]; height?: number; onAdd?: () => void; addLabel?: string; emptyText?: string }> = ({
  photos,
  height = 96,
  onAdd,
  addLabel = 'ඡායාරූපයක්',
  emptyText,
}) => {
  const [open, setOpen] = useState<number | null>(null);
  const w = Math.round(height * 1.35);

  if (!photos.length && !onAdd) return emptyText ? <Text style={styles.empty}>{emptyText}</Text> : null;

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {photos.map((uri, i) => (
          <Pressable key={uri + i} onPress={() => setOpen(i)} accessibilityLabel={`Photo ${i + 1}`}>
            <Image source={{ uri }} style={[styles.photo, { width: w, height }]} resizeMode="cover" />
          </Pressable>
        ))}
        {onAdd && (
          <Pressable style={({ pressed }) => [styles.add, { width: w, height }, pressed && { opacity: 0.7 }]} onPress={onAdd} accessibilityLabel="Add photo">
            <Text style={styles.addIcon}>📷</Text>
            <Text style={styles.addText}>+ {addLabel}</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <View style={styles.lightbox}>
          {open !== null && <Image source={{ uri: photos[open] }} style={styles.full} resizeMode="contain" />}
          <Pressable style={styles.close} onPress={() => setOpen(null)} accessibilityLabel="Close photo">
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          {photos.length > 1 && open !== null && (
            <View style={styles.nav}>
              <Pressable style={styles.navBtn} onPress={() => setOpen((open + photos.length - 1) % photos.length)}>
                <Text style={styles.closeText}>‹</Text>
              </Pressable>
              <Text style={styles.count}>
                {open + 1}/{photos.length}
              </Text>
              <Pressable style={styles.navBtn} onPress={() => setOpen((open + 1) % photos.length)}>
                <Text style={styles.closeText}>›</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    row: { gap: 8 },
    photo: { borderRadius: 12, backgroundColor: Colors.subtleFill },
    add: { borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.subtleBorder, justifyContent: 'center', alignItems: 'center', gap: 4 },
    addIcon: { fontSize: 20 },
    addText: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    empty: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    // The viewer is always dark, like a photo app.
    lightbox: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.94)', justifyContent: 'center' },
    full: { width: '100%', height: '80%' },
    close: { position: 'absolute', top: 48, right: 18, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center' },
    closeText: { fontSize: 18, color: '#fff', fontWeight: '700' },
    nav: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 },
    navBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center' },
    count: { fontSize: 13, fontWeight: '800', color: '#fff' },
  })
);
