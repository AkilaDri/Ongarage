import React, { useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, Gradient, themedStyles } from '@ongarage/shared';
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
              <View style={styles.shade}>
                <Gradient vertical stops={SHADE_STOPS} />
              </View>
              <View style={styles.adPill}>
                <Text style={styles.adText}>දැන්වීම</Text>
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>{mixed(b.title, styles.latinTitle)}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {mixed(b.subtitle, styles.latinSubtitle)}
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
// Latin words inside a Sinhala line are set one step larger, so they read at the same weight.
const SHADE_STOPS = [
  { offset: '0', color: '#0D2B3E', opacity: 0.15 },
  { offset: '0.5', color: '#0D2B3E', opacity: 0.45 },
  { offset: '1', color: '#0D2B3E', opacity: 0.9 },
];
const mixed = (text: string, latin: object) =>
  text.split(/([A-Za-z0-9][A-Za-z0-9 .&-]*[A-Za-z0-9])/).filter(Boolean).map((part, i) => (/[A-Za-z]/.test(part) ? <Text key={i} style={latin}>{part}</Text> : part));
const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { gap: 8 },
    banner: { height: 120, justifyContent: 'flex-end' },
    image: { borderRadius: 12 },
    shade: { ...StyleSheet.absoluteFill, borderRadius: 12, overflow: 'hidden' },
    adPill: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(255, 255, 255, 0.9)' },
    adText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#0f172a' },
    copy: { padding: 14, gap: 2 },
    title: { fontSize: 19, lineHeight: 26, fontFamily: FONTS.titleBold, color: '#fff' },
    latinTitle: { fontSize: 21, lineHeight: 26, fontFamily: FONTS.titleBold, color: '#fff' },
    latinSubtitle: { fontSize: 14, lineHeight: 18, fontFamily: FONTS.bodyMedium, color: 'rgba(255, 255, 255, 0.9)' },
    subtitle: { fontSize: 13, lineHeight: 18, fontFamily: FONTS.bodyMedium, color: 'rgba(255, 255, 255, 0.9)', textShadowColor: 'rgba(0, 0, 0, 0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
    cta: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 12, height: 28, justifyContent: 'center', borderRadius: 14, backgroundColor: '#0E7C86' },
    ctaText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: '#ffffff' },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.subtleBorder },
    dotOn: { width: 16, backgroundColor: Colors.primary },
  })
);
