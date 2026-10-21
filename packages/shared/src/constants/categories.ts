import type { ServiceCategory } from '../types';

// The service taxonomy both apps agree on: owners browse it, garages declare what they offer.
export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: '1', name: 'Mechanical', icon: '🔧', color: '#38bdf8', subcategories: ['Engine Overhaul', 'Gearbox Repair', 'Timing Belt', 'Clutch Replacement'] },
  { id: '14', name: 'Service', icon: '🛠️', color: '#0ea5e9', subcategories: ['Full Service', 'Oil Change', 'Engine Oil', 'Transmission Oil', 'Brake Fluid', 'Power Steering Oil'] },
  { id: '2', name: 'Electrical', icon: '⚡', color: '#f59e0b', subcategories: ['Wiring Harness', 'Alternator', 'Starter Motor', 'Sensors'] },
  { id: '3', name: 'Hybrid / EV', icon: '🔋', color: '#10b981', subcategories: ['Inverter Repair', 'Battery Diagnostics', 'Cooling System', 'ABS Unit'] },
  { id: '4', name: 'A/C Repair', icon: '❄', color: '#38bdf8', subcategories: ['AC Gas Refill', 'Compressor Repair', 'Evaporator Cleaning'] },
  { id: '5', name: 'Scan ECU', icon: '💻', color: '#a855f7', subcategories: ['ECU Remapping', 'Live Diagnostics', 'Sensor Check', 'Chip Tuning', 'Fault Clearing'] },
  { id: '6', name: 'Tyres & Align', icon: '🛞', color: '#ec4899', subcategories: ['Wheel Alignment', 'Wheel Balancing', 'Tyre Replacement'] },
  { id: '7', name: 'Brake & Susp', icon: '🛑', color: '#ef4444', subcategories: ['Brake Pads', 'ABS Service', 'Shock Absorbers', 'Suspension Bushings'] },
  { id: '8', name: 'Body & Paint', icon: '🎨', color: '#3b82f6', subcategories: ['Full Body Paint', 'Dent Removal', 'Scratch Repair', 'Bumper Fix'] },
  { id: '9', name: 'Wash & Detail', icon: '✨', color: '#06b6d4', subcategories: ['Full Body Wash', 'Interior Detailing', 'Waxing', 'Engine Bay Wash'] },
  { id: '10', name: 'Tuning', icon: '🚀', color: '#10b981', subcategories: ['ECU Tuning', 'Performance Exhaust', 'Turbo Upgrades', 'Dyno Test'] },
  { id: '11', name: 'Batteries', icon: '🔋', color: '#eab308', subcategories: ['Battery Replacement', 'Terminal Cleaning', 'Charging Check'] },
  { id: '12', name: 'Towing', icon: '🛻', color: '#f97316', subcategories: ['Flatbed Towing', 'Recovery Winch', 'Emergency Transport'] },
  { id: '15', name: 'Parts Fitting', icon: '🔩', color: '#14b8a6', subcategories: ['Brake Pads', 'Battery', 'Tyres', 'Lights & Bulbs', 'Filters', 'Belts & Hoses', 'Wipers', 'Other part'] },
  { id: '16', name: 'Fuel Station', icon: '⛽', color: '#ef4444', subcategories: ['Petrol', 'Diesel', 'Tyre Air Check', 'Oil Top-up', 'Coolant Top-up', 'Quick Wash'] },
  { id: '13', name: 'EV Charging', icon: '🔌', color: '#22c55e', subcategories: ['AC Charging Port', 'DC Fast Charging', 'Home Charger Install', 'Mobile EV Charging'] },
];

// Typical price (LKR) of a job in each category: the owner app seeds simulated bids
// from it, the garage app uses it to suggest a competitive bid.
const MARKET_PRICE: Record<string, number> = {
  '1': 4500, '2': 3500, '3': 6500, '4': 3000, '5': 2500, '6': 2000,
  '7': 3800, '8': 9000, '9': 2500, '10': 12000, '11': 8000, '12': 3500, '13': 2000, '14': 6500, '15': 2500, '16': 1500,
};

export const marketPrice = (categoryId: string) => MARKET_PRICE[categoryId] ?? 4000;

export const categoryInfo = (categoryId: string) => SERVICE_CATEGORIES.find((c) => c.id === categoryId) ?? SERVICE_CATEGORIES[0];
