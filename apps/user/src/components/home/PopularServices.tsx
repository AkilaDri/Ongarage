import { elevation1, outline } from '../../utils/material';
import { CategoryPhoto } from './CategoryPhoto';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, POPULAR_SERVICES, SERVICE_CATEGORIES, SUGGESTION_ROTATE_MS, suggestedNow, themedStyles, type ServiceCategory } from '@ongarage/shared';

/** How many suggestions are on screen at once; the rest of the list takes its turn. */
const SIZE = 8;
/** How far the row travels sideways as one set leaves and the next arrives. */
const SLIDE = 140;

/**
 * Suggestions, not categories: the specific jobs most owners ask for (an oil change, wheel alignment, a body wash ...) as chips of their own above the
 * ad banners. One touch opens the garages for that job's category with the job already picked, so the owner does not have to search for it.
 * Each chip takes the colour of its service's category (a soft tint of it, with a border in the same colour), so the jobs are told apart at a glance.
 * The set changes by itself every few seconds (a short fade between sets), so over time the owner sees every suggested job.
 */
export const PopularServices: React.FC<{ onSelect: (c: ServiceCategory, sub?: string) => void }> = ({ onSelect }) => {
  const [shown, setShown] = useState(() => suggestedNow(POPULAR_SERVICES, SIZE));
  // 1 = the row is in place; the row slides out to the left (to 0) and the next set slides in from the right.
  const slide = useRef(new Animated.Value(1)).current;
  const scroller = useRef<ScrollView>(null);
  useEffect(() => {
    const id = setInterval(() => {
      // The current set slides out to the left and fades, the next set comes in from the right (sideways, like the row being swiped on).
      Animated.timing(slide, { toValue: 0, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start(() => {
        setShown(suggestedNow(POPULAR_SERVICES, SIZE));
        scroller.current?.scrollTo({ x: 0, animated: false });
        slide.setValue(2);
        Animated.timing(slide, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      });
    }, SUGGESTION_ROTATE_MS);
    return () => clearInterval(id);
  }, [slide]);
  return (
    <View style={styles.wrap}>
      <View style={styles.rowClip}>
      <Animated.View style={{ opacity: slide.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }), transform: [{ translateX: slide.interpolate({ inputRange: [0, 1, 2], outputRange: [-SLIDE, 0, SLIDE] }) }] }}>
      <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {shown.map((x) => {
          const c = SERVICE_CATEGORIES.find((k) => k.id === x.categoryId);
          return c ? (
            <Pressable key={x.sub} style={({ pressed }) => [styles.chip, { backgroundColor: c.color + '26', borderColor: c.color + '8c' }, pressed && styles.pressed]} onPress={() => onSelect(c, x.sub)} accessibilityLabel={`Suggested service ${x.sub}`}>
              {/* The main category's own artwork (the same picture as its tile above), not an emoji for the job. */}
              <CategoryPhoto categoryId={c.id} size={22} />
              <Text style={styles.label} numberOfLines={1}>
                {x.sub}
              </Text>
            </Pressable>
          ) : null;
        })}
      </ScrollView>
      </Animated.View>
      </View>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 14 },
    // The chips slide sideways; this clips them to the row.
    rowClip: { flex: 1, overflow: 'hidden' },
    row: { gap: 8, paddingRight: 16 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 8, paddingRight: 11, height: 34, borderRadius: 17, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard, ...elevation1() },
    pressed: { opacity: 0.75, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    label: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
  })
);
