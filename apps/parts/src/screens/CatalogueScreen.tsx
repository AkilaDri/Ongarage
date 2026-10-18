import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, EmptyState, FONTS, PART_TAXONOMY_GROUPS, entryLabel, groupInfo, partInfo, softEdge, softShadow, themedStyles, usePinnedEdge, PinnedEdge } from '@ongarage/shared';
import { useShop } from '../context/ShopContext';
import { CatalogueEntrySheet } from '../components/CatalogueEntrySheet';
import { StockScreen } from './StockScreen';
import type { ShopCatalogueEntry } from '@ongarage/shared';

type Mode = 'catalogue' | 'prices';

/**
 * What the shop sells and for which vehicles. Buyers' searches are matched against this, so there is nothing to count
 * on the shelves; the optional price list (the old stock screen) is the second segment.
 */
export const CatalogueScreen: React.FC = () => {
  const { progress: edge, scrollProps } = usePinnedEdge();
  const { profile, demand } = useShop();
  const [mode, setMode] = useState<Mode>('catalogue');
  const [editing, setEditing] = useState<{ entry: ShopCatalogueEntry | null } | null>(null);
  const catalogue = profile.catalogue ?? [];

  return (
    <View style={styles.flex1}>
      <View style={styles.seg}>
        <PinnedEdge progress={edge} />
        {(['catalogue', 'prices'] as Mode[]).map((m) => (
          <Pressable key={m} style={[styles.segBtn, mode === m && styles.segOn]} onPress={() => setMode(m)}>
            <Text style={[styles.segText, mode === m && styles.segTextOn]}>{m === 'catalogue' ? 'Catalogue' : 'මිල ලැයිස්තුව (විකල්ප)'}</Text>
          </Pressable>
        ))}
      </View>
      {mode === 'prices' ? (
        <StockScreen />
      ) : (
        <ScrollView style={styles.flex1} {...scrollProps} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.headRow}>
            <Text style={styles.hint}>ඔබ අලෙවි කරන කොටස් සහ වාහන. ගනුදෙනුකරුවන්ගේ සෙවුම් මේවාට ගැළපෙන විට ඉල්ලීම ඔබට එයි.</Text>
            <Pressable style={styles.addBtn} onPress={() => setEditing({ entry: null })} accessibilityLabel="Add catalogue line">
              <Text style={styles.addText}>＋</Text>
            </Pressable>
          </View>
          {!!demand.length && (
            <View style={styles.demand}>
              <Text style={styles.demandText}>📈 ගනුදෙනුකරුවන් ඉල්ලූ, ඔබේ Catalogue එකේ නැති කොටස්: {demand.slice(0, 3).map((d) => d.name).join(', ')}</Text>
            </View>
          )}
          {catalogue.length === 0 ? (
            <EmptyState icon="📚" title="Catalogue එක හිස්" text="“＋” ඔබා ඔබ අලෙවි කරන කොටස් එක් කරන්න." />
          ) : (
            PART_TAXONOMY_GROUPS.filter((g) => catalogue.some((e) => e.groupId === g.id)).map((g) => (
              <View key={g.id} style={styles.group}>
                <Text style={styles.groupTitle}>
                  {g.icon} {g.si}
                </Text>
                {catalogue
                  .filter((e) => e.groupId === g.id)
                  .map((e) => (
                    <Pressable key={e.id} style={styles.card} onPress={() => setEditing({ entry: e })} accessibilityLabel={`Edit ${entryLabel(e)}`}>
                      <Text style={styles.name}>{e.partId ? partInfo(e.partId)?.si || partInfo(e.partId)?.name : `${groupInfo(e.groupId)?.si} (සියල්ල)`} ✎</Text>
                      <Text style={styles.sub}>{e.vehicles.length ? e.vehicles.map((v) => (v.models?.length ? `${v.make} ${v.models.join('/')}` : v.make)).join(', ') : 'සියලු වාහන'}</Text>
                      <Text style={styles.sub}>
                        {e.partTypes.join(' · ')}
                        {e.brands.length ? ` · ${e.brands.join(', ')}` : ''}
                      </Text>
                    </Pressable>
                  ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
      <CatalogueEntrySheet target={editing} onClose={() => setEditing(null)} />
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    seg: { zIndex: 5, flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    segBtn: { flex: 1, paddingVertical: 9, borderRadius: 18, alignItems: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge() },
    segOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    segText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    segTextOn: { color: '#ffffff' },
    body: { padding: 16, gap: 12, paddingBottom: 100 },
    headRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    hint: { flex: 1, fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    addBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
    addText: { fontSize: 22, color: '#fff', fontWeight: '700' },
    demand: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(245, 158, 11, 0.12)' },
    demandText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.warning, lineHeight: 17 },
    group: { gap: 8 },
    groupTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    card: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), borderRadius: 16, padding: 12, gap: 2, ...softShadow() },
    name: { fontSize: 13, fontFamily: FONTS.titleBold, color: Colors.textMain },
    sub: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
  })
);
