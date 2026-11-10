import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, themedStyles, type Project } from '@ongarage/shared';
import { GARAGE_DIRECTORY, type DirectoryGarage } from '../../constants/garageDirectory';

/**
 * Every garage from the Sri Lanka list, always on the map. They are not on OnGarage yet, so the pins are plain:
 * a tap shows the garage's name, kind and number, and says it will be added soon.
 */
export const DirectoryPins: React.FC<{ project: Project }> = ({ project }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const open: DirectoryGarage | undefined = GARAGE_DIRECTORY.find((g) => g.id === openId);
  const openAt = open ? project(open.coords) : null;

  return (
    <>
      {GARAGE_DIRECTORY.map((g) => {
        const p = project(g.coords);
        if (!p) return null;
        const on = g.id === openId;
        return (
          <Pressable
            key={g.id}
            style={[styles.anchor, { left: p.x, top: p.y }]}
            onPress={() => setOpenId(on ? null : g.id)}
            accessibilityLabel={`Garage ${g.name}`}
          >
            <View style={[styles.pin, on && styles.pinOn]}>
              <Text style={styles.emoji}>🛠️</Text>
            </View>
          </Pressable>
        );
      })}

      {open && openAt && (
        <View style={[styles.callout, { left: openAt.x, top: openAt.y }]} pointerEvents="box-none">
          <View style={styles.bubble}>
            <Text style={styles.name} numberOfLines={2}>{open.name}</Text>
            <Text style={styles.sub} numberOfLines={1}>{open.category}</Text>
            <Text style={styles.note}>OnGarage ලියාපදිංචි නැත · ඉක්මනින් එකතු වේ</Text>
            {!!open.phones[0] && (
              <Pressable style={styles.call} onPress={() => Linking.openURL(`tel:${open.phones[0].replace(/\s/g, '')}`)} accessibilityLabel={`Call ${open.name}`}>
                <Text style={styles.callText}>📞 {open.phones[0]}</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    anchor: { position: 'absolute', width: 0, height: 0 },
    pin: { position: 'absolute', left: -12, top: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1.5, borderColor: Colors.subtleBorder, alignItems: 'center', justifyContent: 'center', elevation: 2 },
    pinOn: { borderColor: '#1d367f', borderWidth: 2 },
    emoji: { fontSize: 11 },
    callout: { position: 'absolute', width: 0, height: 0 },
    bubble: { position: 'absolute', left: -110, top: -150, width: 220, padding: 10, borderRadius: 14, backgroundColor: Colors.bgCard, gap: 3, elevation: 4 },
    name: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    note: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, marginTop: 2 },
    call: { marginTop: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: Colors.subtleFill },
    callText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
  })
);
