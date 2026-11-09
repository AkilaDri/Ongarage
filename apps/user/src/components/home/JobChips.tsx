import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FONTS, POPULAR_SERVICES, SERVICE_CATEGORIES, serviceReminder, themedStyles, type ServiceCategory } from '@ongarage/shared';
import { useVehicles } from '../../context/VehiclesContext';
import { useWorkshops } from '../../context/WorkshopContext';
import { nextServiceOf, useServiceRecords } from '../ServiceRecordsSheet';

const MAX_CHIPS = 3;

type Chip = { key: string; label: string; icon: string; category: ServiceCategory; sub?: string };

/**
 * Three suggested jobs for the active vehicle, chosen in this order (spec §6.1):
 *  1. The next service if it is due (soon, due or overdue) — "Oil Change", "Full Service"
 *  2. Jobs this vehicle has had before (different categories, most recent first)
 *  3. Popular services as a fallback
 *
 * Each chip opens the category browse with the sub-service already chosen.
 * UX 24 (Hick): three choices, not twenty. UX 89: defaults the owner would pick.
 */
export const JobChips: React.FC<{ onService: (c: ServiceCategory, sub?: string) => void; onAll: () => void }> = ({ onService, onAll }) => {
  const { activeVehicle } = useVehicles();
  const records = useServiceRecords(activeVehicle);
  const { workshops } = useWorkshops();

  const chips = useMemo<Chip[]>(() => {
    const out: Chip[] = [];
    const seen = new Set<string>();
    const add = (label: string, icon: string, cat: ServiceCategory, sub?: string) => {
      const k = `${cat.id}:${sub ?? ''}`;
      if (seen.has(k) || out.length >= MAX_CHIPS) return;
      seen.add(k);
      out.push({ key: k, label, icon, category: cat, sub });
    };

    // 1. Next service if it is due (soon / due / overdue): the most likely reason the owner opened the app.
    const next = nextServiceOf(records);
    if (next?.reminder && next.reminder.state !== 'ok') {
      const cat = SERVICE_CATEGORIES.find((c) => c.id === '14');
      if (cat) {
        const sub = next.service.kind === 'oil' ? 'Oil Change' : next.service.kind === 'full' ? 'Full Service' : undefined;
        add(sub ?? 'Service', sub === 'Oil Change' ? '🛢️' : '🛠️', cat, sub);
      }
    }

    // 2. Past jobs of this vehicle (closed workshops), most recent first, each category only once.
    const past = Object.values(workshops)
      .filter((w) => w.vehicleId === activeVehicle.id && w.progress.stage === 'closed')
      .sort((a, b) => (b.progress.closedAt ?? b.scheduledAt) - (a.progress.closedAt ?? a.scheduledAt));
    for (const job of past) {
      const cat = SERVICE_CATEGORIES.find((c) => c.id === job.categoryId);
      if (cat) add(job.subService ?? cat.name, cat.icon ?? '🔧', cat, job.subService);
    }

    // 3. Popular services as fallback (the common jobs every vehicle needs).
    for (const p of POPULAR_SERVICES) {
      const cat = SERVICE_CATEGORIES.find((c) => c.id === p.categoryId);
      if (cat) add(p.sub, p.icon, cat, p.sub);
    }

    return out;
  }, [records, workshops, activeVehicle.id]);

  return (
    <View style={styles.row}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.chips} accessibilityLabel="Suggested jobs for this vehicle">
        {chips.map((c) => (
          <Pressable key={c.key} style={({ pressed }) => [styles.chip, pressed && styles.pressed]} onPress={() => onService(c.category, c.sub)} accessibilityLabel={`${c.label} job`} accessibilityRole="button">
            <Text style={styles.chipIcon}>{c.icon}</Text>
            <Text style={styles.chipText} numberOfLines={1}>{c.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable style={({ pressed }) => [styles.chip, pressed && styles.pressed]} onPress={onAll} accessibilityLabel="All services" accessibilityRole="button">
        <Text style={styles.chipText}>සියලු ›</Text>
      </Pressable>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
    scroll: { flex: 1 },
    chips: { flexDirection: 'row', gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 12, borderRadius: 19, backgroundColor: Colors.bgCard },
    pressed: { opacity: 0.7 },
    chipIcon: { fontSize: 15 },
    chipText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
  })
);
