import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { vehicleIcon } from '../constants/vehicles';
import { FONTS } from '../theme/fonts';
import { themedStyles } from '../theme/colors';

/** "CAD-8821" or "WP KV 4412" -> its letters and its digits. */
const parts = (plate: string) => {
  const clean = plate.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  const digits = clean.match(/[0-9]+$/)?.[0] ?? '';
  const letters = clean.slice(0, clean.length - digits.length).trim();
  return { letters, digits };
};

/**
 * A vehicle number plate drawn like a Sri Lankan one: a yellow plate with a black rim and bold
 * black lettering, the letters and the digits split by a dash. Motorbikes carry the two-line
 * plate: letters above, digits below.
 */
export const LkPlate: React.FC<{ plate: string; stacked?: boolean; small?: boolean; fontSize?: number }> = ({ plate, stacked, small, fontSize }) => {
  const { letters, digits } = parts(plate);
  // An explicit size (taken as is, not scaled) lets a plate match the text beside it.
  const text = [small ? styles.textSmall : styles.text, fontSize ? { fontSize, lineHeight: Math.round(fontSize * 1.25) } : null];
  return (
    <View style={[styles.plate, small && styles.plateSmall]} accessibilityLabel={'Number plate ' + plate}>
      <View style={[styles.rim, small && styles.rimSmall]}>
        {stacked || !letters || !digits ? (
          <>
            {!!letters && <Text style={text}>{letters}</Text>}
            {!!digits && <Text style={text}>{digits}</Text>}
            {!letters && !digits && <Text style={text}>{plate}</Text>}
          </>
        ) : (
          <View style={styles.line}>
            <Text style={text}>{letters}</Text>
            <Text style={[text, styles.dash]}>-</Text>
            <Text style={text}>{digits}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    // The plate itself: yellow, with a thin dark edge.
    plate: { alignSelf: 'flex-start', padding: 3, borderRadius: 9, backgroundColor: '#fdd835' },
    plateSmall: { padding: 0, borderRadius: 5 },
    // The black rim inside it.
    rim: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6, borderWidth: 2.5, borderColor: '#111111' },
    rimSmall: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 2 },
    line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    text: { fontSize: 30, fontFamily: FONTS.titleBold, fontWeight: '900', color: '#111111', letterSpacing: 3, lineHeight: 36 },
    textSmall: { fontSize: 12.5, fontFamily: FONTS.titleBold, fontWeight: '900', color: '#111111', letterSpacing: 1.2, lineHeight: 16 },
    dash: { letterSpacing: 0 },
  })
);

/**
 * A vehicle in one place: its icon and name (the text style is the caller's own, so it fits
 * its card) with its number plate under it. `extra` goes after the model (a customer, a date…).
 */
export const VehicleLine: React.FC<{
  vehicle: { name: string; plate: string; type: string; make?: string; model?: string; registrationNo?: string };
  textStyle?: StyleProp<TextStyle>;
  extra?: string;
}> = ({ vehicle: v, textStyle, extra }) => (
  <View style={vehicleLineStyle}>
    <Text style={textStyle}>
      {vehicleIcon(v.type)} {v.name}
      {extra ? ' · ' + extra : ''}
    </Text>
    <LkPlate plate={v.registrationNo || v.plate} stacked={v.type === 'Motorbike'} small />
  </View>
);

const vehicleLineStyle = { gap: 4, flexShrink: 1, alignItems: 'flex-start' } as const;
