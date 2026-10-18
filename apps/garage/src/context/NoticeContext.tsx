import { useGarage } from './GarageContext';

/** The OnMart code's notice hook: the garage's own toasts. */
export const useNotice = () => {
  const { notify } = useGarage();
  return { notify };
};
