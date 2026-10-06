import React, { useState } from 'react';
import { Image, ImageBackground, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, Gradient, ThemeToggle, themedStyles, useTheme } from '@ongarage/shared';
import { useVehicles } from '../context/VehiclesContext';
import { useProfile } from '../context/ProfileContext';
import { AddVehicleSheet } from '../components/AddVehicleSheet';
import { AppSettingsSheet } from '../components/AppSettingsSheet';
import { Sheet } from '../components/Sheet';
import { EditProfileScreen } from './EditProfileScreen';

// A photo per vehicle type (bundled); other types fall back to the sedan.
const VEHICLE_PHOTOS = {
  Sedan: require('../../assets/home/vehicles/sedan.jpg'),
  Hatchback: require('../../assets/home/vehicles/hatchback.jpg'),
  SUV: require('../../assets/home/vehicles/suv.jpg'),
};
const vehiclePhoto = (type: string) => VEHICLE_PHOTOS[type as keyof typeof VEHICLE_PHOTOS] ?? VEHICLE_PHOTOS.Sedan;
const VEHICLE_SHADE = [
  { offset: '0', color: '#020617', opacity: 0 },
  { offset: '1', color: '#020617', opacity: 0.8 },
];

const HELP_LINE = '0112345678';

interface ProfileScreenProps {
  activeVehicle: string;
  onVehicleChange: (vehicleId: string) => void;
}

type SheetId = 'settings' | 'help' | 'about' | null;

/** The account page: who you are (tap to edit), how complete the profile is, your vehicles, then a list of rows. */
export const ProfileScreen: React.FC<ProfileScreenProps> = ({ activeVehicle, onVehicleChange }) => {
  const { isDark, toggle } = useTheme();
  const { profile, fullName, initials } = useProfile();
  const { vehicles, findVehicle } = useVehicles();
  const vehicle = findVehicle(activeVehicle);
  const [sheet, setSheet] = useState<SheetId>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);

  const row = (icon: string, label: string, onPress: () => void, accessibility: string, end?: React.ReactNode) => (
    <Pressable key={label} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]} onPress={onPress} accessibilityLabel={accessibility}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
      {end ?? <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.flex1} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Who you are: tap to edit */}
        <Pressable style={styles.top} onPress={() => setEditing(true)} accessibilityLabel="Edit profile">
          {profile.photo ? (
            <Image source={{ uri: profile.photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.nameRow}>
            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.nameArrow}>›</Text>
          </View>
          <View style={styles.member}>
            <Text style={styles.memberText}>OnGarage සාමාජික</Text>
          </View>
        </Pressable>

        {/* My vehicles */}
        <View style={styles.vehicleHero} accessibilityLabel="Active vehicle">
          <ImageBackground source={vehiclePhoto(vehicle.type)} style={styles.vehicleBg} imageStyle={styles.vehicleImage}>
            <Gradient stops={VEHICLE_SHADE} vertical />
            <View style={styles.vehicleCopy}>
              <Text style={styles.vehicleName}>{vehicle.name}</Text>
              <View style={styles.plate}>
                <Text style={styles.plateText}>{vehicle.plate}</Text>
              </View>
            </View>
          </ImageBackground>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleRow}>
          {vehicles.map((v) => {
            const active = v.id === vehicle.id;
            return (
              <Pressable key={v.id} style={styles.vehicleItem} onPress={() => onVehicleChange(v.id)} accessibilityLabel={`Vehicle ${v.name}`}>
                <View style={[styles.thumbRing, active && styles.thumbRingActive]}>
                  <Image source={vehiclePhoto(v.type)} style={styles.thumb} />
                </View>
                <Text style={[styles.thumbLabel, active && styles.thumbLabelActive]} numberOfLines={1}>
                  {v.name}
                </Text>
              </Pressable>
            );
          })}
          <Pressable style={styles.vehicleItem} onPress={() => setAdding(true)} accessibilityLabel="Add vehicle">
            <View style={[styles.thumbRing, styles.thumbAdd]}>
              <Text style={styles.thumbPlus}>＋</Text>
            </View>
            <Text style={styles.thumbLabel}>අලුත්</Text>
          </Pressable>
        </ScrollView>

        {/* Rows */}
        <View style={styles.menu}>
          {row(isDark ? '🌙' : '☀️', isDark ? 'අඳුරු මාදිලිය' : 'ආලෝක මාදිලිය', toggle, 'Toggle theme', <ThemeToggle isDark={isDark} onToggle={toggle} />)}
          {row('⚙️', 'යෙදුම් සැකසුම්', () => setSheet('settings'), 'Open app settings')}
          {row('❓', 'උදව් සහ සහාය', () => setSheet('help'), 'Open help')}
          {row('ℹ️', 'OnGarage ගැන', () => setSheet('about'), 'Open about')}
        </View>

        <Text style={styles.version}>OnGarage · v1.0.0</Text>
      </ScrollView>

      <EditProfileScreen visible={editing} onClose={() => setEditing(false)} />
      <AppSettingsSheet visible={sheet === 'settings'} onClose={() => setSheet(null)} />
      <Sheet visible={sheet === 'help'} title="උදව් සහ සහාය" subtitle="OnGarage කණ්ඩායම ඔබට උදව් කිරීමට සූදානම්" onClose={() => setSheet(null)}>
        <Pressable style={styles.helpRow} onPress={() => Linking.openURL(`tel:${HELP_LINE}`)} accessibilityLabel="Call support">
          <Text style={styles.menuIcon}>📞</Text>
          <View style={styles.flex1}>
            <Text style={styles.menuLabel}>සහාය අමතන්න</Text>
            <Text style={styles.helpSub}>{HELP_LINE} · සෑම දිනකම උ. 8 – රා. 8</Text>
          </View>
        </Pressable>
        <Text style={styles.helpText}>ගැටලුවක් ඇත්නම්: රැකියාවක් අවසන් වූ පසු “ගැටලුවක් ඇත” යොදා ගන්න; විසඳුණේ නැත්නම් OnGarage වෙත යොමු කළ හැක. ප්‍රිමියර් ගරාජවල රැකියා OnGarage Guarantee මගින් ආරක්ෂිතයි.</Text>
      </Sheet>
      <Sheet visible={sheet === 'about'} title="OnGarage ගැන" subtitle="v1.0.0" onClose={() => setSheet(null)}>
        <Text style={styles.helpText}>OnGarage යනු වාහන හිමියන්, ගරාජ, කොටස් වෙළඳසැල් සහ කාර්මිකයන් එක් කරන වෙළඳපොළයි. ඔබගේ රැකියා ඔබගේ QR / කේතයෙන් පමණක් අවසන් වේ; ශ්‍රේණි සැබෑ රැකියා මත පමණි.</Text>
      </Sheet>
      <AddVehicleSheet
        visible={adding}
        onClose={() => setAdding(false)}
        onAdded={(v) => {
          onVehicleChange(v.id);
          setAdding(false);
        }}
      />
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    container: { flex: 1, backgroundColor: Colors.bgBody },
    body: { padding: 16, gap: 14, paddingBottom: 100 },
    top: { alignItems: 'center', gap: 8, paddingTop: 4 },
    avatar: { width: 84, height: 84, borderRadius: 42 },
    avatarEmpty: { backgroundColor: Colors.subtleFill, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 26, fontWeight: '900', color: Colors.textMuted, letterSpacing: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    name: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMain },
    nameArrow: { fontSize: 24, color: Colors.textMain, marginTop: -3 },
    member: { paddingHorizontal: 12, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(14, 165, 233, 0.16)' },
    memberText: { fontSize: 10.5, fontFamily: FONTS.bodyBold, color: Colors.primary },
    // White text sits on the photo's dark shade.
    vehicleHero: { borderRadius: 18, overflow: 'hidden' },
    vehicleBg: { height: 150, justifyContent: 'flex-end' },
    vehicleImage: { borderRadius: 18, width: '100%', height: '100%' },
    vehicleCopy: { padding: 14, gap: 6 },
    vehicleName: { fontSize: 20, fontFamily: FONTS.titleBold, color: '#fff' },
    plate: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.9)' },
    plateText: { fontSize: 12, fontWeight: '800', color: '#0f172a', letterSpacing: 1 },
    vehicleRow: { gap: 12, paddingRight: 8 },
    vehicleItem: { width: 66, alignItems: 'center', gap: 5 },
    thumbRing: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: Colors.borderColor, padding: 2 },
    thumbRingActive: { borderColor: Colors.primary },
    thumb: { width: '100%', height: '100%', borderRadius: 26 },
    thumbAdd: { borderStyle: 'dashed', borderColor: Colors.subtleBorder, alignItems: 'center', justifyContent: 'center' },
    thumbPlus: { fontSize: 22, color: Colors.primary },
    thumbLabel: { fontSize: 10.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, textAlign: 'center' },
    thumbLabelActive: { color: Colors.primary, fontFamily: FONTS.bodySemiBold },
    // One white rounded row per item, like PickMe's account list.
    menu: { gap: 10 },
    menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 16, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    pressed: { backgroundColor: Colors.bgCardHover },
    menuIcon: { fontSize: 20, width: 28, textAlign: 'center' },
    menuLabel: { flex: 1, fontSize: 14, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chevron: { fontSize: 22, color: Colors.textMuted },
    helpRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.borderColor },
    helpSub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    helpText: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 19 },
    version: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: 'rgba(148, 163, 184, 0.5)', textAlign: 'center', marginTop: 4 },
  })
);
