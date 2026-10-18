import { useGarage } from './GarageContext';

/** The buyer's name and phone on an OnMart request: the garage's. */
export const useProfile = () => {
  const { profile } = useGarage();
  return { fullName: profile.name, profile: { phone: profile.phone } };
};
