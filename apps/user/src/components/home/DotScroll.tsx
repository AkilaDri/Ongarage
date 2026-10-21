import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Colors, themedStyles } from '@ongarage/shared';

/**
 * A sideways-scrolling row with dots under it that show where you are in it: one dot for each screenful of the row, the one in view drawn long
 * and in the app's blue. No dots when everything already fits.
 */
export const DotScroll: React.FC<{ contentContainerStyle?: StyleProp<ViewStyle>; children: React.ReactNode }> = ({ contentContainerStyle, children }) => {
  const [viewW, setViewW] = useState(0);
  const [contentW, setContentW] = useState(0);
  const [x, setX] = useState(0);
  const pages = viewW > 0 ? Math.min(8, Math.max(1, Math.ceil((contentW - 4) / viewW))) : 1;
  const maxX = Math.max(1, contentW - viewW);
  // The page in view follows how far along the row you are, so the last dot lights when the end is reached.
  const page = pages <= 1 ? 0 : Math.min(pages - 1, Math.round((x / maxX) * (pages - 1)));

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
        onLayout={(e) => setViewW(e.nativeEvent.layout.width)}
        onContentSizeChange={(w) => setContentW(w)}
        onScroll={(e) => setX(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={32}
      >
        {children}
      </ScrollView>
      {pages > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {Array.from({ length: pages }, (_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { gap: 8 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.subtleBorder },
    dotOn: { width: 16, backgroundColor: Colors.primary },
  })
);
