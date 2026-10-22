// SOS breakdown kinds: the owner picks one, the garage sees it on the request.
export const BREAKDOWN_TYPES = [
  { id: 'mechanical', icon: '⚙️', label: 'එන්ජින්' },
  { id: 'battery', icon: '🔋', label: 'බැටරි' },
  { id: 'tire', icon: '🛞', label: 'ටයර්' },
  { id: 'fuel', icon: '⛽', label: 'ඉන්ධන' },
  { id: 'towing', icon: '🛻', label: 'ටෝ' },
  { id: 'lockout', icon: '🔑', label: 'අගුල' },
  { id: 'overheating', icon: '🌡️', label: 'රත්වීම' },
  { id: 'winching', icon: '⛓️', label: 'වින්ච්' },
  { id: 'accident', icon: '🚑', label: 'අනතුර' },
] as const;

export type BreakdownId = (typeof BREAKDOWN_TYPES)[number]['id'];

export const breakdownInfo = (id: string) => BREAKDOWN_TYPES.find((b) => b.id === id) ?? BREAKDOWN_TYPES[0];
