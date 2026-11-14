import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, distanceKm, FONTS, getThemeMode, Icon, POPULAR_SERVICES, SERVICE_CATEGORIES, themedStyles, type Garage, type ServiceCategory } from '@ongarage/shared';
import { MOCK_GARAGES } from '../../constants/mockData';
import { useUserLocation } from '../../context/LocationContext';
import { CategoryPhoto } from './CategoryPhoto';

const MAX_GARAGES = 8;
/** How long each suggested job stays in the bar before the next one slides in. */
const HINT_MS = 2400;

/** The bar's hint: the popular jobs (Oil Change, Wheel Alignment ...) one after another, each sliding up into the box as the last slides out, in its category's colour. */
const AnimatedHint: React.FC = () => {
  const [i, setI] = useState(0);
  const t = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const id = setInterval(() => {
      t.setValue(0);
      setI((n) => (n + 1) % POPULAR_SERVICES.length);
      Animated.timing(t, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, HINT_MS);
    return () => clearInterval(id);
  }, [t]);
  const prev = POPULAR_SERVICES[(i + POPULAR_SERVICES.length - 1) % POPULAR_SERVICES.length];
  const now = POPULAR_SERVICES[i];
  // The services take turns in two colours: one in blue, the next in gold, and so on.
  const turnColor = (n: number) => (n % 2 === 0 ? '#2563eb' : '#ca8a04');
  const prevColor = turnColor((i + POPULAR_SERVICES.length - 1) % POPULAR_SERVICES.length);
  const nowColor = turnColor(i);
  // The example words sit on white: each category colour is darkened so the small text keeps a readable contrast.
  const colorOf = (id: string) => {
    const hex = SERVICE_CATEGORIES.find((c) => c.id === id)?.color ?? Colors.primary;
    const m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const ch = (shift: number) => Math.round(((n >> shift) & 255) * 0.65).toString(16).padStart(2, '0');
    return `#${ch(16)}${ch(8)}${ch(0)}`;
  };
  return (
    <View style={styles.hintRow}>
      <Text style={styles.hintLabel} numberOfLines={1}>ඔබට අවශ්‍ය සේවාව ?</Text>
      <View style={styles.hintClip}>
        <Animated.Text numberOfLines={1} style={[styles.hintWord, { color: prevColor, opacity: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }) }] }]}>
          {prev.sub}
        </Animated.Text>
        <Animated.Text numberOfLines={1} style={[styles.hintWord, styles.hintIn, { color: nowColor, opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }] }]}>
          {now.sub}
        </Animated.Text>
      </View>
    </View>
  );
};

type ServiceHit = { key: string; category: ServiceCategory; sub?: string };

/**
 * The search bar on Home. Touching it opens a full-screen search: type a main service (Tyres, Service ...), a sub-service (Oil Change,
 * Wheel Alignment ...) or a garage's name; a service opens that category's garages (a sub-service starts on that sub-service) and a garage opens its profile.
 */
export const HomeSearch: React.FC<{
  onService: (c: ServiceCategory, sub?: string) => void;
  onGarage: (g: Garage) => void;
  /** Ask every nearby garage for bids: the search text (and the first service it matched) go into the new job. */
  onPost?: (categoryId: string | undefined, text: string) => void;
  /** The bar sits inside the blue card: a little shorter, no shadow. */
  inCard?: boolean;
}> = ({ onService, onGarage, onPost, inCard }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const user = useUserLocation();
  const q = text.trim().toLowerCase();

  const services = useMemo<ServiceHit[]>(() => {
    const hits: ServiceHit[] = [];
    for (const c of SERVICE_CATEGORIES) {
      if (!q || c.name.toLowerCase().includes(q)) hits.push({ key: c.id, category: c });
    }
    if (q) {
      for (const c of SERVICE_CATEGORIES) {
        for (const s of c.subcategories) if (s.toLowerCase().includes(q)) hits.push({ key: `${c.id}:${s}`, category: c, sub: s });
      }
    }
    return hits;
  }, [q]);

  const garages = useMemo(
    () =>
      MOCK_GARAGES.map((g) => ({ ...g, distance: Number(distanceKm(user.coords, g.coords).toFixed(1)) }))
        .filter((g) => !q || g.name.toLowerCase().includes(q) || g.specialization.toLowerCase().includes(q))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, MAX_GARAGES),
    [q, user.coords]
  );

  const close = () => {
    setOpen(false);
    setText('');
  };

  return (
    <>
      <Pressable style={[styles.bar, inCard && styles.barInCard, { borderRadius: 16, paddingVertical: 8, paddingLeft: 16, paddingRight: 8, gap: 6, borderWidth: 0, borderColor: 'transparent', backgroundColor: '#ffffff', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 5 }]} onPress={() => setOpen(true)} accessibilityLabel="Search services and garages" accessibilityRole="search">
        <AnimatedHint />
        <View style={[styles.barBtn, { width: 40, height: 40, borderRadius: 12, backgroundColor: 'transparent' }]}>
          <Icon name="search" size={24} color="#2563eb" />
        </View>
      </Pressable>

      <Modal visible={open} animationType="fade" statusBarTranslucent onRequestClose={close}>
        <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
          <View style={styles.top}>
            <View style={styles.field}>
              <Icon name="search" size={16} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                autoFocus
                placeholder="සේවාවක් හෝ ගරාජයක් සොයන්න..."
                placeholderTextColor={Colors.textMuted}
                accessibilityLabel="Search text"
                returnKeyType="search"
              />
              {!!text && (
                <Pressable onPress={() => setText('')} hitSlop={8} accessibilityLabel="Clear search">
                  <Icon name="x" size={16} color={Colors.textMuted} />
                </Pressable>
              )}
            </View>
            <Pressable onPress={close} hitSlop={14} style={styles.cancelHit} accessibilityLabel="Close search">
              <Text style={styles.cancel}>අවලංගු</Text>
            </Pressable>
          </View>

          {/* The first child is the sticky heading: it stays under the search field while the results scroll beneath it. */}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list} stickyHeaderIndices={[0]}>
            <View style={styles.stickyHead}>{!!services.length && <Text style={styles.section}>සේවා</Text>}</View>
            {services.map((s) => (
              <Pressable
                key={s.key}
                style={styles.row}
                onPress={() => {
                  close();
                  onService(s.category, s.sub);
                }}
                accessibilityLabel={s.sub ? `Search result ${s.sub}` : `Search result ${s.category.name}`}
              >
                <CategoryPhoto categoryId={s.category.id} size={36} />
                <View style={styles.flex1}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {s.sub ?? s.category.name}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {s.sub ? s.category.name : `උප සේවා ${s.category.subcategories.length} කි`}
                  </Text>
                </View>
                <Text style={styles.chev} accessibilityElementsHidden importantForAccessibility="no">›</Text>
              </Pressable>
            ))}

            {!!garages.length && <Text style={styles.section}>ගරාජ</Text>}
            {garages.map((g) => (
              <Pressable
                key={g.id}
                style={styles.row}
                onPress={() => {
                  close();
                  onGarage(g);
                }}
                accessibilityLabel={`Search result garage ${g.name}`}
              >
                <View style={styles.garageIcon}>
                  <Text style={styles.garageEmoji}>🛠️</Text>
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {g.name}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    ★ {g.rating} · km {g.distance} · {g.specialization}
                  </Text>
                </View>
                <Text style={styles.chev} accessibilityElementsHidden importantForAccessibility="no">›</Text>
              </Pressable>
            ))}

            {!services.length && !garages.length && <Text style={styles.empty}>“{text.trim()}” සඳහා ප්‍රතිඵල නැත. වෙනත් වචනයකින් සොයන්න.</Text>}
          </ScrollView>
          {/* Too many garages, or none that fits: every nearby garage can bid for the job instead. */}
          {!!onPost && (
            <Pressable
              style={styles.postCta}
              onPress={() => {
                const hit = services[0]?.category.id;
                const t = text.trim();
                close();
                onPost(q ? hit : undefined, t);
              }}
              accessibilityLabel="Ask all nearby garages for bids"
            >
              {/* The same card as the Home Quotes banner: a badge, the question, what it does, and a round plus. */}
              <View style={styles.postCtaText}>
                <View style={styles.postCtaBadge}>
                  <Text style={styles.postCtaBadgeText}>නොමිලේ Quotes</Text>
                </View>
                <Text style={styles.postCtaTitle}>තෝරගන්න අපහසුයි ද ?</Text>
                <Text style={styles.postCtaSub}>සියල්ලන්ගෙන් ලංසු ඉල්ලන්න</Text>
              </View>
              <View style={styles.postCtaPlus}>
                <Text style={styles.postCtaPlusText}>+</Text>
              </View>
            </Pressable>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    // A white bar (white in both themes) with a soft shadow: a plain blue search icon (no fill), then the moving hint in its category's colour.
    bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingLeft: 16, paddingRight: 10, borderRadius: 22, backgroundColor: Colors.bgCard, shadowColor: '#0f2a3d', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 4 },
    barInCard: { paddingVertical: 3, shadowOpacity: 0, elevation: 0 },
    barBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(37, 99, 235, 0.16)', alignItems: 'center', justifyContent: 'center' },
    hintRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
    hintLabel: { fontSize: 13.5, fontFamily: FONTS.bodyBold, color: '#9ca3af' },
    hintClip: { flex: 1, height: 22, overflow: 'hidden', justifyContent: 'center' },
    hintWord: { fontSize: 13.5, fontFamily: FONTS.bodyBold },
    hintIn: { position: 'absolute', left: 0, right: 0 },
    postCta: { marginHorizontal: 16, marginTop: 8, marginBottom: 14, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, backgroundColor: '#1e40af', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 5 },
    postCtaText: { flex: 1, gap: 3 },
    postCtaBadge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 11, backgroundColor: '#ffffff', marginBottom: 2 },
    postCtaBadgeText: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: '#1e40af' },
    postCtaTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: '#ffffff' },
    postCtaSub: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: '#ffffff' },
    postCtaPlus: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
    postCtaPlusText: { fontSize: 30, fontFamily: FONTS.bodyBold, color: '#1e40af', lineHeight: 34 },
    page: { flex: 1, backgroundColor: Colors.bgBody },
    top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
    field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    input: { flex: 1, fontSize: 14, fontFamily: FONTS.bodyRegular, color: Colors.textMain, paddingVertical: 0 },
    cancelHit: { minHeight: 44, justifyContent: 'center' },
    cancel: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? Colors.primary : '#0369a1' },
    list: { paddingHorizontal: 16, paddingBottom: 30 },
    stickyHead: { backgroundColor: Colors.bgBody, paddingBottom: 2 },
    section: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? Colors.textMuted : '#525f73', letterSpacing: 0.5, marginTop: 14, marginBottom: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
    rowTitle: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    rowSub: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: getThemeMode() === 'dark' ? Colors.textMuted : '#525f73', marginTop: 1 },
    chev: { fontSize: 20, color: Colors.textMuted },
    garageIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    garageEmoji: { fontSize: 16 },
    empty: { marginTop: 40, textAlign: 'center', fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
  })
);
