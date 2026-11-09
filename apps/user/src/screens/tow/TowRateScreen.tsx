import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FONTS, Gradient, themedStyles } from '@ongarage/shared';
import { useVehicles } from '../../context/VehiclesContext';
import type { TowPaidDraft } from './TowPayScreen';

/** Screen 7 of the towing flow: rate the driver, then, for a temporary vehicle, offer to keep it in the owner's list. The job closes here. */
export type TowReview = { stars: number; comment: string };

export const TowRateScreen: React.FC<{
  draft: TowPaidDraft;
  /** The job is closed: the flow ends and the Activity list takes the record with the review. */
  onDone: (review: TowReview) => void;
  /** Puts the tow away: the rating can be given later from the return bar. */
  onMinimize?: () => void;
}> = ({ draft, onDone, onMinimize }) => {
  const { bid, vehicle } = draft;
  const { addVehicle } = useVehicles();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [rated, setRated] = useState(false);
  const [color, setColor] = useState('');
  const isTemp = vehicle.source === 'temp';

  const submitRating = () => {
    setRated(true);
    if (!isTemp) onDone({ stars, comment: comment.trim() });
  };

  // Save the temporary vehicle to the list: the plate and the make and model are kept, the colour is optional. The type defaults to a car.
  const saveVehicle = () => {
    if (vehicle.source === 'temp') addVehicle({ name: vehicle.makeModel || vehicle.plate, plate: vehicle.plate, type: 'Car', color: color.trim() || undefined });
    onDone({ stars, comment: comment.trim() });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.band}>
        <Gradient stops={[{ offset: '0', color: '#1d367f' }, { offset: '1', color: '#111f4d' }]} />
        <View style={styles.topBar}>
          <View style={styles.pill}>
            <View style={styles.pillDisc}><Text style={styles.pillEmoji}>⭐</Text></View>
            <View style={styles.flex1}>
              <Text style={styles.pillTitle} numberOfLines={1}>{rated ? 'වාහනය සුරක්ෂිතයි' : 'ශ්‍රේණිගත කරන්න'}</Text>
              <Text style={styles.pillSub} numberOfLines={1}>{bid.name}</Text>
            </View>
          </View>
          {onMinimize && !rated && (
              <View style={styles.topSlot}>
              <Pressable style={styles.roundBtn} onPress={onMinimize} accessibilityLabel="Minimise towing">
                <Text style={styles.minText}>⌄</Text>
              </Pressable>
              </View>
            )}
        </View>
        <View style={styles.progressRow}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.progressBar, styles.progressBarOn]} />
          ))}
        </View>
      </View>

      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.body}>
          {!rated && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{`${bid.name} ගැන ඔබේ අදහස`}</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => setStars(n)} hitSlop={6} accessibilityLabel={`${n} stars`}>
                      <Text style={[styles.star, n <= stars && styles.starOn]}>★</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput style={styles.input} value={comment} onChangeText={setComment} placeholder="අදහසක් (විකල්පයි)" placeholderTextColor={Colors.textMuted} multiline accessibilityLabel="Comment for the driver" />
              </View>
              <Pressable style={[styles.action, stars === 0 && styles.actionOff]} disabled={stars === 0} onPress={submitRating} accessibilityLabel="Send the rating">
                <Text style={styles.actionTitle}>යවන්න</Text>
              </Pressable>
            </>
          )}

          {rated && isTemp && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{`${vehicle.plate} ඔබේ වාහන ලැයිස්තුවට එකතු කරන්නද?`}</Text>
                <Text style={styles.sub}>ඊළඟ වතාවේ මේ වාහනය නැවත ඇතුළත් කරන්න ඕන නැහැ. වර්ණය විකල්පයි.</Text>
                <TextInput style={styles.input} value={color} onChangeText={setColor} placeholder="වර්ණය (විකල්පයි)" placeholderTextColor={Colors.textMuted} accessibilityLabel="Vehicle colour" />
              </View>
              <Pressable style={styles.action} onPress={saveVehicle} accessibilityLabel="Add this vehicle to my list">
                <Text style={styles.actionTitle}>ඔව්, එකතු කරන්න</Text>
              </Pressable>
              <Pressable style={styles.secondary} onPress={() => onDone({ stars: 0, comment: '' })} accessibilityLabel="Do not add the vehicle">
                <Text style={styles.secondaryText}>නැහැ</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.bgBody },
    band: { height: 130, overflow: 'hidden' },
    topBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
    minText: { fontSize: 22, color: Colors.textMain, marginTop: -6 },
    topSlot: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
    pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard },
    pillEmoji: { fontSize: 20 },
    pillDisc: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
    stepNo: { color: '#1d367f', fontFamily: FONTS.bodyBold },
    pillTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    pillSub: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    progressRow: { position: 'absolute', left: 16, right: 16, bottom: 14, flexDirection: 'row', gap: 6 },
    progressBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
    progressBarOn: { backgroundColor: '#ffffff' },
    sheet: { flex: 1, marginTop: -24, backgroundColor: Colors.bgBody, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
    body: { padding: 18, gap: 12, paddingBottom: 40 },
    card: { padding: 16, borderRadius: 18, backgroundColor: Colors.bgCard, gap: 10 },
    cardTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18 },
    starRow: { flexDirection: 'row', gap: 8 },
    star: { fontSize: 34, color: Colors.subtleBorder },
    starOn: { color: '#f59e0b' },
    input: { minHeight: 46, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.subtleFill, color: Colors.textMain, fontFamily: FONTS.bodyRegular, fontSize: 15 },
    action: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1d367f' },
    actionOff: { opacity: 0.4 },
    actionTitle: { fontSize: 15, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    secondary: { height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard },
    secondaryText: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: '#1d367f' },
    flex1: { flex: 1 },
  })
);
