import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { homeTopStyles as hs } from '../home/HomeTop';

/** OnMart's two actions, drawn as Home's action card (the same card, rows and discs): ask for a part first, then the rare-part wall. */
export const MartActions: React.FC<{ onAsk: () => void; onWall: () => void }> = ({ onAsk, onWall }) => (
  <View style={hs.card}>
    <Pressable style={({ pressed }) => [hs.jobBtn, pressed && hs.pressed]} onPress={onAsk} accessibilityLabel="Ask for a part">
      <View style={hs.jobCircle}>
        <Text style={hs.jobCircleText}>+</Text>
      </View>
      <View style={hs.rowText}>
        <Text style={hs.btnTitle} numberOfLines={1}>Part <Text style={hs.sinhala}>එකක් ඕනෙද?</Text></Text>
        <Text style={hs.btnSub} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>ළඟ වෙළඳසැල්වලින් මිල ගන්න</Text>
      </View>
    </Pressable>
    {/* Purple keeps the wall's own colour; red stays for SOS only. */}
    <Pressable style={({ pressed }) => [hs.jobBtn, s.wallBtn, pressed && hs.pressed]} onPress={onWall} accessibilityLabel="Open wall shortcut">
      <View style={[hs.jobCircle, s.wallCircle]}>
        <Text style={s.wallIcon}>📣</Text>
      </View>
      <View style={hs.rowText}>
        <Text style={hs.btnTitle} numberOfLines={1}><Text style={hs.sinhala}>දුර්ලභ </Text>Part <Text style={hs.sinhala}>එකක්ද?</Text></Text>
        <Text style={hs.btnSub} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>ලංකාව පුරා අසන්න</Text>
      </View>
    </Pressable>
  </View>
);

const s = StyleSheet.create({
  wallBtn: { borderColor: 'rgba(237, 233, 254, 0.9)', backgroundColor: '#f5f3ff' },
  wallCircle: { backgroundColor: '#ede9fe', borderColor: '#ddd6fe' },
  wallIcon: { fontSize: 24 },
});
