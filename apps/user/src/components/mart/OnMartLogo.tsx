import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** A temporary text logo for OnMart in the OnGarage style (navy, white "on", a yellow edge and initial), until the real artwork exists. */
export const OnMartLogo: React.FC = () => (
  <View style={s.pill} accessibilityRole="image" accessibilityLabel="OnMart">
    <Text style={s.on}>on</Text>
    <Text style={s.mart}>Mart</Text>
  </View>
);

// Plain styles: a logo is never reshaped or rescaled by the theme.
const s = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', height: 32, paddingHorizontal: 14, borderRadius: 16, borderWidth: 2, borderColor: '#facc15', backgroundColor: '#003089' },
  on: { fontSize: 17, lineHeight: 22, fontFamily: 'Inter_700Bold', color: '#ffffff' },
  mart: { fontSize: 17, lineHeight: 22, fontFamily: 'Inter_700Bold', color: '#facc15' },
});
