import { rankCategories, SERVICE_CATEGORIES, type ServiceCategory } from '@ongarage/shared';

/** The service categories in the order the owner sees them: the common ones first, the same for everyone (see DEFAULT_POPULARITY). */
export const useRankedCategories = (): ServiceCategory[] => rankCategories(SERVICE_CATEGORIES);
