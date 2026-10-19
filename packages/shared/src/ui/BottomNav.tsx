import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Colors, getThemeMode, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';

// path: a 24×24 SVG path, filled with the active/idle colour.
// badge: a count on the icon (e.g. requests waiting for an answer); hidden when 0.
// icon: instead of a path, a component drawing the icon itself (e.g. a designer's two-tone artwork);
// it is told whether its tab is active and picks its own colours.
export type NavItem<T extends string> = {
  id: T;
  label: string;
  accessibilityLabel?: string;
  path?: string;
  icon?: React.ComponentType<{ active: boolean; size?: number }>;
  badge?: number;
  /**
   * A light around the icon that says what is going on, so it can be read without opening the tab:
   * 'incoming' a red emergency strobe (new requests waiting for an answer), 'approval' a fast red / amber strobe with a shake (something critical waits for
   * the user's decision right now), 'enroute' a blue radar ring (someone is on the move), 'waiting' a slow amber glow (the user waits for someone else's
   * answer), 'active' a calm green glow (a job is running). `true` means 'incoming'.
   */
  alert?: NavAlert | boolean;
};

export type NavAlert = 'incoming' | 'approval' | 'enroute' | 'waiting' | 'active';

/** The light around a tab icon (see NavItem.alert): one looping clock `t` (0 to 1) drives every variant. */
const AlertIcon: React.FC<{ kind?: NavAlert; children: React.ReactNode }> = ({ kind, children }) => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!kind) return;
    t.setValue(0);
    const duration = { incoming: 1300, approval: 800, enroute: 1600, waiting: 2400, active: 2800 }[kind];
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [kind, t]);
  if (!kind) return <>{children}</>;

  if (kind === 'incoming') {
    // A red beacon that flashes twice in quick strobes, then rests, with a ring that flares out each flash.
    const at = [0, 0.04, 0.16, 0.2, 0.32, 0.36, 0.48, 0.52, 1];
    const lamp = t.interpolate({ inputRange: at, outputRange: [0.1, 1, 1, 0.12, 0.12, 1, 1, 0.1, 0.1] });
    const ringOpacity = t.interpolate({ inputRange: at, outputRange: [0, 0.7, 0.35, 0, 0, 0.7, 0.35, 0, 0] });
    const ring = t.interpolate({ inputRange: at, outputRange: [1, 1, 1.5, 1.6, 1, 1, 1.5, 1.6, 1.6] });
    return (
      <View style={styles.alertWrap}>
        <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ring }] }]} />
        <Animated.View style={[styles.lamp, { opacity: lamp }]} />
        <View>{children}</View>
      </View>
    );
  }

  if (kind === 'approval') {
    // Critical, waiting on the user: four fast flashes that alternate red and amber, a ring flaring out, and the icon shaking and swelling.
    const at = [0, 0.24, 0.25, 0.49, 0.5, 0.74, 0.75, 1];
    const red = t.interpolate({ inputRange: at, outputRange: [1, 1, 0.06, 0.06, 1, 1, 0.06, 0.06] });
    const amber = t.interpolate({ inputRange: at, outputRange: [0.06, 0.06, 1, 1, 0.06, 0.06, 1, 1] });
    const ringScale = t.interpolate({ inputRange: [0, 0.5, 0.5001, 1], outputRange: [1, 2, 1, 2] });
    const ringOpacity = t.interpolate({ inputRange: [0, 0.5, 0.5001, 1], outputRange: [0.9, 0, 0.9, 0] });
    const shake = t.interpolate({ inputRange: [0, 0.08, 0.16, 0.24, 0.32, 0.4, 0.5, 1], outputRange: [0, -3, 3, -3, 3, -2, 0, 0] });
    const swell = t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 1.16, 1, 1.16, 1] });
    return (
      <View style={styles.alertWrap}>
        <Animated.View style={[styles.ring, styles.ringBig, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
        <Animated.View style={[styles.lamp, { opacity: red }]} />
        <Animated.View style={[styles.lamp, styles.lampAmber, { opacity: amber }]} />
        <Animated.View style={{ transform: [{ translateX: shake }, { scale: swell }] }}>{children}</Animated.View>
      </View>
    );
  }

  if (kind === 'enroute') {
    // Someone is on the move: two blue radar rings travelling outward, half a cycle apart.
    const a = t.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
    const aOpacity = t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
    const b = t.interpolate({ inputRange: [0, 0.5, 0.5001, 1], outputRange: [1.6, 2.2, 1, 1.6] });
    const bOpacity = t.interpolate({ inputRange: [0, 0.5, 0.5001, 1], outputRange: [0.3, 0, 0.6, 0.3] });
    return (
      <View style={styles.alertWrap}>
        <Animated.View style={[styles.ring, styles.ringBlue, { opacity: aOpacity, transform: [{ scale: a }] }]} />
        <Animated.View style={[styles.ring, styles.ringBlue, { opacity: bOpacity, transform: [{ scale: b }] }]} />
        <View style={styles.dotBlue} />
        <View>{children}</View>
      </View>
    );
  }

  if (kind === 'waiting') {
    // Waiting for someone else's answer: a slow amber breathing glow with a ring that rises gently.
    const glow = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.1, 0.42, 0.1] });
    const ringScale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
    const ringOpacity = t.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
    return (
      <View style={styles.alertWrap}>
        <Animated.View style={[styles.ring, styles.ringAmber, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
        <Animated.View style={[styles.lamp, styles.lampAmber, { opacity: glow }]} />
        <View>{children}</View>
      </View>
    );
  }

  // 'active': a job is running, nothing is asked: a calm green glow.
  const glow = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.1, 0.3, 0.1] });
  return (
    <View style={styles.alertWrap}>
      <Animated.View style={[styles.lamp, styles.lampGreen, { opacity: glow }]} />
      <View>{children}</View>
    </View>
  );
};

/** The two colours of a two-tone tab icon: the dark "ink" body and the light "accent" details. */
export const navIconTones = (active: boolean) =>
  active
    ? { ink: getThemeMode() === 'dark' ? '#cfe6ff' : '#162b63', accent: '#4ca1d1' }
    : { ink: Colors.textMuted, accent: Colors.subtleBorder };

interface BottomNavProps<T extends string> {
  items: NavItem<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
}


export function BottomNav<T extends string>({ items, activeTab, onTabChange }: BottomNavProps<T>) {
  return (
  <View style={styles.container}>
    {items.map((item) => {
      const color = activeTab === item.id ? (getThemeMode() === 'dark' ? Colors.primary : '#162b63') : Colors.textMuted;
      return (
        <Pressable key={item.id} style={styles.navItem} onPress={() => onTabChange(item.id)} accessibilityRole="tab" accessibilityLabel={item.accessibilityLabel ?? item.label}>
          <View>
            <AlertIcon kind={item.alert === true ? 'incoming' : item.alert || undefined}>
            {item.icon ? (
              <item.icon active={activeTab === item.id} size={26} />
            ) : (
              <Svg width={22} height={22} viewBox="0 0 24 24">
                <Path d={item.path} fill={color} />
              </Svg>
            )}
            </AlertIcon>
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
    borderTopWidth: getThemeMode() === 'dark' ? 1 : 0,
    borderTopColor: Colors.borderColor,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: getThemeMode() === 'dark' ? 0.3 : 0.08,
    shadowRadius: 14,
    elevation: 12,
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  navItem: { alignItems: 'center', gap: 4, width: 70 },
  label: { fontSize: 10.5, fontFamily: FONTS.bodySemiBold },
  alertWrap: { alignItems: 'center', justifyContent: 'center' },
  lamp: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: '#ef4444' },
  lampAmber: { backgroundColor: '#f59e0b' },
  lampGreen: { backgroundColor: '#16a34a' },
  ring: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: '#ef4444' },
  ringBig: { borderWidth: 4, borderColor: '#f59e0b' },
  ringBlue: { borderWidth: 2.5, borderColor: '#2563eb' },
  ringAmber: { borderWidth: 2.5, borderColor: '#f59e0b' },
  dotBlue: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(37, 99, 235, 0.12)' },
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

// ---------- Line icons for the garage, parts shop and technician bars and OnMart's bar ----------
// Plain rounded outlines in the same style as the owner app's bar: the open tab is dark navy with a soft tint inside, the others grey.
type LineIconProps = { active: boolean; size?: number };

const LineFrame: React.FC<LineIconProps & { fill?: string; children: React.ReactNode }> = ({ active, size = 26, fill, children }) => {
  const t = navIconTones(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={t.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {!!fill && <Path d={fill} fill={active ? t.accent : 'none'} fillOpacity={0.28} stroke="none" />}
      {children}
    </Svg>
  );
};

export const ShopLineIcon: React.FC<LineIconProps> = (p) => (
  <LineFrame {...p} fill="M4 10h16v10H4z">
    <Path d="M3.5 9.5L5 4h14l1.5 5.5" />
    <Path d="M3.5 9.5a2.8 2.8 0 005.5 0 2.8 2.8 0 006 0 2.8 2.8 0 005.5 0" />
    <Path d="M5 11v9h14v-9" />
    <Path d="M10 20v-5h4v5" />
  </LineFrame>
);
export const RequestLineIcon: React.FC<LineIconProps> = (p) => (
  <LineFrame {...p} fill="M6 3h8l5 5v13H6z">
    <Path d="M6 3h8l5 5v13H6z" />
    <Path d="M14 3v5h5" />
    <Path d="M9.5 13h6M9.5 17h4" />
  </LineFrame>
);
export const WallLineIcon: React.FC<LineIconProps> = (p) => (
  <LineFrame {...p} fill="M4 10v4h3.5L14 18V6L7.5 10z">
    <Path d="M4 10v4h3.5L14 18V6L7.5 10z" />
    <Path d="M17 9.5a3.5 3.5 0 010 5" />
    <Path d="M7.5 14l1 5h2.5l-.8-4.2" />
  </LineFrame>
);
export const OrdersLineIcon: React.FC<LineIconProps> = (p) => (
  <LineFrame {...p} fill="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z">
    <Path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
    <Path d="M3.5 7.5L12 12l8.5-4.5" />
    <Path d="M12 12v9" />
  </LineFrame>
);
export const JobsLineIcon: React.FC<LineIconProps> = (p) => (
  <LineFrame {...p} fill="M3 8h18v12H3z">
    <Path d="M3 8h18v12H3z" />
    <Path d="M9 8V5h6v3" />
    <Path d="M3 13h18" />
    <Path d="M10.5 13v2h3v-2" />
  </LineFrame>
);
export const SosLineIcon: React.FC<LineIconProps> = (p) => (
  <LineFrame {...p}>
    <Circle cx={12} cy={12} r={9} />
    <Circle cx={12} cy={12} r={3.8} />
    <Path d="M5.6 5.6l3.7 3.7M14.7 14.7l3.7 3.7M18.4 5.6l-3.7 3.7M9.3 14.7l-3.7 3.7" />
  </LineFrame>
);
export const ScheduleLineIcon: React.FC<LineIconProps> = (p) => (
  <LineFrame {...p} fill="M4 6h16v14H4z">
    <Path d="M4 6h16v14H4z" />
    <Path d="M4 10.5h16" />
    <Path d="M8 3.5v4M16 3.5v4" />
    <Path d="M8 14h2M14 14h2M8 17h2" />
  </LineFrame>
);
export const GarageLineIcon: React.FC<LineIconProps> = (p) => (
  <LineFrame {...p} fill="M5 10l7-5 7 5v10H5z">
    <Path d="M3 11l9-7 9 7" />
    <Path d="M5 10v10h14V10" />
    <Path d="M8 20v-6h8v6" />
    <Path d="M8 17h8" />
  </LineFrame>
);
export const ProfileLineIcon: React.FC<LineIconProps> = (p) => (
  <LineFrame {...p}>
    <Circle cx={12} cy={8} r={4} />
    <Path d="M4.5 21c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
  </LineFrame>
);
export const EarningsLineIcon: React.FC<LineIconProps> = (p) => (
  <LineFrame {...p}>
    <Circle cx={12} cy={12} r={9} />
    <Path d="M12 6.5v11" />
    <Path d="M14.8 9.3c-.5-.9-1.5-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2 0 1.3 1.2 1.7 2.8 2.1 1.6.4 2.8.8 2.8 2.1 0 1.2-1.2 2-2.8 2-1.3 0-2.4-.6-2.9-1.5" />
  </LineFrame>
);
export const StockLineIcon: React.FC<LineIconProps> = (p) => (
  <LineFrame {...p} fill="M12 3.5l8.5 4.3L12 12 3.5 7.8z">
    <Path d="M12 3.5l8.5 4.3L12 12 3.5 7.8z" />
    <Path d="M3.5 12L12 16.3 20.5 12" />
    <Path d="M3.5 16.2L12 20.5l8.5-4.3" />
  </LineFrame>
);
