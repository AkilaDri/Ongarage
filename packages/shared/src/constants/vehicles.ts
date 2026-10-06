export const VEHICLE_TYPES = [
  { id: 'Sedan', icon: '🚗', label: 'සෙඩාන්' },
  { id: 'Hatchback', icon: '🚘', label: 'හැච්බැක්' },
  { id: 'SUV', icon: '🚙', label: 'SUV' },
  { id: 'Van', icon: '🚐', label: 'වෑන්' },
  { id: 'Pickup', icon: '🛻', label: 'පිකප්' },
  { id: 'Motorbike', icon: '🏍️', label: 'යතුරුපැදි' },
  { id: 'Three-wheeler', icon: '🛺', label: 'ත්‍රීරෝද' },
] as const;

export const vehicleIcon = (type: string) => VEHICLE_TYPES.find((t) => t.id === type)?.icon ?? '🚗';

// "cab 1234", "CAB1234" and "wp-cab-1234" all become the "CAB-1234" / "WP-CAB-1234" form.
export const normalisePlate = (plate: string) =>
  plate
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '-')
    .replace(/([A-Z])(\d)/g, '$1-$2')
    .replace(/-+/g, '-');

