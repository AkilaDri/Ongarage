import type { ImageSourcePropType } from 'react-native';

/** Category artwork (the designer's cut-outs in assets/job cat icons), by SERVICE_CATEGORIES id. */
export const CATEGORY_IMAGES: Record<string, ImageSourcePropType> = {
  '1': require('../../assets/job cat icons/mechanical.png'),
  '2': require('../../assets/job cat icons/electrical.png'),
  '3': require('../../assets/job cat icons/hybrid.png'),
  '4': require('../../assets/job cat icons/ac.png'),
  '5': require('../../assets/job cat icons/scan.png'),
  '6': require('../../assets/job cat icons/tyres.png'),
  '7': require('../../assets/job cat icons/brakes.png'),
  '8': require('../../assets/job cat icons/paint.png'),
  '9': require('../../assets/job cat icons/wash.png'),
  '10': require('../../assets/job cat icons/tuning.png'),
  '11': require('../../assets/job cat icons/battery.png'),
  '12': require('../../assets/job cat icons/towing.png'),
  '13': require('../../assets/job cat icons/ev-charging.png'), // EV Charging
  '14': require('../../assets/job cat icons/service.png'), // Service
  '16': require('../../assets/job cat icons/petrol.png'), // Fuel Station
};

/**
 * Optical fit for each category icon. The artwork files differ in how much of the frame the drawing fills and where it
 * sits, so each one is scaled to a common visible size and centred on the drawing; dx / dy are fractions of the frame.
 * Worked out from each file's visible area: regenerate if an icon is replaced.
 */
export const CATEGORY_ICON_FIT: Record<string, { scale: number; dx: number; dy: number }> = {
  '1': { scale: 1.2, dx: 0.0035, dy: -0.0047 }, // mechanical
  '2': { scale: 1.2, dx: 0.0117, dy: 0.0058 }, // electrical
  '3': { scale: 1.11, dx: 0.0238, dy: -0.0108 }, // hybrid
  '4': { scale: 1.2, dx: 0.0163, dy: -0.0457 }, // ac
  '5': { scale: 1.143, dx: 0.0179, dy: -0.0491 }, // scan
  '6': { scale: 1.2, dx: 0.0047, dy: 0.0187 }, // tyres
  '7': { scale: 1.2, dx: 0.0023, dy: -0.021 }, // brakes
  '8': { scale: 1.2, dx: 0.0058, dy: -0.0282 }, // paint
  '9': { scale: 1.2, dx: 0.0351, dy: 0 }, // wash
  '10': { scale: 1.178, dx: -0.0161, dy: -0.0126 }, // tuning
  '11': { scale: 1.2, dx: 0, dy: -0.0047 }, // battery
  '12': { scale: 1.157, dx: 0.0011, dy: -0.0011 }, // towing
  '13': { scale: 1.12, dx: 0, dy: 0 }, // ev charging
  '14': { scale: 1.12, dx: 0, dy: 0 }, // service
  '16': { scale: 1.12, dx: 0, dy: 0 }, // fuel station
};
