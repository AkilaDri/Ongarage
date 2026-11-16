import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, getAppTone, getThemeMode, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { OnChatPill } from './OnChatPill';

/** The colour of the page header: the sheets' background, 5% darker; the app's top edge (the status bar area) takes it too so the two read as one. */
export const pageHeaderBlue = () => {
  const own = getAppTone().header;
  if (own) return { from: own.bg, to: own.bg };
  const hex = String(Colors.sheetBg).replace('#', '');
  const shade = hex.length === 6 ? '#' + [0, 2, 4].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.95).toString(16).padStart(2, '0')).join('') : Colors.sheetBg;
  return { from: shade, to: shade };
};

/**
 * The top of a page in every app: a rounded icon tile, the title with a small line under it, the page's own button(s) (a calendar with a count,
 * say), and the ONCHAT pill with the unread count. A thin line under it separates it from the tabs. `background` is the colour of the page under it.
 */
export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  /** Drawn in place of the title and subtitle (Bids puts its Free Quote button here while the sheet is up). */
  titleNode?: React.ReactNode;
  icon?: React.ReactNode;
  /** The page's own buttons, before the chat pill. */
  actions?: React.ReactNode;
  /** The ONCHAT pill: what it opens and the unread count. */
  chat?: { onPress: () => void; count: number };
  /** Kept for the apps that pass their page colour; the header is blue now. */
  background?: string;
}> = ({ title, subtitle, titleNode, actions, chat }) => (
  <View style={styles.wrap}>
    <View style={styles.row}>
      {/* No icon in front of the heading (the `icon` prop is kept for the apps that pass it, but it is not drawn). */}
      <View style={styles.textCol}>
        {titleNode ?? (
          <>
            <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
              {title}
            </Text>
            {!!subtitle && <Text style={styles.sub}>{subtitle}</Text>}
          </>
        )}
      </View>
      {actions}
      {!!chat && <OnChatPill variant="solid" onPress={chat.onPress} count={chat.count} />}
    </View>
  </View>
);

/** A header button: just the icon (24px), with a rose count on its corner. */
export const HeaderIconButton: React.FC<{ onPress: () => void; label: string; count?: number; background?: string; children: React.ReactNode }> = ({ onPress, label, count = 0, children }) => (
  <Pressable onPress={onPress} accessibilityLabel={label} style={styles.iconBtnWrap}>
    <View style={styles.iconBtn}>{children}</View>
    {count > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
      </View>
    )}
  </Pressable>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    // A thin line under the header (no shadow) so it reads apart from the tabs below it.
    wrap: { flex: getAppTone().header ? 1 : undefined, justifyContent: 'center', backgroundColor: pageHeaderBlue().from, borderBottomWidth: getAppTone().header ? 0 : 1, borderBottomColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e2e8f0' },
    row: { flexDirection: 'row', alignItems: getAppTone().header ? 'center' : 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: getAppTone().header ? 12 : 30, paddingBottom: getAppTone().header ? 12 : 8 },
    textCol: { flex: 1, minWidth: 0, marginLeft: 4 },
    title: { fontSize: 19, lineHeight: 24, fontFamily: FONTS.titleBold, color: getAppTone().header?.title ?? Colors.textMain },
    sub: { fontSize: 10.5, lineHeight: 14, fontFamily: FONTS.bodyMedium, color: getAppTone().header?.sub ?? Colors.textMuted, marginTop: 2 },
    iconBtnWrap: { marginRight: 6, marginBottom: getAppTone().header ? 0 : -6 },
    // Just the icon, no background; the count sits on its corner.
    iconBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    badge: { position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f43f5e', borderWidth: 1.5, borderColor: pageHeaderBlue().from },
    badgeText: { fontSize: 8, fontFamily: FONTS.bodyBold, color: '#ffffff' },
  })
);
