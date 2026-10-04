import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, themedStyles } from '@ongarage/shared';
import { FONTS } from '@ongarage/shared';

interface ServiceCardProps {
  icon: string;
  name: string;
  iconColor: string;
  onPress: () => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ icon, name, iconColor, onPress }) => (
  <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
    <View style={[styles.iconShadow, { shadowColor: iconColor }]}>
      <View style={styles.iconWrap}>
        <View style={[styles.tint, { backgroundColor: iconColor }]} />
        <View style={styles.gloss} />
        <Text style={[styles.icon, { color: iconColor }]}>{icon}</Text>
      </View>
    </View>
    <Text style={styles.name}>{name}</Text>
  </Pressable>
);

const styles = themedStyles(() => StyleSheet.create({
  card: {
    width: '23%',
    aspectRatio: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 4,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    borderRadius: 16,
  },
  cardPressed: {
    backgroundColor: Colors.bgCardHover,
    transform: [{ scale: 0.96 }],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderBottomColor: Colors.borderColor,
  },
  iconShadow: {
    borderRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  tint: { ...StyleSheet.absoluteFill, opacity: 0.12 },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  icon: { fontSize: 22 },
  name: {
    fontSize: 11.5,
    fontFamily: FONTS.bodySemiBold,
    color: Colors.textMain,
    textAlign: 'center',
  },
}));
