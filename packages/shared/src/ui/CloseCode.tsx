import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Colors, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { formatCloseCode } from '../marketplace/closeCode';

/** What the QR encodes, so a scanner can tell an OnGarage closing code from any other QR. */
export const closeCodePayload = (code: string) => `ongarage:close:${code}`;

/**
 * The owner's closing code: a QR to scan, with the six digits underneath for when it
 * can't be scanned (the owner reads them out). Either one closes the job.
 */
export const CloseCode: React.FC<{ code: string; title?: string; caption?: string; size?: number; /** What the QR encodes (default: a closing code). */ payload?: string }> = ({
  code,
  title,
  caption,
  size = 180,
  payload,
}) => (
  <View style={styles.card}>
    {!!title && <Text style={styles.title}>{title}</Text>}
    <View style={[styles.qr, { width: size + 24, height: size + 24 }]}>
      <QRCode value={payload ?? closeCodePayload(code)} size={size} color="#0b0f17" backgroundColor="#ffffff" />
    </View>
    <Text style={styles.code} accessibilityLabel={`Close code ${code}`}>
      {formatCloseCode(code)}
    </Text>
    {!!caption && <Text style={styles.caption}>{caption}</Text>}
  </View>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    card: { alignItems: 'center', gap: 10, padding: 16, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    title: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
    // Always white behind the code so any scanner can read it, in either theme.
    qr: { backgroundColor: '#ffffff', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    code: { fontSize: 30, fontWeight: '900', letterSpacing: 6, color: Colors.textMain },
    caption: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', lineHeight: 17 },
  })
);
