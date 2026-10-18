import React, { useRef } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { UrgentBar, UrgentBarButton } from '@ongarage/shared';
import { useTech } from '../context/TechContext';
import { money } from '../utils/format';

/**
 * The technician asked the garage to approve a repair charge above its estimate and waits (the customer is waiting too): this bar stays on every tab, with how long it has
 * been, a call button for the garage and a way back to the job, until the garage answers.
 */
export const ApprovalWaitingBar: React.FC = () => {
  const { jobs, openJob, openSOS } = useTech();
  const job = jobs.find((j) => j.kind === 'sos' && j.stage === 'approval');
  // When this job was first seen waiting (the job record carries no timestamp for it).
  const seen = useRef<Record<string, number>>({});
  if (!job || openJob?.id === job.id) return null;
  if (!seen.current[job.id]) seen.current[job.id] = Date.now();

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <UrgentBar
        key={job.id}
        tone="waiting"
        since={seen.current[job.id]}
        title={`⏳ ${job.garage.name} ගේ අනුමැතිය බලාපොරොත්තුවෙන් — ${money(job.approval?.amount ?? 0)}`}
        actions={
          <>
            <UrgentBarButton primary label="📞 ගරාජය අමතන්න" onPress={() => Linking.openURL(`tel:${job.garage.phone.replace(/\s/g, '')}`)} />
            <UrgentBarButton label="රැකියාවට ආපසු" onPress={() => openSOS(job.id)} />
          </>
        }
      >
        {job.customer.name} බලා සිටී. අනුමැතිය ප්‍රමාද වුවහොත් ගරාජය අමතන්න.
      </UrgentBar>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 8, left: 6, right: 6, zIndex: 80 },
});
