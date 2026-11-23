export const VEHICLE_TYPES = [
  { id: 'Sedan', icon: '🚗', label: 'සෙඩාන්' },
  { id: 'Hatchback', icon: '🚘', label: 'හැච්බැක්' },
  { id: 'SUV', icon: '🚙', label: 'SUV' },
  { id: 'Van', icon: '🚐', label: 'වෑන්' },
  { id: 'Pickup', icon: '🛻', label: 'පිකප්' },
  { id: 'Motorbike', icon: '🏍️', label: 'යතුරුපැදි' },
  { id: 'Three-wheeler', icon: '🛺', label: 'ත්‍රීරෝද' },
  { id: 'Bus', icon: '🚌', label: 'බස්' },
  { id: 'Lorry', icon: '🚚', label: 'ලොරි' },
] as const;

export const vehicleIcon = (type: string) => VEHICLE_TYPES.find((t) => t.id === type)?.icon ?? '🚗';

/** The three kinds of vehicle the service menu is built for: cars, motorbikes and three-wheelers, and heavy vehicles (buses, lorries). */
export type VehicleGroup = 'car' | 'twoThree' | 'heavy';

export const vehicleGroup = (type: string): VehicleGroup =>
  type === 'Motorbike' || type === 'Three-wheeler' ? 'twoThree' : type === 'Bus' || type === 'Lorry' ? 'heavy' : 'car';

/** The service category ids (SERVICE_CATEGORIES) each kind of vehicle is worked on for. */
export const BIKE_CATEGORY_IDS = Array.from({ length: 14 }, (_, i) => `b${i + 1}`);
export const THREE_WHEELER_CATEGORY_IDS = Array.from({ length: 15 }, (_, i) => `t${i + 1}`);

export const GROUP_CATEGORY_IDS: Record<VehicleGroup, string[]> = {
  car: ['1', '14', '2', '6', '7', '11', '4', '5', '3', '8', '9', '10', '12', '13', '15', '16'],
  twoThree: [...BIKE_CATEGORY_IDS, ...THREE_WHEELER_CATEGORY_IDS],
  heavy: ['1', '7', '6', '14', '2'],
};

/** The service category ids for one vehicle type. */
export const categoriesForVehicle = (type: string): string[] =>
  type === 'Motorbike' ? BIKE_CATEGORY_IDS : type === 'Three-wheeler' ? THREE_WHEELER_CATEGORY_IDS : GROUP_CATEGORY_IDS[vehicleGroup(type)];

// "cab 1234", "CAB1234" and "wp-cab-1234" all become the "CAB-1234" / "WP-CAB-1234" form.
export const normalisePlate = (plate: string) =>
  plate
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '-')
    .replace(/([A-Z])(\d)/g, '$1-$2')
    .replace(/-+/g, '-');

