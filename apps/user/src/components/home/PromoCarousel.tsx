import React, { useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, themedStyles } from '@ongarage/shared';
import type { PromoBanner } from '../../constants/home';

const GAP = 10;

/** Large ad banners that page sideways, the next one peeking in; always labelled as ads. */
export const PromoCarousel: React.FC<{ banners: PromoBanner[]; onOpen: (b: PromoBanner) => void }> = ({ banners, onOpen }) => {
  // Measured, so the card fits the Home column on any screen; the next banner peeks in.
  const [width, setWidth] = useState(0);
  const cardW = Math.max(0, width - 28);
  const [page, setPage] = useState(0);

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardW + GAP}
        decelerationRate="fast"
        contentContainerStyle={{ gap: GAP, paddingRight: 28 }}
        onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / (cardW + GAP)))}
        scrollEventThrottle={32}
      >
        {banners.map((b) => (
          <Pressable key={b.id} onPress={() => onOpen(b)} accessibilityLabel={`Promo ${b.title}`}>
            <ImageBackground source={b.image} style={[styles.banner, { width: cardW }]} imageStyle={styles.image}>
              <View style={styles.shade} />
              <View style={styles.adPill}>
                <Text style={styles.adText}>දැන්වීම</Text>
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>{b.title}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {b.subtitle}
                </Text>
                <View style={styles.cta}>
                  <Text style={styles.ctaText}>{b.cta} ›</Text>
                </View>
              </View>
            </ImageBackground>
          </Pressable>
        ))}
      </ScrollView>
      )}
      <View style={styles.dots}>
        {banners.map((b, i) => (
          <View key={b.id} style={[styles.dot, i === page && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
};

// White text sits on the photo's dark shade (a fixed-colour overlay, not a theme surface).
const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { gap: 8 },
    banner: { height: 150, justifyContent: 'flex-end' },
    image: { borderRadius: 18 },
    shade: { ...StyleSheet.absoluteFill, borderRadius: 18, backgroundColor: 'rgba(2, 6, 23, 0.45)' },
    adPill: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(255, 255, 255, 0.85)' },
    adText: { fontSize: 9.5, fontWeight: '800', color: '#0f172a' },
    copy: { padding: 14, gap: 2 },
    title: { fontSize: 17, fontFamily: FONTS.titleBold, color: '#fff' },
    subtitle: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: '#e2e8f0' },
    cta: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#f59e0b' },
    ctaText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#fff' },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.subtleBorder },
    dotOn: { width: 16, backgroundColor: Colors.primary },
  })
);
