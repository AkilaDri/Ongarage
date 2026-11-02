/**
 * The sub-services each garage ticked when it registered, per service category id. A customer who picks a sub-service in the search sees only the
 * garages that ticked it. (Seeded here until the garage app's registration feeds the backend.)
 */
export const GARAGE_SUB_SERVICES: Record<string, Record<string, string[]>> = {
  '1': { '10': ['ECU Tuning', 'Performance Exhaust', 'Turbo Upgrades', 'Dyno Test', 'Software Remapping'], '5': ['ECU Remapping', 'Live Diagnostics', 'Fault Clearing'] },
  '2': { '3': ['Inverter Repair', 'ABS Unit', 'Cooling System', 'HV Battery Health (SOH)'], '7': ['ABS Service'] },
  '3': { '5': ['OBD2 Full Scan', 'Live Diagnostics', 'Sensor Check'], '2': ['Wiring Harness', 'Sensors', 'Fuse & Relay Box'] },
  '4': { '1': ['Engine Overhaul', 'Timing Belt', 'Head Gasket', 'Turbocharger'], '10': ['Turbo Upgrades'] },
  '5': { '14': ['Full Service', 'Oil Change', 'Engine Oil', 'Air Filter'], '4': ['AC Gas Refill', 'Compressor Clutch / Valve'], '1': ['Timing Belt', 'Water Pump / Thermostat'] },
  '6': { '3': ['Battery Diagnostics', 'HV Battery Health (SOH)', 'Cell Balancing', 'Inverter Repair'] },
  '7': { '4': ['AC Gas Refill', 'Compressor Repair', 'Condenser', 'Blower Motor / Resistor', 'Evaporator Cleaning'], '14': ['Full Service', 'Cabin / AC Filter'] },
  '8': { '9': ['Full Body Wash', 'Interior Detailing', 'Waxing', 'Engine Bay Wash', 'Ceramic / PPF Coating'], '8': ['Scratch Repair', 'Dent Removal'] },
  '9': { '6': ['Wheel Alignment', 'Wheel Balancing', 'Tyre Replacement'], '7': ['Brake Pads', 'Shock Absorbers', 'Wheel Bearings'] },
};
