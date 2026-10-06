import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Colors, themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { formatCloseCode } from '../marketplace/closeCode';

const N = 21; // modules per side, like a version-1 QR

/**
 * The owner's closing code: a QR to scan, with the six digits underneath for when it
 * can't be scanned. The pattern is derived from the code (stand-in until a real QR
 * encoder is added with the back end); the digits are what the other side checks.
 */
export const CloseCode: React.FC<{ code: string; title?: string; caption?: string; size?: number }> = ({ code, title, caption, size = 180 }) => {
  const cells = useMemo(() => {
    let seed = [...code].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 17);
    const next = () => (seed = (seed * 1103515245 + 12345) >>> 0) >>> 16;
    const finder = (x: number, y: number) => {
      const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
      const box = inBox(0, 0) ? [0, 0] : inBox(N - 7, 0) ? [N - 7, 0] : inBox(0, N - 7) ? [0, N - 7] : null;
      if (!box) return null;
      const dx = x - box[0];
      const dy = y - box[1];
      const ring = Math.min(dx, dy, 6 - dx, 6 - dy);
      return ring !== 1; // outer ring and 3×3 centre dark, the ring between light
    };
    const out: [number, number][] = [];
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const f = finder(x, y);
        if (f === true || (f === null && next() % 2 === 0)) out.push([x, y]);
      }
    return out;
  }, [code]);
  const m = size / N;

  return (
    <View style={styles.card}>
      {!!title && <Text style={styles.title}>{title}</Text>}
      <View style={[styles.qr, { width: size + 24, height: size + 24 }]}>
        <Svg width={size} height={size}>
          {cells.map(([x, y]) => (
            <Rect key={`${x}-${y}`} x={x * m} y={y * m} width={m + 0.3} height={m + 0.3} fill="#0b0f17" />
          ))}
        </Svg>
      </View>
      <Text style={styles.code} accessibilityLabel={`Close code ${code}`}>
        {formatCloseCode(code)}
      </Text>
      {!!caption && <Text style={styles.caption}>{caption}</Text>}
    </View>
  );
};

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
