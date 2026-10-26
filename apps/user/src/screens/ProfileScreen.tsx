import { LkPlate, VehicleIcon3D } from '@ongarage/shared';
import { elevation1, outline, pageBg } from '../utils/material';
import { PAGE_TITLE_H } from '../constants/layout';
import React, { useRef, useState } from 'react';
import { Image, ImageBackground, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, getThemeMode, Gradient, ThemeToggle, themedStyles, useTheme } from '@ongarage/shared';
import { useLang } from '../context/LanguageContext';
import { useVehicles } from '../context/VehiclesContext';
import { useProfile } from '../context/ProfileContext';
import { AddVehicleSheet } from '../components/AddVehicleSheet';
import { nextServiceOf, ServiceRecordsSheet, useServiceRecords } from '../components/ServiceRecordsSheet';
import { SERVICE_KINDS } from '@ongarage/shared';
import { formatDate } from '../utils/format';
import { VEHICLE_DETAIL_FIELDS, VehicleDetailsSheet, vehicleDetailsDone } from '../components/VehicleDetailsSheet';
import { AppSettingsSheet } from '../components/AppSettingsSheet';
import { Sheet } from '../components/Sheet';
import { EditProfileScreen } from './EditProfileScreen';
import { PayReliabilityCard } from '../components/PayStandingViews';

const VEHICLE_SHADE = [
  { offset: '0', color: '#020617', opacity: 0 },
  { offset: '1', color: '#020617', opacity: 0.8 },
];

const HELP_LINE = '0112345678';

interface ProfileScreenProps {
  activeVehicle: string;
  onVehicleChange: (vehicleId: string) => void;
  /** 0 at the top, 1 once scrolled: how far the sheet has risen over the top band (as on Home). */
  onHeaderProgress?: (progress: number) => void;
}

type SheetId = 'settings' | 'help' | 'about' | null;

/** The account page: who you are (tap to edit), how complete the profile is, your vehicles, then a list of rows. */
export const ProfileScreen: React.FC<ProfileScreenProps> = ({ activeVehicle, onVehicleChange, onHeaderProgress }) => {
  const { isDark, toggle } = useTheme();
  const { lang, setLang } = useLang();
  const { profile, fullName, initials } = useProfile();
  const { vehicles, findVehicle } = useVehicles();
  const vehicle = findVehicle(activeVehicle);
  const [sheet, setSheet] = useState<SheetId>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [detailsFor, setDetailsFor] = useState<typeof vehicle | null>(null);
  const [recordsFor, setRecordsFor] = useState<typeof vehicle | null>(null);
  const serviceRecords = useServiceRecords(vehicle);
  const nextService = nextServiceOf(serviceRecords);
  // Progress of the chosen vehicle's details (the personal details have none).
  const done = vehicleDetailsDone(vehicle);
  const total = VEHICLE_DETAIL_FIELDS.length;
  const percent = Math.round((done / total) * 100);
  const missing = VEHICLE_DETAIL_FIELDS.filter((f) => !(vehicle[f.id] ?? '').toString().trim()).map((f) => ({ key: f.id, label: f.label.split(' (')[0], open: () => setDetailsFor(vehicle) }));

  const row = (icon: string, label: string, onPress: () => void, accessibility: string, end?: React.ReactNode, first?: boolean) => (
    <Pressable key={label} style={({ pressed }) => [styles.menuRow, !first && styles.menuRowLine, pressed && styles.pressed]} onPress={onPress} accessibilityLabel={accessibility}>
      <View style={styles.menuIconTile}>
        <Text style={styles.menuIcon}>{icon}</Text>
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      {end ?? <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.flex1}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          // The title band folds away in step with the scroll (the first PAGE_TITLE_H px) and comes back the same way, straight from the offset: no thresholds or
          // timers, so nothing shakes.
          onHeaderProgress?.(Math.min(1, Math.max(0, y / PAGE_TITLE_H)));
        }}
      >
        {/* Who you are, like a Google account page: a big avatar, the name, the contact line and a "manage" button */}
        <View style={styles.top}>
          <Pressable onPress={() => setEditing(true)} accessibilityLabel="Edit profile photo">
            {profile.photo ? (
              <Image source={{ uri: profile.photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarEmpty]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </Pressable>
          <Text style={styles.name}>{fullName}</Text>
          {!!(profile.email || profile.phone) && <Text style={styles.contactLine}>{profile.email || profile.phone}</Text>}
          <View style={styles.member}>
            <Text style={styles.memberText}>OnGarage සාමාජික</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.manageBtn, pressed && styles.pressed]} onPress={() => setEditing(true)} accessibilityLabel="Edit profile">
            <Text style={styles.manageText}>ඔබගේ ගිණුම කළමනාකරණය කරන්න</Text>
          </Pressable>
        </View>

        <PayReliabilityCard />

        {/* My vehicles: one card, the vehicles as chips, then the chosen one in full */}
        <View style={styles.gCard}>
          <View style={styles.gHead}>
            <Text style={styles.gHeadingInline}>මගේ වාහන</Text>
            <Pressable style={styles.addVehicleChip} onPress={() => setAdding(true)} accessibilityLabel="Add vehicle">
              <Text style={styles.addVehiclePlus}>＋</Text>
              <Text style={styles.addVehicleText}>අලුත් වාහනයක්</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleChips}>
            {vehicles.map((v) => {
              const active = v.id === vehicle.id;
              return (
                <Pressable key={v.id} style={[styles.vehicleChip, active && styles.vehicleChipOn]} onPress={() => onVehicleChange(v.id)} accessibilityLabel={`Vehicle ${v.name}`}>
                  <VehicleIcon3D type={v.type} size={24} />
                  <Text style={[styles.vehicleChipText, active && styles.vehicleChipTextOn]} numberOfLines={1}>
                    {v.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.vehicleTitle}>
            <View style={styles.vehicleEmojiTile}>
              <VehicleIcon3D type={vehicle.type} size={36} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.vehicleName} numberOfLines={2}>{vehicle.name}</Text>
              <LkPlate plate={vehicle.registrationNo || vehicle.plate} stacked={vehicle.type === 'Motorbike'} small />
            </View>
          </View>
          {/* How much of this vehicle's details is filled in (changes with the vehicle chosen above) */}
          <View style={styles.vehicleProgress} accessibilityLabel="Vehicle details completion">
            <View style={styles.progressTop2}>
              <Text style={styles.progressSub2}>{done === total ? '✓ සියලු තොරතුරු ඇතුළත් කර ඇත' : `තොරතුරු ${total} න් ${done} ක් ඇතුළත් කර ඇත`}</Text>
              <Text style={styles.progressPercent}>{percent}%</Text>
            </View>
            <View style={styles.progressTrack2}>
              <View style={[styles.progressFill, { width: `${percent}%` }]} />
            </View>
          </View>
          <View style={styles.vehicleInfoList}>
            {VEHICLE_DETAIL_FIELDS.map((f) => {
              const value = (vehicle[f.id] ?? '').toString().trim();
              return (
                <Pressable key={f.id} style={styles.infoRow} onPress={() => setDetailsFor(vehicle)} accessibilityLabel={`Edit ${f.label}`}>
                  <Text style={styles.infoLabel}>{f.label.split(' (')[0]}</Text>
                  {value ? <Text style={styles.infoValue}>{value}</Text> : <Text style={styles.infoAdd}>＋ ඇතුළත් කරන්න</Text>}
                </Pressable>
              );
            })}
          </View>
          {/* When the next service is due, from the record the garage wrote at the last one; the owner is reminded before it */}
          {nextService && (
            <View style={styles.nextService} accessibilityLabel="Next service">
              <View style={[styles.nextIcon, nextService.reminder.state !== 'ok' && styles.nextIconWarn]}>
                <Text style={styles.menuIcon}>🔔</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.menuLabel}>ඊළඟ සේවාව</Text>
                <Text style={styles.recordsSub}>
                  {[nextService.service.nextServiceAt ? formatDate(nextService.service.nextServiceAt) : '', nextService.service.nextServiceKm ? `${nextService.service.nextServiceKm.toLocaleString('en-US')} km` : ''].filter(Boolean).join(' · ')} · අවසන් සේවාව: {SERVICE_KINDS.find((k) => k.id === nextService.service.kind)?.label} ({nextService.service.mileageKm.toLocaleString('en-US')} km)
                </Text>
              </View>
              <View style={[styles.nextChip, nextService.reminder.state === 'ok' ? styles.nextChipOk : nextService.reminder.state === 'soon' ? styles.nextChipSoon : styles.nextChipLate]}>
                <Text style={styles.nextChipText}>
                  {nextService.reminder.state === 'ok' ? 'හරි' : nextService.reminder.state === 'soon' ? `දින ${nextService.reminder.daysLeft ?? '—'}` : nextService.reminder.state === 'due' ? 'අද' : 'ප්‍රමාදයි'}
                </Text>
              </View>
            </View>
          )}
          {/* The vehicle's service history: every job a garage finished on it is its own record */}
          <Pressable style={({ pressed }) => [styles.recordsRow, pressed && styles.pressed]} onPress={() => setRecordsFor(vehicle)} accessibilityLabel="Service records">
            <View style={styles.menuIconTile}>
              <Text style={styles.menuIcon}>🧾</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.menuLabel}>සේවා වාර්තා</Text>
              <Text style={styles.recordsSub}>{serviceRecords.length > 0 ? `ගරාජ මගින් කළ සේවා ${serviceRecords.length} ක්` : 'තවම සේවා වාර්තා නැත'}</Text>
            </View>
            {serviceRecords.length > 0 && (
              <View style={styles.recordsCount}>
                <Text style={styles.recordsCountText}>{serviceRecords.length}</Text>
              </View>
            )}
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Pressable style={styles.editDetails} onPress={() => setDetailsFor(vehicle)} accessibilityLabel="Edit vehicle details">
            <Text style={styles.editDetailsText}>✎ වාහන තොරතුරු සංස්කරණය</Text>
          </Pressable>
        </View>

        {/* Settings and help: one card of list rows */}
        <View style={styles.gCard}>
          {row(isDark ? '🌙' : '☀️', isDark ? 'අඳුරු මාදිලිය' : 'ආලෝක මාදිලිය', toggle, 'Toggle theme', <ThemeToggle isDark={isDark} onToggle={toggle} />, true)}
          {row(
            '🌐',
            'භාෂාව / Language',
            () => setLang(lang === 'si' ? 'en' : 'si'),
            'Change language',
            <View style={styles.langSwitch}>
              {(['si', 'en'] as const).map((l) => (
                <Pressable key={l} style={[styles.langChip, lang === l && styles.langChipOn]} onPress={() => setLang(l)} accessibilityLabel={l === 'si' ? 'Sinhala' : 'English'}>
                  <Text style={[styles.langText, lang === l && styles.langTextOn]}>{l === 'si' ? 'සිං' : 'EN'}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {row('⚙️', 'යෙදුම් සැකසුම්', () => setSheet('settings'), 'Open app settings')}
          {row('❓', 'උදව් සහ සහාය', () => setSheet('help'), 'Open help')}
          {row('ℹ️', 'OnGarage ගැන', () => setSheet('about'), 'Open about')}
        </View>

        <Text style={styles.version}>OnGarage · v1.0.0</Text>
      </ScrollView>

      <EditProfileScreen visible={editing} onClose={() => setEditing(false)} />
      <VehicleDetailsSheet vehicle={detailsFor} onClose={() => setDetailsFor(null)} />
      <ServiceRecordsSheet vehicle={recordsFor} onClose={() => setRecordsFor(null)} />
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
    // Google-account look: grey page, white 12px cards with an outline, a blue heading in each, rows split by hairlines.
    gCard: { backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: outline(), ...elevation1(), overflow: 'hidden' },
    gHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
    addVehicleChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 32, borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    addVehiclePlus: { fontSize: 14, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    addVehicleText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    gHeadingInline: { fontSize: 14, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    vehicleProgress: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, gap: 6 },
    progressTop2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressSub2: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    progressTrack2: { height: 8, borderRadius: 4, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#e8eaed', overflow: 'hidden' },
    progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14 },
    progressPercent: { fontSize: 20, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    progressTrack: { height: 8, borderRadius: 4, marginHorizontal: 16, marginTop: 8, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#e8eaed', overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: 4, backgroundColor: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    progressSub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, paddingHorizontal: 16, paddingTop: 8 },
    missingRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
    missingChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 32, borderRadius: 8, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard },
    missingPlus: { fontSize: 13, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    missingText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    infoAdd: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    recordsRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e8eaed' },
    nextService: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e8eaed' },
    nextIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    nextIconWarn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(253, 214, 99, 0.2)' : '#fef7e0' },
    nextChip: { paddingHorizontal: 10, height: 26, justifyContent: 'center', borderRadius: 8 },
    nextChipOk: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.16)' : '#e6f4ea' },
    nextChipSoon: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(253, 214, 99, 0.2)' : '#fef7e0' },
    nextChipLate: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(242, 139, 130, 0.2)' : '#fce8e6' },
    nextChipText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    recordsSub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    recordsCount: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.34)' : '#d2e3fc' },
    recordsCountText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    editDetails: { marginHorizontal: 16, marginBottom: 14, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: outline() },
    editDetailsText: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    gHeading: { fontSize: 14, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8', paddingHorizontal: 16, paddingTop: 14 },
    contactLine: { fontSize: 13.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    manageBtn: { marginTop: 6, paddingHorizontal: 20, height: 40, borderRadius: 20, justifyContent: 'center', borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard },
    manageText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    vehicleChips: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
    vehicleChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 8, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard },
    vehicleChipOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    vehicleChipEmoji: { fontSize: 16 },
    vehicleChipPlus: { fontSize: 16, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    vehicleChipText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted, maxWidth: 140 },
    vehicleChipTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    menuIconTile: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    menuRowLine: { borderTopWidth: 1, borderTopColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e8eaed' },
    container: { flex: 1, backgroundColor: pageBg() },
    body: { paddingHorizontal: 6, paddingTop: 8, gap: 12, paddingBottom: 100 },
    top: { alignItems: 'center', gap: 6, paddingTop: 8, paddingBottom: 6 },
    avatar: { width: 96, height: 96, borderRadius: 48 },
    avatarEmpty: { backgroundColor: Colors.subtleFill, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 26, fontWeight: '900', color: Colors.textMuted, letterSpacing: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    name: { fontSize: 22, lineHeight: 28, fontFamily: FONTS.titleBold, color: Colors.textMain, marginTop: 6, textAlign: 'center' },
    nameArrow: { fontSize: 24, color: Colors.textMain, marginTop: -3 },
    member: { paddingHorizontal: 12, height: 26, justifyContent: 'center', borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    memberText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    // White text sits on the photo's dark shade.
    vehicleContainer: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    vehicleInfoPanel: { flex: 1, gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: outline(), ...elevation1() },
    vehicleHero: { flex: 1, borderRadius: 12, overflow: 'hidden' },
    vehicleBg: { flex: 1, justifyContent: 'flex-end' },
    vehicleImage: { borderRadius: 12, width: '100%', height: '100%' },
    vehicleCopy: { gap: 6 },
    vehicleName: { fontSize: 20, lineHeight: 26, fontFamily: FONTS.titleBold, color: Colors.textMain },
    plate: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: Colors.bgDark },
    plateText: { fontSize: 11.5, fontWeight: '800', color: Colors.primary, letterSpacing: 0.5 },
    vehicleInfoList: { paddingHorizontal: 16, paddingBottom: 12 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: getThemeMode() === 'dark' ? Colors.borderColor : '#e8eaed' },
    infoLabel: { fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    infoValue: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, maxWidth: '60%', textAlign: 'right' },
    vehicleRow: { gap: 12, paddingRight: 8 },
    vehicleItem: { width: 66, alignItems: 'center', gap: 5 },
    thumbRing: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: Colors.borderColor, padding: 2 },
    thumbRingActive: { borderColor: Colors.primary },
    thumb: { width: '100%', height: '100%', borderRadius: 26 },
    thumbAdd: { borderStyle: 'dashed', borderColor: Colors.subtleBorder, alignItems: 'center', justifyContent: 'center' },
    thumbPlus: { fontSize: 22, color: Colors.primary },
    thumbLabel: { fontSize: 11.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted, textAlign: 'center' },
    thumbLabelActive: { color: Colors.primary, fontFamily: FONTS.bodySemiBold },
    vehicleRightPanel: { flex: 1, gap: 8, paddingVertical: 10, paddingHorizontal: 10, backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: outline(), ...elevation1(), justifyContent: 'space-between' },
    vehicleColumnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    vehicleColumnItem: { width: '48%', alignItems: 'center', gap: 3, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 8 },
    vehicleColumnItemActive: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    vehicleColumnThumb: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#f1f3f4' },
    vehicleColumnThumbActive: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    vehicleColumnEmoji: { fontSize: 24 },
    vehicleTitle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 6 },
    vehicleEmojiTile: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    vehicleEmoji: { fontSize: 26 },
    vehicleAddButton: { alignItems: 'center', gap: 3, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 10 },
    vehicleAddIcon: { width: 44, height: 44, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.subtleBorder, alignItems: 'center', justifyContent: 'center' },
    vehicleColumnLabel: { fontSize: 10, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', maxWidth: 56 },
    vehicleColumnLabelActive: { color: Colors.primary, fontFamily: FONTS.bodySemiBold },
    vehicleAddLabel: { fontSize: 10, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', maxWidth: 56 },
    // One white rounded row per item, like PickMe's account list.
    menu: { gap: 10 },
    menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
    pressed: { backgroundColor: Colors.bgCardHover },
    menuIcon: { fontSize: 18, textAlign: 'center' },
    langSwitch: { flexDirection: 'row', gap: 4, padding: 3, borderRadius: 16, backgroundColor: Colors.subtleFill },
  langChip: { minWidth: 38, height: 26, paddingHorizontal: 8, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  langChipOn: { backgroundColor: '#1a73e8' },
  langText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: Colors.textMuted },
  langTextOn: { color: '#ffffff' },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    chevron: { fontSize: 22, color: Colors.textMuted },
    helpRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: outline(), ...elevation1() },
    helpSub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    helpText: { fontSize: 13.5, fontFamily: FONTS.bodyRegular, color: Colors.textSoft, lineHeight: 21 },
    version: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, textAlign: 'center', marginTop: 4 },
  })
);
