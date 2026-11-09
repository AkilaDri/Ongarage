import type { Garage } from '../types';

// Owners must be able to trust what they see, so a garage buys ad space only with a good rating and enough reviews behind it.
export const AD_MIN_RATING = 4.0;
export const AD_MIN_REVIEWS = 10;

export const adEligible = (g: Pick<Garage, 'rating' | 'reviews'>) => g.rating >= AD_MIN_RATING && g.reviews >= AD_MIN_REVIEWS;
