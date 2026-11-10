import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton, Colors, FONTS, Gradient, pointsForJob, themedStyles } from '@ongarage/shared';
import { useVehicles } from '../../context/VehiclesContext';
import type { TowPaidDraft } from './TowPayScreen';
import type { TowSite } from '@ongarage/shared';

/** The rating, as the SOS rating step: stars, then a tier's tags as chips. There is no text box. */
export type TowReview = { stars: number; comment: string };

/** The step this screen is in: the rating is the last of the five towing steps. */
const STEP_NO = 5;
/** Chips for the site work the truck did, shown with the good and middle tiers. */
const SITE_TAG: Partial<Record<TowSite, string>> = {
  winch: 'ඇදීම හොඳින් කළා',
  mud: 'මඩෙන් හොඳින් ඉවත් කළා',
  rocks: 'ගල් මත හොඳින් ගත්තා',
  tightAccess: 'පටු තැන හොඳින් ගත්තා',
};

/** How long the points show before the job closes (the SOS pace). */
const REWARD_MS = 2600;
/** The chips for each tier, the same wording as SOS. */
const GOOD_TAGS = ['වේලාවට පැමිණියා', 'දක්ෂ සේවාව', 'මිල සාධාරණයි', 'කාරුණික හැසිරීම'];
const BAD_TAGS = ['ප්‍රමාද විය', 'මිල වැඩියි', 'වැඩේ අසම්පූර්ණයි', 'නරක හැසිරීම'];
const MID_TAGS = ['වේලාවට පැමිණියා', 'මිල සාධාරණයි', 'වැඩේ නිම විය'];
/** Three tiers: 1–2 stars, 3 stars, 4–5 stars. A change of tier clears the chips picked for the old tier. */
const tierOf = (r: number) => (r >= 4 ? 'good' : r === 3 ? 'mid' : 'bad');
const tagsFor = (r: number, sites: TowSite[] = []) => {
  const base = r >= 4 ? GOOD_TAGS : r === 3 ? MID_TAGS : BAD_TAGS;
  // The site work the owner named comes first, so a winch or mud job gets its own chips.
  const siteTags = r >= 3 ? sites.map((s) => SITE_TAG[s]).filter((t): t is string => !!t) : [];
  return [...siteTags, ...base];
};
const ratingLabel = (r: number) =>
  r === 0 ? 'තරුවක් තට්ටු කරන්න' : r === 5 ? 'විශිෂ්ටයි!' : r === 4 ? 'ඉතා හොඳ සේවාවක්!' : r === 3 ? 'හොඳ සේවාවක්' : r === 2 ? 'වැඩිදියුණු විය යුතුයි' : 'ඉතා දුර්වලයි';

/** Screen 7 of the towing flow: rate the operator, then, for a temporary vehicle, offer to keep it in the owner's list. The job closes here. */
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
  const [tags, setTags] = useState<string[]>([]);
  const [rated, setRated] = useState(false);
  const isTemp = vehicle.source === 'temp';

  const pickStar = (n: number) => {
    if (rated) return;
    if (tierOf(n) !== tierOf(stars)) setTags([]);
    setStars(n);
  };
  const toggleTag = (t: string) => rated || setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const review = () => ({ stars, comment: tags.join(', ') });

  // A temporary vehicle is offered for the owner's list once the rating is in; the job is closed in both cases.
  const points = pointsForJob({ closed: true, rated: stars > 0 }).total;
  const submit = () => setRated(true);
  // The OnGarage points show for a moment, then the job closes (a temporary vehicle waits for its own answer).
  useEffect(() => {
    if (!rated || isTemp) return;
    const t = setTimeout(() => onDone(review()), REWARD_MS);
    return () => clearTimeout(t);
  }, [rated]);
  const saveVehicle = () => {
    if (isTemp) addVehicle({ name: vehicle.makeModel || vehicle.plate, plate: vehicle.plate, type: 'Car' });
    onDone(review());
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.band}>
        <Gradient stops={[{ offset: '0', color: '#1d367f' }, { offset: '1', color: '#111f4d' }]} />
        <View style={styles.topBar}>
          <View style={styles.pill}>
            <View style={styles.pillDisc}>
              <Text style={styles.pillEmoji}>⭐</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.pillTitle} numberOfLines={1}>Ongarage Towing</Text>
              <View style={styles.stepRow}>
                <View style={styles.stepChip}>
                  <Text style={styles.stepNo}>{`${STEP_NO}/5`}</Text>
                </View>
                <Text style={styles.pillSub} numberOfLines={1}>{rated ? `· ${bid.name}` : '· ශ්‍රේණිගත කරන්න'}</Text>
              </View>
            </View>
          </View>
          {onMinimize && !rated && (
            <Pressable style={styles.roundBtn} onPress={onMinimize} accessibilityLabel="Minimise towing">
              <Text style={styles.minText}>⌄</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.progressRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.progressBar, styles.progressBarOn]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, styles.centerCard]}>
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarEmoji}>🛻</Text>
                </View>
              </View>
              <Text style={styles.heroTitle}>{bid.name}</Text>
              <Text style={styles.cardSub}>{vehicle.source === 'temp' ? vehicle.plate : 'ඔබේ වාහනය'}</Text>
              <Text style={styles.question}>සේවාව කෙසේද?</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => pickStar(n)} hitSlop={6} accessibilityLabel={`Rate ${n} stars`}>
                    <Text style={[styles.starBig, stars >= n && styles.starOn]}>{stars >= n ? '★' : '☆'}</Text>
                  </Pressable>
                ))}
              </View>
              {/* The label's space is kept from the start, so the chips do not jump when the first star is tapped. */}
              <View style={styles.labelSlot}>
                {stars > 0 && <Text style={[styles.label, { color: stars >= 4 ? Colors.success : Colors.textMuted }]}>{ratingLabel(stars)}</Text>}
              </View>
              {stars > 0 && (
                <View style={styles.tagWrap}>
                  {tagsFor(stars, draft.route.sites).map((t) => {
                    const on = tags.includes(t);
                    return (
                      <Pressable key={t} style={[styles.tag, on && styles.tagOn]} onPress={() => toggleTag(t)} accessibilityLabel={`Tag ${t}`}>
                        <Text style={[styles.tagText, on && styles.tagTextOn]}>{t}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

          {rated && (
            <View style={styles.reward}>
              <Gradient stops={[{ offset: '0', color: '#10b981' }, { offset: '1', color: '#047857' }]} />
              <Text style={styles.rewardIcon}>🎁</Text>
              <Text style={styles.rewardTitle}>ස්තූතියි!</Text>
              <Text style={styles.rewardText}>OnGarage ලකුණු — රැකියාව සහ ශ්‍රේණිගත කිරීම</Text>
              <View style={styles.pointsPill}>
                <Text style={styles.pointsText}>{`💎 +${points} ලකුණු`}</Text>
              </View>
              {!isTemp && <Text style={styles.rewardText}>මුල් පිටුවට යොමු කරමින්...</Text>}
            </View>
          )}

          {rated && isTemp && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{`${vehicle.plate} ඔබේ වාහන ලැයිස්තුවට එකතු කරන්නද?`}</Text>
              <Text style={styles.cardSub}>ඊළඟ වතාවේ මේ වාහනය නැවත ඇතුළත් කරන්න ඕන නැහැ.</Text>
              <ActionButton label="ඔව්, එකතු කරන්න" variant="primary" onPress={saveVehicle} />
              <ActionButton label="නැහැ" variant="ghost" onPress={() => onDone({ stars: 0, comment: '' })} />
            </View>
          )}
        </ScrollView>

        {!rated && (
          <View style={styles.bottomBar}>
            <ActionButton label={stars === 0 ? 'ශ්‍රේණිගත නොකර අවසන් කරන්න' : 'ශ්‍රේණිගත කිරීම යවන්න'} icon="✓" variant="primary" onPress={submit} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.bgBody },
    flex1: { flex: 1 },
    band: { height: 130, overflow: 'hidden' },
    topBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
    minText: { fontSize: 22, color: Colors.textMain, marginTop: -6 },
    pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 16, borderRadius: 26, backgroundColor: Colors.bgCard },
    pillEmoji: { fontSize: 20 },
    pillDisc: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
    pillTitle: { fontSize: 13.5, fontFamily: FONTS.titleBold, color: Colors.textMain },
    pillSub: { flexShrink: 1, fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#dbeafe' },
    stepNo: { fontSize: 12, color: '#1d367f', fontFamily: FONTS.bodyBold },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.subtleBorder, marginTop: 10 },
    progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, paddingTop: 12 },
    progressBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: Colors.subtleBorder },
    progressBarOn: { backgroundColor: '#1a73e8' },
    sheet: { flex: 1, marginTop: -24, backgroundColor: Colors.bgBody, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
    body: { padding: 16, gap: 12, paddingBottom: 24 },
    card: { padding: 16, borderRadius: 18, backgroundColor: Colors.bgCard, gap: 10 },
    centerCard: { alignItems: 'center' },
    avatarRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: Colors.subtleBorder, alignItems: 'center', justifyContent: 'center' },
    avatar: { width: 66, height: 66, borderRadius: 33, backgroundColor: Colors.subtleFill, alignItems: 'center', justifyContent: 'center' },
    avatarEmoji: { fontSize: 30 },
    heroTitle: { fontSize: 18, fontFamily: FONTS.titleBold, color: Colors.textMain, textAlign: 'center' },
    cardTitle: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    cardSub: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 18, textAlign: 'center' },
    question: { fontSize: 15, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, marginTop: 4 },
    starsRow: { flexDirection: 'row', gap: 8 },
    starBig: { fontSize: 38, color: Colors.subtleBorder },
    starOn: { color: '#f59e0b' },
    labelSlot: { minHeight: 22, justifyContent: 'center' },
    label: { fontSize: 14, fontFamily: FONTS.bodyBold },
    tagWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
    tag: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: Colors.subtleFill },
    tagOn: { backgroundColor: '#1d367f' },
    tagText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    tagTextOn: { color: '#ffffff' },
    reward: { padding: 20, borderRadius: 18, overflow: 'hidden', alignItems: 'center', gap: 8 },
    rewardIcon: { fontSize: 36 },
    rewardTitle: { fontSize: 20, fontFamily: FONTS.titleBold, color: '#ffffff' },
    rewardText: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: '#ecfdf5', textAlign: 'center', lineHeight: 19 },
    pointsPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)' },
    pointsText: { fontSize: 14, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    bottomBar: { padding: 16, paddingTop: 12, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.subtleBorder },
  })
);
