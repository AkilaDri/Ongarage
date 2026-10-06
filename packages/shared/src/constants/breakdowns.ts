// SOS breakdown kinds: the owner picks one, the garage sees it on the request.
export const BREAKDOWN_TYPES = [
  { id: 'mechanical', icon: '⚙️', label: 'එන්ජින් දෝෂය' },
  { id: 'battery', icon: '🔋', label: 'බැටරි ජම්ප්ස්ටාර්ට්' },
  { id: 'tire', icon: '🛞', label: 'ටයර් පන්චර්' },
  { id: 'fuel', icon: '⛽', label: 'ඉන්ධන ගෙන්වීම' },
  { id: 'towing', icon: '🛻', label: 'ටෝ කිරීම' },
  { id: 'lockout', icon: '🔑', label: 'යතුර / අගුල' },
  { id: 'overheating', icon: '🌡️', label: 'එන්ජිම රත්වීම' },
  { id: 'winching', icon: '⛓️', label: 'වින්ච් සහාය' },
  { id: 'accident', icon: '🚑', label: 'අනතුරු සහාය' },
] as const;

export type BreakdownId = (typeof BREAKDOWN_TYPES)[number]['id'];

export const breakdownInfo = (id: string) => BREAKDOWN_TYPES.find((b) => b.id === id) ?? BREAKDOWN_TYPES[0];
