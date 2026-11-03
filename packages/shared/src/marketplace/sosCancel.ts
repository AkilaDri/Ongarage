// Owner cancelling an SOS request (the cancel rule for the SOS flow). What an owner pays depends on how far the help has come:
// nothing before a technician is on the way, the call-out fee once he has set off, and no cancelling at all once he has arrived,
// because the work has started or is finished. Cancelling after the work is done must never cost less than the job.

/** Where the SOS job is. */
export type SosStage = 'searching' | 'enRoute' | 'arrived' | 'repairing' | 'completed';

/** What cancelling costs the owner at a stage. */
export type SosCancelRule = 'free' | 'calloutFee' | 'locked';

export const sosCancelRule = (stage: SosStage): SosCancelRule => {
  if (stage === 'searching') return 'free';
  if (stage === 'enRoute') return 'calloutFee';
  return 'locked';
};

/** The amount an owner pays to cancel at this stage. Zero when cancelling is free, the travel (call-out) fee when the technician is on the way, nothing is refunded when locked. */
export const cancelFeeFor = (stage: SosStage, calloutFee: number): number => {
  const rule = sosCancelRule(stage);
  if (rule === 'free') return 0;
  if (rule === 'calloutFee') return calloutFee;
  return 0;
};

/** Whether the owner can still cancel at this stage (free or with the call-out fee). */
export const canCancelSos = (stage: SosStage): boolean => sosCancelRule(stage) !== 'locked';
