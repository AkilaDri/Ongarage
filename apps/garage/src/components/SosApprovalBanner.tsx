import React from 'react';
import { StyleSheet, View } from 'react-native';
import { UrgentBar, UrgentBarButton } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';
import { money } from '../utils/format';

/**
 * An SOS job is running and its technician is asking for a repair charge above the estimate. Someone in an emergency is waiting, so this bar stays at the top of every
 * screen (the dispatch screen itself already shows the question) until it is answered, pulsing and buzzing the phone, and the garage owner can answer from right here
 * without leaving what they are doing: approve the charge, keep to the estimate, or open the job.
 */
export const SosApprovalBanner: React.FC = () => {
  const { activeJobs, dispatch, team, approveRepairPriceFor, openDispatch } = useGarage();
  // The ones whose dispatch screen is not open (there the question is already in front of the owner).
  const waiting = activeJobs.filter((d) => d.priceApproval?.status === 'pending' && d.id !== dispatch?.id);
  if (!waiting.length) return null;
  const d = waiting[0];
  const a = d.priceApproval!;
  const tech = team.find((m) => m.id === d.mechanicId)?.name ?? 'තාක්ෂණිකයා';
  const quote = d.quote?.price ?? 0;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <UrgentBar
        key={d.id}
        tone="urgent"
        since={a.askedAt ?? d.startedAt}
        title={`🚨 SOS — ${tech} අලුත්වැඩියා ගාස්තුව ${money(a.amount)} අනුමත කරන්න${waiting.length > 1 ? ` (+${waiting.length - 1})` : ''}`}
        actions={
          <>
            <UrgentBarButton primary label={`✓ ${money(a.amount)} අනුමත`} onPress={() => approveRepairPriceFor(d.id, true)} />
            <UrgentBarButton label={quote > 0 ? `ඇස්තමේන්තුවම ${money(quote)}` : 'ඇස්තමේන්තුවම'} onPress={() => approveRepairPriceFor(d.id, false)} />
            <UrgentBarButton label="විවෘත කරන්න" onPress={() => openDispatch(d.id)} />
          </>
        }
      >
        {d.request.customer.name} (SOS) ස්ථානයේ බලා සිටී — {tech} ඔබගේ පිළිතුර නැතිව වැඩ දිගටම කළ නොහැක. ඉක්මනින් පිළිතුරු දෙන්න.
      </UrgentBar>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 8, left: 6, right: 6, zIndex: 80 },
});
