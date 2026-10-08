import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, themedStyles } from '@ongarage/shared';

type Tone = 'danger' | 'primary' | 'success';

// A soft tint behind the icon, no outline.
const tint = (tone: Tone) =>
  ({
    danger: 'rgba(239, 68, 68, 0.14)',
    primary: 'rgba(56, 189, 248, 0.16)',
    success: 'rgba(16, 185, 129, 0.16)',
  })[tone];

/**
 * The owner app's pop-up in the middle of the screen (confirmations, notices): the same contract as the
 * shared ModalCard, drawn in the owner app's soft style: a borderless rounded card with a wide shadow,
 * a tinted icon disc and pill buttons. (The shared ModalCard stays as is for the other apps.)
 */
export const OwnerModalCard: React.FC<{
  icon: string;
  tone: Tone;
  title: string;
  body: string;
  children: React.ReactNode;
}> = ({ icon, tone, title, body, children }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 280, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true }).start();
  }, [anim]);
  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.card, { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
        <View style={[styles.iconDisc, { backgroundColor: tint(tone) }]}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <View style={styles.actions}>{children}</View>
      </Animated.View>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFill, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 100 },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: Colors.bgCard,
      borderRadius: 28,
      padding: 24,
      alignItems: 'center',
      gap: 8,
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.3,
      shadowRadius: 32,
      elevation: 16,
    },
    iconDisc: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    iconText: { fontSize: 28 },
    title: { fontSize: 17, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
    body: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, textAlign: 'center', lineHeight: 19, marginBottom: 10 },
    actions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  })
);
