// How OnMart groups a shop's stock lines into categories (and the look of each category's tile).

/** The part categories of OnMart's filter bar, with the words that put a stock line in each (and the look of its tile). */
export const CATEGORIES: { id: string; emoji: string; name: string; tint: string; match: RegExp }[] = [
  { id: 'brakes', emoji: '🛑', name: 'බ්‍රේක්', tint: '#fde2e0', match: /brake|pad|disc|rotor|caliper/i },
  { id: 'battery', emoji: '🔋', name: 'බැටරි', tint: '#dff5e6', match: /batter/i },
  { id: 'oil', emoji: '🛢️', name: 'ඔයිල් / ෆිල්ටර්', tint: '#fdf0d2', match: /oil|filter|lubric|coolant|fluid/i },
  { id: 'electrical', emoji: '⚡', name: 'විදුලි', tint: '#fff2c6', match: /alternator|starter|plug|sensor|ignition|coil|wiring|fuse|relay/i },
  { id: 'ac', emoji: '❄️', name: 'A/C', tint: '#dff0fb', match: /\bac\b|a\/c|compressor|condenser|refrigerant|cabin|blower/i },
  { id: 'engine', emoji: '🔧', name: 'එන්ජින්', tint: '#e8e4f7', match: /timing|belt|piston|gasket|engine|clutch|gear|cam|turbo|radiator|hose|pump|chain/i },
  { id: 'suspension', emoji: '🚙', name: 'සස්පෙන්ෂන්', tint: '#e6ecf3', match: /shock|spring|suspension|arm|bush|strut|link|ball joint/i },
  { id: 'lights', emoji: '💡', name: 'ලයිට්', tint: '#fff7d6', match: /light|lamp|bulb|headlight|tail/i },
  { id: 'hybrid', emoji: '🔋', name: 'හයිබ්‍රිඩ්', tint: '#d9f3ea', match: /hybrid|inverter|ima\b/i },
];
export const OTHER = { id: 'other', emoji: '🔩', name: 'වෙනත්', tint: '#e8eef6' };
export const categoryOf = (name: string) => CATEGORIES.find((c) => c.match.test(name)) ?? OTHER;

/** A line's sub-category: its part name without the position / size detail ("Brake pads (front)" -> "Brake pads"). */
export const subOf = (name: string) => name.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+\d.*$/, '').trim();
