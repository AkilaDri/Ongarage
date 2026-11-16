import type { PartType } from '@ongarage/shared';

// Labels shared by the owner app's forms and detail views.
export const SPARE_PARTS: { id: PartType; label: string; help: string }[] = [
  { id: 'Genuine', label: 'ජෙනුයින් (Original)', help: 'වාහනය නිෂ්පාදකයාගේ මුල් කොටස. ගුණාත්මකභාවය වඩාත් විශ්වාසදායකයි, නමුත් මිල වැඩියි.' },
  { id: 'OEM', label: 'OEM / Aftermarket', help: 'OEM: නිෂ්පාදකයාට සැපයෙන එකම ගුණාත්මකභාවය, සාමාන්‍යයෙන් මිල අඩුයි. Aftermarket: වෙනත් නිෂ්පාදකයෙකුගේ, මිල සහ ගුණාත්මකභාවය වෙනස් වේ.' },
  { id: 'Recon', label: 'රීකන්ඩිෂන්', help: 'භාවිත කළ කොටසක් නැවත සකස් කළ එක. මිල අඩුයි, නමුත් වගකීම කෙටියි.' },
  { id: 'GarageChoice', label: 'ගරාජයේ තේරීම', help: 'ගරාජය මිල සහ ගුණාත්මකභාවය අනුව හොඳම කොටස තෝරයි. ඔබ ඒ තේරීම අනුමත කරයි.' },
];

export const sparePartLabel = (id: string) => SPARE_PARTS.find((p) => p.id === id)?.label ?? id;
