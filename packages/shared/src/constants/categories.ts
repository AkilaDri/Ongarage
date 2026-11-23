import type { ServiceCategory } from '../types';

// The service taxonomy both apps agree on: owners browse it, garages declare what they offer.
export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: '1', name: 'Mechanical', icon: '🔧', color: '#38bdf8', subcategories: ['Engine Overhaul', 'Gearbox Repair', 'Timing Belt', 'Clutch Replacement', 'Head Gasket', 'Valve Clearance', 'Oil Leak / Seals', 'Engine Mounts', 'Water Pump / Thermostat', 'Radiator Repair', 'Turbocharger', 'VVT / VTEC', 'CV Joint / Drive Shaft', 'Differential / Propeller Shaft', 'Flywheel', 'Fuel Pump', 'Exhaust / Muffler', 'Latches & Gas Struts', 'Vacuum Pump', 'Balance Shaft / Oil Pump', 'Valve Body Repair', 'Dual Clutch Parts', 'Fuel Flap Release'] },
  { id: '14', name: 'Service', icon: '🛠️', color: '#0ea5e9', subcategories: ['Full Service', 'Oil Change', 'Engine Oil', 'Transmission Oil', 'Brake Fluid', 'Power Steering Oil', 'Air Filter', 'Cabin / AC Filter', 'Fuel Filter', 'Coolant Flush', 'Differential Oil', 'AdBlue / DEF', 'Spark Plugs', 'Throttle Body Cleaning', 'Injector Cleaning', 'MAF / MAP Cleaning', 'Carbon Cleaning', 'Belt & Hose Check', 'Washer Fluid', 'Transfer Case Fluid', 'Glow Plugs', 'Idle Adaptation', 'PCV Valve', 'Sunroof Drain Cleaning'] },
  { id: '2', name: 'Electrical', icon: '⚡', color: '#f59e0b', subcategories: ['Wiring Harness', 'Alternator', 'Starter Motor', 'Sensors', 'Fuse & Relay Box', 'Headlights / LED Upgrade', 'Power Windows & Locks', 'Keyless Entry', 'Power Mirrors', 'Rear Defogger', 'Sunroof Motor', 'Power Seats', 'Steering Wheel Controls', 'Camera & Parking Sensors', 'SRS / Airbag', 'Clock Spring', 'Tail Light Repair', 'Power Tailgate', 'Heated Mirror Glass', 'Memory / Heated Seats', 'Android Player', 'Trailer Wiring', 'Seat Belt Pretensioners', 'Occupant Sensors'] },
  { id: '3', name: 'Hybrid / EV', icon: '🔋', color: '#10b981', subcategories: ['Inverter Repair', 'Battery Diagnostics', 'Cooling System', 'ABS Unit', 'HV Battery Health (SOH)', 'Cell Balancing', 'Inverter Coolant Flush', 'Traction Motor Test', 'OBC / DC-DC Converter', 'Hybrid ABS Pump', 'EV AC Compressor', 'Hybrid Fan & Filter', 'HV Service Plug Handling', 'Busbar Cleaning', 'Cell Replacement'] },
  { id: '4', name: 'A/C Repair', icon: '❄', color: '#38bdf8', subcategories: ['AC Gas Refill', 'Compressor Repair', 'Evaporator Cleaning', 'Compressor Clutch / Valve', 'Condenser', 'Expansion Valve / Drier', 'Blower Motor / Resistor', 'Flap Actuators', 'AC Hose Repair', 'AC Deodorizing', 'Heater Core', 'Compressor Oil Top-Up'] },
  { id: '5', name: 'Scan ECU', icon: '💻', color: '#a855f7', subcategories: ['ECU Remapping', 'Live Diagnostics', 'Sensor Check', 'Chip Tuning', 'Fault Clearing', 'OBD2 Full Scan', 'Dual Clutch Calibration', 'Steering Angle Calibration', 'Oscilloscope Testing', 'ECU / Module Repair', 'Key Programming', 'VIN Matching / Cloning', 'Software Flashing', 'ADAS Calibration', 'Crash Data Reset', 'ACC Radar Calibration', 'Lane Camera Calibration', 'Blind Spot Radar'] },
  { id: '6', name: 'Tyres & Align', icon: '🛞', color: '#ec4899', subcategories: ['Wheel Alignment', 'Wheel Balancing', 'Tyre Replacement', 'Tyre Rotation', 'Puncture Repair', 'Nitrogen Fill', 'Suspension Play Check'] },
  { id: '7', name: 'Brake & Susp', icon: '🛑', color: '#ef4444', subcategories: ['Brake Pads', 'ABS Service', 'Shock Absorbers', 'Suspension Bushings', 'Brake Shoes / Cylinders', 'Caliper Service', 'Ball Joints & Arms', 'Wheel Bearings', 'Springs', 'Steering Rack', 'Tie Rod Ends', 'Power Steering Pump', 'Strut Mounts', 'Stabilizer Links', 'Rack Ends'] },
  { id: '8', name: 'Body & Paint', icon: '🎨', color: '#3b82f6', subcategories: ['Full Body Paint', 'Dent Removal', 'Scratch Repair', 'Bumper Fix', 'Accident / Frame Repair', 'Rust Treatment', 'Panel Touch-up Paint', 'Bumper Welding', 'Windscreen / Glass', 'Convertible Roof'] },
  { id: '9', name: 'Wash & Detail', icon: '✨', color: '#06b6d4', subcategories: ['Full Body Wash', 'Interior Detailing', 'Waxing', 'Engine Bay Wash', 'Underbody Wash', 'Polish & Paint Correction', 'Ceramic / PPF Coating', 'Steam Cleaning', 'Leather Care', 'Upholstery Restoration', 'Dashboard Restoration', 'Undercoating / Anti-Rust'] },
  { id: '10', name: 'Tuning', icon: '🚀', color: '#10b981', subcategories: ['ECU Tuning', 'Performance Exhaust', 'Turbo Upgrades', 'Dyno Test', 'Software Remapping', 'DTC Delete'] },
  { id: '11', name: 'Batteries', icon: '🔋', color: '#eab308', subcategories: ['Battery Replacement', 'Terminal Cleaning', 'Charging Check'] },
  { id: '12', name: 'Towing', icon: '🛻', color: '#f97316', subcategories: ['Flatbed Towing', 'Recovery Winch', 'Emergency Transport'] },
  { id: '15', name: 'Parts Fitting', icon: '🔩', color: '#14b8a6', subcategories: ['Brake Pads', 'Battery', 'Tyres', 'Lights & Bulbs', 'Filters', 'Belts & Hoses', 'Wipers', 'Other part'] },
  { id: '16', name: 'Fuel Station', icon: '⛽', color: '#ef4444', subcategories: ['Petrol', 'Diesel', 'Tyre Air Check', 'Oil Top-up', 'Coolant Top-up', 'Quick Wash'] },
  { id: '13', name: 'EV Charging', icon: '🔌', color: '#22c55e', subcategories: ['AC Charging Port', 'DC Fast Charging', 'Home Charger Install', 'Mobile EV Charging'] },
  // Motorbikes (b1-b14) and three-wheelers (t1-t15): the two-wheeler and three-wheeler service menus.
  { id: 'b1', name: 'General Bike Mechanical', icon: '🔧', color: '#0ea5e9', subcategories: ['Tune-up & Servicing', 'Carburetor Overhaul & Jetting', 'Clutch & Transmission', 'Braking System', 'Drive Train', 'Control Cables'] },
  { id: 'b2', name: 'Scooter & CVT Specialists', icon: '🛵', color: '#06b6d4', subcategories: ['CVT V-Belt & Variator', 'Centrifugal Clutch', 'Final Drive & Kick Start'] },
  { id: 'b3', name: 'Engine Overhaul & Lathe', icon: '⚙️', color: '#6366f1', subcategories: ['Cylinder & Piston', 'Crankshaft Work', 'Cylinder Head Work', 'Thread, Stud & Casing Repair (Argon Welding)'] },
  { id: 'b4', name: 'Cooling System & Radiator', icon: '💧', color: '#38bdf8', subcategories: ['Radiator Repair', 'Water Pump', 'Thermal Control'] },
  { id: 'b5', name: 'EFI, ABS & Diagnostics', icon: '🔍', color: '#14b8a6', subcategories: ['OBD2 Scanning', 'Fuel Injection', 'Fuel Delivery', 'ABS Diagnostics'] },
  { id: 'b6', name: 'EV / Electric Bike', icon: '🔋', color: '#22c55e', subcategories: ['Battery Pack Repair', 'BMS & Charging', 'Motor & Controller'] },
  { id: 'b7', name: 'Auto Electrical & Battery', icon: '⚡', color: '#f59e0b', subcategories: ['Wiring Harness', 'Charging & Ignition', 'Starting System', 'Battery Service & Charging'] },
  { id: 'b8', name: 'Digital Meter & Cluster', icon: '📟', color: '#a3a3a3', subcategories: ['Display Repair', 'Circuit & Sensor'] },
  { id: 'b9', name: 'Suspension, Fork & Chassis', icon: '🔩', color: '#a855f7', subcategories: ['Front Fork', 'Rear Suspension', 'Chassis & Handle'] },
  { id: 'b10', name: 'Rim & Tyre', icon: '🛞', color: '#64748b', subcategories: ['Spoke Wheel Truing', 'Alloy Wheel Repair', 'Tyre & Puncture'] },
  { id: 'b11', name: 'Tank, Body & Paint', icon: '🎨', color: '#ec4899', subcategories: ['Fuel Tank Restoration', 'Plastic & Fiber Welding', 'Painting & Decals'] },
  { id: 'b12', name: 'Key & Lock', icon: '🔑', color: '#eab308', subcategories: ['Key Cutting', 'Lock Repair', 'Immobilizer Programming'] },
  { id: 'b13', name: 'Exhaust & Welding', icon: '🔥', color: '#ef4444', subcategories: ['Exhaust Repair & Decat', 'General Welding'] },
  { id: 'b14', name: 'Service, Cushion & Accessories', icon: '🧽', color: '#16a34a', subcategories: ['Detailing & Wash', 'Seat Cushion', 'Accessories Fitment'] },
  { id: 't1', name: 'General Three-Wheeler Mechanical', icon: '🛺', color: '#0284c7', subcategories: ['2-Stroke / 4-Stroke Tuning', 'Drive & Differential', 'Braking System', 'Control Cables'] },
  { id: 't2', name: 'Engine, Gearbox & Lathe', icon: '⚙️', color: '#4f46e5', subcategories: ['Engine Overhaul', 'Gearbox & Clutch', 'Diesel Pump Work'] },
  { id: 't3', name: 'LPG Gas Conversion', icon: '🟢', color: '#84cc16', subcategories: ['Gas Kit Installation', 'Gas Tuning & Leak Repair'] },
  { id: 't4', name: 'Tinkering & Body Works', icon: '🔨', color: '#b45309', subcategories: ['Rust & Sheet Metal Work', 'Accident & Chassis Repair', 'Door & Gate Fitting'] },
  { id: 't5', name: 'Auto Painting & Wrapping', icon: '🖌️', color: '#db2777', subcategories: ['Full Body Painting', 'Protective Coating', 'Stickers & Wrapping'] },
  { id: 't6', name: 'Canopy & Cushion Works', icon: '🪑', color: '#8b5cf6', subcategories: ['Canopy / Hood Making', 'Side Curtains', 'Seats & Interior'] },
  { id: 't7', name: 'Suspension & Wheel Alignment', icon: '🛠️', color: '#7c3aed', subcategories: ['Front Fork Repair', 'Rear Suspension', 'Wheel Alignment'] },
  { id: 't8', name: 'Auto Electricals & Wiring', icon: '🔌', color: '#f97316', subcategories: ['Full Wiring', 'Wiper & Motors', 'Charging & Starting'] },
  { id: 't9', name: 'Taxi Meter & GPS', icon: '🚕', color: '#eab308', subcategories: ['Taxi Meter Calibration & Repair', 'GPS Tracking'] },
  { id: 't10', name: 'Car Audio & Sound', icon: '🔊', color: '#0d9488', subcategories: ['Sound Installation', 'Custom Enclosures'] },
  { id: 't11', name: 'Tyre & Rim Repair', icon: '🛞', color: '#475569', subcategories: ['Split Rim Repair', 'Tyre Services'] },
  { id: 't12', name: 'Windscreen & Lock', icon: '🪟', color: '#0891b2', subcategories: ['Windscreen Replacement', 'Lock & Key Repair'] },
  { id: 't13', name: 'Three-Wheeler Service Stations', icon: '🧼', color: '#059669', subcategories: ['Under-carriage Wash', 'Greasing & Lubrication'] },
  { id: 't14', name: 'Authorized Dealer Service', icon: '🏢', color: '#1e3a8a', subcategories: ['Warranty & Free Service', 'Insurance Claims'] },
  { id: 't15', name: 'Modification & Accessories', icon: '🎛️', color: '#f43f5e', subcategories: ['Stainless Steel Fittings', 'Interior & Exterior Styling'] },
];

// Typical price (LKR) of a job in each category: the owner app seeds simulated bids
// from it, the garage app uses it to suggest a competitive bid.
const MARKET_PRICE: Record<string, number> = {
  '1': 4500, '2': 3500, '3': 6500, '4': 3000, '5': 2500, '6': 2000,
  '7': 3800, '8': 9000, '9': 2500, '10': 12000, '11': 8000, '12': 3500, '13': 2000, '14': 6500, '15': 2500, '16': 1500,
};

export const marketPrice = (categoryId: string) => MARKET_PRICE[categoryId] ?? 4000;

export const categoryInfo = (categoryId: string) => SERVICE_CATEGORIES.find((c) => c.id === categoryId) ?? SERVICE_CATEGORIES[0];

/**
 * How a category works, which decides what the owner is offered:
 *  - 'job': repair and service work. Bids and direct bookings with garages.
 *  - 'place': somewhere to go (a fuel station, an EV charging point). The nearest ones are found and the owner navigates or calls; there are no bids, and only
 *    chargers take a booking (a time slot).
 *  - 'dispatch': something that comes to the owner (towing, a mobile EV charger). Booked, never bid for; the nearest, cheapest operator is chosen.
 */
export type ServiceMode = 'job' | 'place' | 'dispatch';

const CATEGORY_MODE: Record<string, ServiceMode> = { '16': 'place', '13': 'place', '12': 'dispatch' };
/** Sub-services whose mode differs from their category's (EV Charging holds a place, a job and a dispatch). */
const SUB_MODE: Record<string, Record<string, ServiceMode>> = {
  '13': { 'Home Charger Install': 'job', 'Mobile EV Charging': 'dispatch' },
};

export const serviceModeOf = (categoryId: string, subService?: string): ServiceMode =>
  (subService && SUB_MODE[categoryId]?.[subService]) || CATEGORY_MODE[categoryId] || 'job';

/** Only repair and service work can be posted for bids. */
export const canBid = (categoryId: string, subService?: string) => serviceModeOf(categoryId, subService) === 'job';
/** Fuel stations cannot be booked; EV chargers (a slot), towing (a dispatch) and every job can. */
export const canBook = (categoryId: string, subService?: string) => !(categoryId === '16' && serviceModeOf(categoryId, subService) === 'place');
/** Garages (and their cards, profiles, inquiries) belong to jobs and dispatches only: a station or a charger is a place. */
export const usesGarages = (categoryId: string, subService?: string) => serviceModeOf(categoryId, subService) !== 'place';

/** The sub-services of a category that can be posted for bids (a fuel station has none; EV Charging has only "Home Charger Install"). */
export const bidSubServices = (categoryId: string): string[] => (SERVICE_CATEGORIES.find((c) => c.id === categoryId)?.subcategories ?? []).filter((s) => canBid(categoryId, s));
/** The sub-services that garages offer (everything but the places: stations and charging ports). */
export const garageSubServices = (categoryId: string): string[] => (SERVICE_CATEGORIES.find((c) => c.id === categoryId)?.subcategories ?? []).filter((s) => usesGarages(categoryId, s));
