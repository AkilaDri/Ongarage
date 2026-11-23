import { categoriesForVehicle } from '@ongarage/shared';
import type { Offer } from '../constants/home';

/** An offer for one service category shows only for a vehicle that category is worked on for; offers for every vehicle (new garages, protected jobs) always show. */
export const offerFitsVehicle = (offer: Offer, vehicleType: string): boolean =>
  'categoryId' in offer ? categoriesForVehicle(vehicleType).includes(offer.categoryId) : true;
