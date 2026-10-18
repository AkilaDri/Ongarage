import type { PartsFitting } from '@ongarage/shared';

/**
 * Lets a part the owner bought (in OnMart) start a "fit this part" job: the app registers how the post-a-job form opens, the order card calls it.
 */
type Opener = (fitting: PartsFitting) => void;

let opener: Opener | null = null;

export const setFittingOpener = (fn: Opener | null) => {
  opener = fn;
};

export const openFittingJob = (partName: string) => opener?.({ partName, supply: 'owner' });
