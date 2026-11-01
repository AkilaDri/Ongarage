/**
 * Which Home the owner gets.
 *  - 'search': the blue "Need a vehicle repair?" card keeps its free-quotes text and its ＋ (post a job) and also holds a search bar. Searching a service, a
 *    sub-service or a garage opens the nearest garages on a map, where the owner books one, sends an inquiry (OnChat), or asks every garage for bids.
 *  - 'bid': the Home as it was before the search flow: the blue card only posts a repair job, no search bar.
 * Switching the value back to 'bid' is the whole revert; the old layout is still in the code.
 */
export type HomeFlow = 'search' | 'bid';
export const HOME_FLOW: HomeFlow = 'search';
