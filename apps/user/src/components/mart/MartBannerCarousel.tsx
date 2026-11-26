import { outline } from '../../utils/material';
import { getThemeMode } from '@ongarage/shared';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, Gradient, themedStyles, type MartBanner } from '@ongarage/shared';

const GAP = 10;
const BLUE_STOPS = [{ offset: '0', color: '#1e3a8a' }, { offset: '1', color: '#1e3a8a' }];

/** Paid banners from shops that page sideways (dots show the others); every one is labelled as an ad. */
export const MartBannerCarousel: React.FC<{ banners: MartBanner[]; onOpen: (b: MartBanner) => void }> = ({ banners, onOpen }) => {
  const [width, setWidth] = useState(0);
  const cardW = width;
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
          contentContainerStyle={{ gap: GAP }}
          onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / (cardW + GAP)))}
          scrollEventThrottle={32}
        >
          {banners.map((b) => (
            <Pressable key={b.id} onPress={() => onOpen(b)} accessibilityLabel={`Promo ${b.title}`}>
              {/* The shape of Home's offer banner: one blue card, a yellow tag, the offer, and a white button beside it. */}
              <View style={[styles.banner, { width: cardW }]}>
                <Gradient stops={BLUE_STOPS} />
                <Text style={styles.emoji}>{b.emoji}</Text>
                <View style={styles.line}>
                  <View style={styles.copy}>
                    <View style={styles.adPill}>
                      <Text style={styles.adText}>දැන්වීම</Text>
                    </View>
                    <Text style={styles.title} numberOfLines={2}>
                      {b.title}
                    </Text>
                    <Text style={styles.subtitle} numberOfLines={2}>
                      {b.subtitle}
                    </Text>
                  </View>
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
    banner: { minHeight: 150, borderRadius: 20, padding: 20, overflow: 'hidden', justifyContent: 'center', backgroundColor: '#1e3a8a' },
    emoji: { position: 'absolute', right: -8, bottom: -18, fontSize: 104, opacity: 0.12 },
    line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    copy: { flex: 1 },
    adPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, backgroundColor: '#facc15' },
    adText: { fontSize: 12, fontWeight: '800', color: '#111827' },
    title: { marginTop: 8, fontSize: 20, lineHeight: 27, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    subtitle: { marginTop: 4, fontSize: 13.5, lineHeight: 19, fontFamily: FONTS.bodyRegular, color: '#dbeafe' },
    cta: { flexShrink: 0, maxWidth: '40%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, backgroundColor: '#ffffff' },
    ctaText: { fontSize: 13.5, lineHeight: 19, fontFamily: FONTS.bodyBold, color: '#1e3a8a', textAlign: 'center' },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.subtleBorder },
    dotOn: { width: 16, backgroundColor: Colors.primary },
  })
);
