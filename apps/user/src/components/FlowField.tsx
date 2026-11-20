import React from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { Colors, FONTS, getThemeMode, themedStyles } from '@ongarage/shared';

/** The text box the booking and request flows share: 22px corners, the Bids card's light edge, 14px text, 96px tall to start. */
export const FlowField: React.FC<TextInputProps> = ({ style, ...rest }) => <TextInput placeholderTextColor={Colors.textMuted} {...rest} style={[styles.field, style]} />;

const styles = themedStyles(() =>
  StyleSheet.create({
    field: {
      minHeight: 96,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 22,
      backgroundColor: getThemeMode() === 'dark' ? Colors.bgCard : '#ffffff',
      borderWidth: 1,
      borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#f3f4f6',
      color: Colors.textMain,
      fontSize: 14,
      fontFamily: FONTS.bodyRegular,
      textAlignVertical: 'top',
    },
  })
);
