import type { ImageSourcePropType } from 'react-native';

/** The artwork of each SOS breakdown type (BREAKDOWN_TYPES id), the same pictures as the owner app, from assets/sos-icons. */
export const BREAKDOWN_IMAGES: Record<string, ImageSourcePropType> = {
  mechanical: require('../../assets/sos-icons/mechanical.png'),
  battery: require('../../assets/sos-icons/battery.png'),
  tire: require('../../assets/sos-icons/tire.png'),
  fuel: require('../../assets/sos-icons/fuel.png'),
  towing: require('../../assets/sos-icons/towing.png'),
  lockout: require('../../assets/sos-icons/lockout.png'),
  overheating: require('../../assets/sos-icons/overheating.png'),
  winching: require('../../assets/sos-icons/winching.png'),
  accident: require('../../assets/sos-icons/accident.png'),
};
