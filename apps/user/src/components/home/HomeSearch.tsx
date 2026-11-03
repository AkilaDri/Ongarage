import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TextStyle, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, distanceKm, FONTS, getThemeMode, Icon, POPULAR_SERVICES, SERVICE_CATEGORIES, themedStyles, type Garage, type ServiceCategory } from '@ongarage/shared';
import { MOCK_GARAGES } from '../../constants/mockData';
import { GARAGE_SUB_SERVICES } from '../../constants/garageSubServices';
import { useUserLocation } from '../../context/LocationContext';
import { CategoryPhoto } from './CategoryPhoto';
import { shortCategoryName } from './CategoryStrip';

// The browser draws its own focus ring on text fields; the field's blue border replaces it.
const NO_FOCUS_RING = { outlineStyle: 'none' } as unknown as TextStyle;

// The categories people use most, in order: the ones with popular sub-services first (the usage list the app already keeps).
const POPULAR_CATEGORY_ORDER = [...new Set(POPULAR_SERVICES.map((p) => p.categoryId))];

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
      <Text style={styles.hintLabel} numberOfLines={1}>අවශ්‍ය සේවාව?</Text>
      <View style={styles.hintClip}>
        <Animated.Text numberOfLines={1} style={[styles.hintWord, { color: colorOf(prev.categoryId), opacity: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }) }] }]}>
          {prev.sub}
        </Animated.Text>
        <Animated.Text numberOfLines={1} style={[styles.hintWord, styles.hintIn, { color: colorOf(now.categoryId), opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }] }]}>
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
  const [focused, setFocused] = useState(false);
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
    } else {
      // Nothing typed: the popular categories lead, the rest keep their order (the sort is stable).
      const rank = (id: string) => {
        const i = POPULAR_CATEGORY_ORDER.indexOf(id);
        return i === -1 ? Infinity : i;
      };
      hits.sort((a, b) => rank(a.category.id) - rank(b.category.id));
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

  // How many garages near the owner do this category: the number that tells them there is a choice.
  const nearbyOffering = (categoryId: string) =>
    MOCK_GARAGES.filter((g) => (GARAGE_SUB_SERVICES[g.id]?.[categoryId]?.length ?? 0) > 0 && distanceKm(user.coords, g.coords) <= 10).length;

  // The category's short name, as on the home tiles (sub-service names stay as they are).
  const catName = (c: ServiceCategory) => shortCategoryName(c.id) ?? c.name;

  const garageRow = (g: (typeof garages)[number]) => (
            <Pressable
              key={g.id}
              style={styles.row}
              // The search stays open under the profile: closing the profile returns to these results.
              onPress={() => onGarage(g)}
              accessibilityLabel={`Search result garage ${g.name}`}
            >
              <View style={styles.garageIcon}>
                <Text style={styles.garageEmoji}>🛠️</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {g.name}
                </Text>
                <Text style={styles.rowSub} numberOfLines={2}>
                  ★ {g.rating} · km {g.distance} · {g.specialization}
                </Text>
              </View>
              <Text style={styles.chev} accessibilityElementsHidden importantForAccessibility="no">›</Text>
            </Pressable>
  );

  return (
    <>
      <Pressable style={[styles.bar, inCard && styles.barInCard]} onPress={() => setOpen(true)} accessibilityLabel="Search services and garages" accessibilityRole="search">
        <View style={styles.barBtn}>
          <Icon name="search" size={22} color="#1a73e8" />
        </View>
        <AnimatedHint />
      </Pressable>

      <Modal visible={open} animationType="fade" statusBarTranslucent onRequestClose={close}>
        <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
          {/* The same top bar as the job form: a solid blue band, a round close button on the left, the search field in the band. */}
          <View style={styles.searchBand}>
            <Pressable onPress={close} hitSlop={10} style={styles.closeRound} accessibilityLabel="Close search">
              <Text style={styles.closeRoundText}>✕</Text>
            </Pressable>
            <View style={[styles.field, styles.fieldInBand, focused && styles.fieldFocus]}>
              <Icon name="search" size={16} color={Colors.textMuted} />
              <TextInput
                style={[styles.input, NO_FOCUS_RING]}
                value={text}
                onChangeText={setText}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoFocus
                placeholder="සේවාවක් හෝ ගරාජයක් සොයන්න..."
                placeholderTextColor={getThemeMode() === 'dark' ? Colors.textMuted : '#94a3b8'}
                accessibilityLabel="Search text"
                returnKeyType="search"
              />
              {!!text && (
                <Pressable onPress={() => setText('')} hitSlop={8} accessibilityLabel="Clear search">
                  <Icon name="x" size={16} color={Colors.textMuted} />
                </Pressable>
              )}
            </View>
          </View>

          {/* The first child is the sticky heading: it stays under the search field while the results scroll beneath it. */}
          {/* The results sit in a rounded sheet that rises from the blue band, as on the job form. */}
          <View style={styles.searchSheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.list} stickyHeaderIndices={q ? [0] : undefined}>
            {!q && !!garages.length && (
              <>
                <Text style={styles.section}>ළඟම ගරාජ</Text>
                {garages.slice(0, 3).map((g) => garageRow(g))}
              </>
            )}
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
                    {s.sub ?? catName(s.category)}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={2}>
                    {s.sub ? catName(s.category) : `ළඟ ගරාජ ${nearbyOffering(s.category.id)} ක්\nමෙය කරයි`}
                  </Text>
                </View>
                {/* A category can go straight to bids: the posting opens with it chosen, and the typed text carried along. */}
                {!s.sub && !!onPost && (
                  <Pressable
                    style={styles.bidChip}
                    onPress={() => {
                      close();
                      onPost(s.category.id, text.trim());
                    }}
                    hitSlop={8}
                    accessibilityLabel={`Get bids for ${catName(s.category)}`}
                  >
                    <Text style={styles.bidChipText}>ලංසු ලබාගන්න</Text>
                  </Pressable>
                )}
                <Text style={styles.chev} accessibilityElementsHidden importantForAccessibility="no">›</Text>
              </Pressable>
            ))}

            {!!q && !!garages.length && <Text style={styles.section}>ගරාජ</Text>}
            {!!q && garages.map((g) => garageRow(g))}

            {!services.length && !garages.length && <Text style={styles.empty}>“{text.trim()}” සඳහා ප්‍රතිඵල නැත. වෙනත් වචනයකින් සොයන්න.</Text>}
          </ScrollView>
          </View>
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
                <Text style={styles.postCtaTitle} numberOfLines={1}>
                  {q ? `“${text.trim()}” සඳහා ලංසු ඉල්ලන්න` : 'තෝරගන්න අපහසුයි ද ?'}
                </Text>
                <Text style={styles.postCtaSub}>මිල සහ හොඳම සේවාව සසදන්න.</Text>
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
    bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingLeft: 8, paddingRight: 18, borderRadius: 8, backgroundColor: '#ffffff', shadowColor: '#0f2a3d', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 4 },
    barInCard: { paddingVertical: 3, shadowOpacity: 0, elevation: 0 },
    barBtn: { width: 30, height: 38, alignItems: 'center', justifyContent: 'center' },
    hintRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
    hintLabel: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: '#5f6368' },
    hintClip: { flex: 1, height: 22, overflow: 'hidden', justifyContent: 'center' },
    hintWord: { fontSize: 12.5, fontFamily: FONTS.bodyBold },
    hintIn: { position: 'absolute', left: 0, right: 0 },
    postCta: { marginHorizontal: 16, marginTop: 8, marginBottom: 14, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, backgroundColor: '#1b3a96', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 5 },
    postCtaText: { flex: 1, gap: 3 },
    postCtaBadge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 11, backgroundColor: '#ffffff', marginBottom: 2 },
    postCtaBadgeText: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: '#1b3a96' },
    postCtaTitle: { fontSize: 16, fontFamily: FONTS.titleBold, color: '#ffffff' },
    postCtaSub: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: '#ffffff' },
    postCtaPlus: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
    postCtaPlusText: { fontSize: 30, fontFamily: FONTS.bodyBold, color: '#1b3a96', lineHeight: 34 },
    page: { flex: 1, backgroundColor: Colors.bgBody },
    top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
    field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    // The same room as the job form's band: the pill sits 12px from the top, and the sheet rises about 42px below it.
    searchBand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 68, backgroundColor: '#1d367f' },
    closeRound: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center' },
    closeRoundText: { fontSize: 16, fontWeight: '700', color: Colors.textMain },
    fieldInBand: { height: 52, borderWidth: 0, borderRadius: 26 },
    bidChip: { flexShrink: 0, paddingHorizontal: 10, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#93c5fd', backgroundColor: '#eff6ff', justifyContent: 'center' },
    bidChipText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#1d4ed8' },
    searchSheet: { flex: 1, marginTop: -24, backgroundColor: Colors.sheetBg, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
    sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder, marginTop: 10 },
    input: { flex: 1, fontSize: 14, fontFamily: FONTS.bodyRegular, color: Colors.textMain, paddingVertical: 0 },
    fieldFocus: { borderColor: '#1a73e8', borderWidth: 2 },
    cancelHit: { minHeight: 44, justifyContent: 'center' },
    cancel: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? Colors.primary : '#0369a1' },
    // 14px at the top: the space the drag handle used to take.
    list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 120 },
    stickyHead: { backgroundColor: Colors.bgBody, paddingBottom: 2 },
    section: { fontSize: 13, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? Colors.textMain : '#0f172a', marginTop: 16, marginBottom: 6 },
    // Rows: 12px of air above and below (the touch target stays at least 56px), 12px between the parts.
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    rowTitle: { fontSize: 14, lineHeight: 19, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    rowSub: { fontSize: 12, lineHeight: 16, fontFamily: FONTS.bodyRegular, color: getThemeMode() === 'dark' ? Colors.textMuted : '#334155', marginTop: 2 },
    chev: { fontSize: 20, color: Colors.textMuted },
    garageIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    garageEmoji: { fontSize: 16 },
    empty: { marginTop: 40, textAlign: 'center', fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
  })
);
