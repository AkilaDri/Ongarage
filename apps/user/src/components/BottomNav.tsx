import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors, themedStyles } from '@ongarage/shared';
import { FONTS } from '@ongarage/shared';

export type TabId = 'home' | 'bids' | 'activity' | 'profile';

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const NAV_ITEMS: { id: TabId; label: string; path: string }[] = [
  { id: 'home', label: 'මුල් පිටුව', path: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
  {
    id: 'bids',
    label: 'ලංසු',
    path: 'M2.5 19h19v2h-19zm19.57-9.36c-.21-.8-1.04-1.28-1.84-1.06L14.92 10l-6.9-3.45-2.07 1.04 5.34 2.67-3.17 1.58-2.61-1.31-1.86.93L7.5 15.5l14.07-5.06c.8-.22 1.28-1.05 1.06-1.8m-3.9 1.95l-9.15 3.29-.68-1.37 9.15-3.29.68 1.37z',
  },
  {
    id: 'activity',
    label: 'ක්‍රියාකාරකම්',
    path: 'M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
  },
  {
    id: 'profile',
    label: 'පැතිකඩ',
    path: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => (
  <View style={styles.container}>
    {NAV_ITEMS.map((item) => {
      const color = activeTab === item.id ? Colors.primary : Colors.textMuted;
      return (
        <Pressable key={item.id} style={styles.navItem} onPress={() => onTabChange(item.id)}>
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path d={item.path} fill={color} />
          </Svg>
          <Text style={[styles.label, { color }]}>{item.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = themedStyles(() => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 72,
    backgroundColor: Colors.barBg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderColor,
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  navItem: { alignItems: 'center', gap: 4, width: 70 },
  label: { fontSize: 10.5, fontFamily: FONTS.bodyMedium },
}));
