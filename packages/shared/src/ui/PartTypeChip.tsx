import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getThemeMode, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';

/** What kind of part a shop offers: Genuine and OEM are new (the maker's own, or made to its standard), Recon is used and reconditioned. */
export const PART_CONDITION: Record<string, { label: string; note: string }> = {
  Genuine: { label: 'Genuine', note: 'අලුත් · මුල් නිෂ්පාදකයාගේ' },
  OEM: { label: 'OEM', note: 'අලුත් · එම තත්ත්වයටම' },
  Recon: { label: 'Recon', note: 'පාවිච්චි කළ · නැවත සකස් කළ' },
};

/** The part types of a list of shop answers, once each, in the usual order (Genuine, OEM, Recon). */
export const partTypesOf = (types: (string | undefined)[]): string[] => ['Genuine', 'OEM', 'Recon'].filter((t) => types.includes(t));

/**
 * The condition of an offered part as a small coloured tag, so that a buyer can tell a new Genuine or OEM part from a reconditioned one at a glance: "Genuine · අලුත්",
 * "OEM · අලුත්", "Recon · පාවිච්චි". With a brand it reads "OEM · අලුත් · Bosch".
 */
export const PartTypeChip: React.FC<{ type?: string; brand?: string; compact?: boolean }> = ({ type, brand, compact }) => {
  const c = type ? PART_CONDITION[type] : undefined;
  if (!c) return null;
  const dark = getThemeMode() === 'dark';
  const tone =
    type === 'Recon'
      ? { bg: dark ? 'rgba(253, 214, 99, 0.16)' : '#fef7e0', fg: dark ? '#fdd663' : '#b06000' }
      : type === 'OEM'
        ? { bg: dark ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', fg: dark ? '#8db1ff' : '#1a73e8' }
        : { bg: dark ? 'rgba(129, 201, 149, 0.16)' : '#e6f4ea', fg: dark ? '#81c995' : '#188038' };
  const short = type === 'Recon' ? 'පාවිච්චි' : 'අලුත්';
  return (
    <View style={[styles.chip, { backgroundColor: tone.bg }]} accessibilityLabel={`${c.label} ${c.note}`}>
      <Text style={[styles.text, { color: tone.fg }]} numberOfLines={1}>
        {compact ? `${c.label} · ${short}` : `${c.label} · ${c.note}`}
        {brand ? ` · ${brand}` : ''}
      </Text>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    chip: { alignSelf: 'flex-start', paddingHorizontal: 8, height: 20, justifyContent: 'center', borderRadius: 8 },
    text: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold },
  })
);
