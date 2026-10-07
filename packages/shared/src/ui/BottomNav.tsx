import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';

// path: a 24×24 SVG path, filled with the active/idle colour.
// badge: a count on the icon (e.g. requests waiting for an answer); hidden when 0.
// icon: instead of a path, a component drawing the icon itself (e.g. a designer's two-tone artwork);
// it is told whether its tab is active and picks its own colours.
export type NavItem<T extends string> = {
  id: T;
  label: string;
  path?: string;
  icon?: React.ComponentType<{ active: boolean; size?: number }>;
  badge?: number;
};

interface BottomNavProps<T extends string> {
  items: NavItem<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
}


export function BottomNav<T extends string>({ items, activeTab, onTabChange }: BottomNavProps<T>) {
  return (
  <View style={styles.container}>
    {items.map((item) => {
      const color = activeTab === item.id ? Colors.primary : Colors.textMuted;
      return (
        <Pressable key={item.id} style={styles.navItem} onPress={() => onTabChange(item.id)}>
          <View>
            {item.icon ? (
              <item.icon active={activeTab === item.id} size={26} />
            ) : (
              <Svg width={22} height={22} viewBox="0 0 24 24">
                <Path d={item.path} fill={color} />
              </Svg>
            )}
            {!!item.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.label, { color }]}>{item.label}</Text>
        </Pressable>
      );
    })}
  </View>
  );
}

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
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.barBg,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
}));
