import { useGarage } from './GarageContext';

/** Where the buyer is, for OnMart: the garage's own place. */
export const useUserLocation = () => {
  const { profile } = useGarage();
  return { coords: profile.coords, address: profile.address, locality: profile.address };
};
