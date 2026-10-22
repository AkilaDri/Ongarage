import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { Icon } from './Icons';

/** The blocks of a sheet's body, with fragments opened up and empty ones dropped, so each block can be told from the next by a thin line. */
const blocks = (children: React.ReactNode): React.ReactNode[] =>
  React.Children.toArray(children).flatMap((c) => (React.isValidElement(c) && c.type === React.Fragment ? blocks((c.props as { children?: React.ReactNode }).children) : [c]));

/** A bottom sheet with a title, scrolling body and an optional fixed footer. */
export const Sheet: React.FC<{
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: React.ReactNode;
  /** Rendered above the sheet inside its modal, e.g. the app's toast. */
  overlay?: React.ReactNode;
  /** A header that takes the place of the handle and the title row (a cover photo and its close button, say). */
  hero?: React.ReactNode;
  /** Tighter spacing between the blocks under the hero. */
  compact?: boolean;
  /** Covers the whole window with a back-arrow app bar (a chat), instead of rising from the bottom. */
  fullScreen?: boolean;
  /** Full screen only: the caller scrolls its own body, so the children fill the space between the bar and the footer. */
  bare?: boolean;
  /** Full screen only: an action at the right end of the app bar. */
  headerRight?: React.ReactNode;
  /** Full screen only: a badge before the title in the app bar (the app's own mark). */
  titleIcon?: React.ReactNode;
  /** Each time this number changes the body scrolls back to its top (a form that starts again, like "add another part"). */
  scrollToTopKey?: number;
  children: React.ReactNode;
}> = ({ visible, title, subtitle, onClose, footer, overlay, hero, compact, fullScreen, bare, headerRight, titleIcon, scrollToTopKey, children }) => {
  const bodyRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (scrollToTopKey) bodyRef.current?.scrollTo({ y: 0, animated: true });
  }, [scrollToTopKey]);
  const [mounted, setMounted] = useState(visible);
  const slide = useRef(new Animated.Value(0)).current;
  // A hero sheet grows to the full screen once the body scrolls up, so the cover and header scroll away and the content fills the top.
  const [full, setFull] = useState(false);
  // Swipe down to dismiss: a downward drag that starts while the body is scrolled to its top pulls the sheet down; letting go far or fast enough closes it.
  const dragY = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => g.dy > 8 && g.dy > Math.abs(g.dx) * 1.5 && scrollY.current <= 0,
      onPanResponderMove: (_, g) => dragY.setValue(Math.max(0, g.dy)),
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 0.8) onCloseRef.current();
        Animated.spring(dragY, { toValue: 0, stiffness: 220, damping: 26, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start(),
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setFull(false);
      scrollY.current = 0;
      dragY.setValue(0);
      Animated.spring(slide, { toValue: 1, stiffness: 200, damping: 24, useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(slide, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  // A thin line between one block of the body and the next (not in a full-screen sheet, which is a chat or a form with its own layout).
  const divided = (kids: React.ReactNode) =>
    blocks(kids).map((c, i) => (
      <React.Fragment key={i}>
        {i > 0 && <View style={styles.blockLine} />}
        {c}
      </React.Fragment>
    ));

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: slide }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.anchor} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, hero ? styles.sheetHero : null, hero && full ? styles.sheetFull : null, fullScreen ? styles.sheetScreen : null, { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [700, 0] }) }, { translateY: dragY }] }]} {...(fullScreen ? {} : pan.panHandlers)}>
          {hero || fullScreen ? null : <View style={[styles.handle, webNoPan]} />}
          {fullScreen && (
            <View style={styles.appBar}>
              <Pressable style={styles.backBtn} onPress={onClose} hitSlop={8} accessibilityLabel="Back">
                <Icon name="arrow-left" size={22} color={Colors.textMain} />
              </Pressable>
              {titleIcon}
              <View style={styles.flex1}>
                <Text style={styles.appTitle} numberOfLines={1}>{title}</Text>
                {!!subtitle && <Text style={styles.appSub} numberOfLines={1}>{subtitle}</Text>}
              </View>
              {headerRight}
            </View>
          )}
          {hero || fullScreen ? null : (
            <View style={[styles.headerRow, webNoPan]}>
              <View style={styles.flex1}>
                <Text style={styles.title}>{title}</Text>
                {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>
              <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8} accessibilityLabel="Close sheet">
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
          )}
          {fullScreen && bare ? (
            <View style={styles.flex1}>{children}</View>
          ) : (
          <ScrollView ref={bodyRef} style={[fullScreen ? styles.flex1 : null, webNoBounce]} scrollEventThrottle={16} onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
            if (hero) setFull(e.nativeEvent.contentOffset.y > 24);
          }} keyboardShouldPersistTaps="handled" contentContainerStyle={hero ? styles.bodyHero : styles.body} showsVerticalScrollIndicator={false} stickyHeaderIndices={undefined}>
            {hero}
            {hero ? <View style={[styles.heroBody, compact && styles.heroBodyCompact]}>{divided(children)}</View> : fullScreen ? children : divided(children)}
          </ScrollView>
          )}
          {!!footer && <View style={[styles.footer, fullScreen && styles.footerScreen]}>{footer}</View>}
        </Animated.View>
      </KeyboardAvoidingView>
      {overlay}
    </Modal>
  );
};

// On the web a finger drag on the handle / header is the sheet's (swipe down to close) and not the browser's page scroll; the body keeps its own scroll but never hands an over-pull to the page.
const webNoPan = (Platform.OS === 'web' ? { touchAction: 'none' } : null) as object | null;
const webNoBounce = (Platform.OS === 'web' ? { overscrollBehaviorY: 'contain' } : null) as object | null;

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: Colors.overlay },
    anchor: { flex: 1, justifyContent: 'flex-end' },
    sheet: {
      maxHeight: '90%',
      backgroundColor: Colors.sheetBg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: getThemeMode() === 'dark' ? 1 : 0,
      borderBottomWidth: 0,
      borderColor: Colors.borderColor,
      paddingTop: 10,
      overflow: 'hidden',
    },
    // With a hero the cover starts at the very top edge, so there is no strip of sheet above it as the body scrolls.
    sheetHero: { paddingTop: 0 },
    sheetFull: { maxHeight: '100%', height: '100%', borderTopLeftRadius: 0, borderTopRightRadius: 0 },
    sheetScreen: { maxHeight: '100%', height: '100%', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderWidth: 0, paddingTop: 0 },
    appBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingTop: Platform.OS === 'web' ? 10 : 36, paddingBottom: 10, backgroundColor: getThemeMode() === 'dark' ? '#202124' : '#ffffff', borderBottomWidth: 1, borderBottomColor: getThemeMode() === 'dark' ? '#3c4043' : '#dadce0' },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    backText: { fontSize: 22, color: Colors.textMain },
    appTitle: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMain },
    appSub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    footerScreen: { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 10, gap: 8, shadowOpacity: 0, elevation: 0, backgroundColor: 'transparent' },
    blockLine: { height: 1, backgroundColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e1e5eb' },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 12 },
    title: { fontSize: 17, fontFamily: FONTS.titleBold, color: Colors.textMain },
    subtitle: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#eef2f7', justifyContent: 'center', alignItems: 'center' },
    closeText: { fontSize: 13, fontWeight: '700', color: Colors.textMain },
    body: { padding: 18, gap: 10 },
    // With a hero the cover runs edge to edge at the top; the content below keeps the usual inset.
    bodyHero: { paddingBottom: 18 },
    heroBody: { paddingHorizontal: 6, paddingTop: 12, gap: 10 },
    heroBodyCompact: { paddingTop: 4, gap: 4 },
    footer: {
      padding: 16,
      paddingTop: 12,
      backgroundColor: Colors.sheetBg,
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: getThemeMode() === 'dark' ? 0.3 : 0.08,
      shadowRadius: 12,
      elevation: 8,
    },
  })
);
