import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, Gradient, themedStyles, type MartBanner } from '@ongarage/shared';

const GAP = 10;

/** Large paid banners from shops that page sideways, the next one peeking in; every one is labelled as an ad. */
export const MartBannerCarousel: React.FC<{ banners: MartBanner[]; onOpen: (b: MartBanner) => void }> = ({ banners, onOpen }) => {
  const [width, setWidth] = useState(0);
  const cardW = Math.max(0, width - 28);
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const touchedAt = useRef(0);
  const pageRef = useRef(0);
  pageRef.current = page;

  useEffect(() => {
    if (cardW <= 0 || banners.length < 2) return;
    const timer = setInterval(() => {
      if (Date.now() - touchedAt.current < 10000) return;
      const next = (pageRef.current + 1) % banners.length;
      scroller.current?.scrollTo({ x: next * (cardW + GAP), animated: true });
      setPage(next);
    }, 5000);
    return () => clearInterval(timer);
  }, [cardW, banners.length]);

  if (banners.length === 0) return null;

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <ScrollView
          ref={scroller}
          onScrollBeginDrag={() => (touchedAt.current = Date.now())}
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
              <View style={[styles.banner, { width: cardW }]}>
                <Gradient stops={b.stops} />
                <Text style={styles.emoji}>{b.emoji}</Text>
                <View style={styles.adPill}>
                  <Text style={styles.adText}>දැන්වීම</Text>
                </View>
                <View style={styles.copy}>
                  <Text style={styles.title} numberOfLines={2}>
                    {b.title}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {b.subtitle}
                  </Text>
                  <View style={styles.cta}>
                    <Text style={styles.ctaText}>{b.cta} ›</Text>
                  </View>
                </View>
              </View>
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

// White text sits on fixed-colour gradients (the intended exception to theme colours).
const styles = themedStyles(() =>
  StyleSheet.create({
    wrap: { gap: 8 },
    banner: { height: 136, borderRadius: 18, overflow: 'hidden', justifyContent: 'flex-end' },
    emoji: { position: 'absolute', right: 14, top: 18, fontSize: 64, opacity: 0.95 },
    adPill: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(255, 255, 255, 0.85)' },
    adText: { fontSize: 9.5, fontWeight: '800', color: '#0f172a' },
    copy: { padding: 14, gap: 2, paddingRight: 90 },
    title: { fontSize: 16, fontFamily: FONTS.titleBold, color: '#fff' },
    subtitle: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: 'rgba(255, 255, 255, 0.92)' },
    cta: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#f59e0b' },
    ctaText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: '#fff' },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.subtleBorder },
    dotOn: { width: 16, backgroundColor: Colors.primary },
  })
);
