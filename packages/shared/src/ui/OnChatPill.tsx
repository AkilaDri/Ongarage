import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { themedStyles } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { OnChatLogo } from './OnChatLogo';

/**
 * The OnChat button of every app: the OnChat logo, which opens the messages when it is touched. The unread count sits on its top corner.
 * (`variant` is kept so the callers do not change; the logo looks the same on every background.)
 */
export const OnChatPill: React.FC<{ onPress: () => void; count?: number; variant?: 'glass' | 'solid' }> = ({ onPress, count = 0 }) => (
  <Pressable style={styles.btn} onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }} accessibilityRole="button" accessibilityLabel="Messages">
    <OnChatLogo height={30} />
    {count > 0 && (
      <View style={styles.count}>
        <Text style={styles.countText}>{count > 9 ? '9+' : count}</Text>
      </View>
    )}
  </Pressable>
);

const styles = themedStyles(() =>
  StyleSheet.create({
    btn: { height: 30, justifyContent: 'center' },
    count: { position: 'absolute', top: -6, right: -6, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffed2f', borderWidth: 1.5, borderColor: '#003089' },
    countText: { fontSize: 9, fontFamily: FONTS.bodyBold, color: '#003089' },
  })
);
