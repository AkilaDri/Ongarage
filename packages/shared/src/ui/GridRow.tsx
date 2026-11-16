import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * One row of a card's content, laid out on two equal columns (no lines drawn): what the row is about stands in the left cell, its value, status or
 * action in the right cell, aligned to the card's right edge. Rows of a card, and cards of every app, line up the same way.
 */
export const GridRow: React.FC<{ left?: React.ReactNode; right?: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ left, right, style }) => (
  <View style={[styles.row, style]}>
    <View style={styles.left}>{left}</View>
    <View style={styles.right}>{right}</View>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  left: { flex: 1, flexBasis: 0, minWidth: 0, justifyContent: 'center' },
  right: { flex: 1, flexBasis: 0, minWidth: 0, justifyContent: 'center', alignItems: 'flex-end' },
});
