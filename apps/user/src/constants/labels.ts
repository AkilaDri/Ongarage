// Labels shared by the owner app's forms and detail views.
export const SPARE_PARTS = [
  { id: 'Genuine', label: 'ජෙනුයින් (Original)' },
  { id: 'OEM', label: 'OEM / Aftermarket' },
  { id: 'Recon', label: 'රීකන්ඩිෂන්' },
  { id: 'GarageChoice', label: 'ගරාජයේ තේරීම' },
];

export const sparePartLabel = (id: string) => SPARE_PARTS.find((p) => p.id === id)?.label ?? id;
