import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getThemeMode, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { headerBand } from './Glass';

// The owner app's tab title band: replaces the greeting header on Jobs, Schedule and Parts.
export const TitleBand: React.FC<{ title: string }> = ({ title }) => (
  <View style={styles.band}>
    <Text style={styles.text} accessibilityRole="header">
      {title}
    </Text>
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    band: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 34, backgroundColor: headerBand().bg },
    text: { fontSize: 20, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#d6eefc' : '#0f2a3d' },
  })
);
