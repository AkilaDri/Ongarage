// An inquiry to a garage before booking it (the owner's chat with the garage opened from its card): the words it is written with, the same in both apps.

/** The first line says what it is about (service, sub-service, vehicle), then the owner's question. */
export const inquiryText = (o: { category: string; service?: string; vehicle?: string; text: string }) =>
  `❓ විමසීම · ${o.category}${o.service ? ` · ${o.service}` : ''}${o.vehicle ? ` · ${o.vehicle}` : ''}\n${o.text}`;

/** Quick answers a garage can give to an inquiry (it can still write its own). */
export const INQUIRY_REPLIES = [
  'ඔව්, අපට කළ හැක. වාහනය ගෙනෙන්න — පරීක්ෂා කර මිල කියමි.',
  'ඍජුවම “වෙන් කරන්න” ඔබා ඔබට ගැලපෙන වේලාවක් තෝරන්න.',
  'ඡායාරූපයක් එවන්න පුළුවන්ද?',
  'මිල කොටස් අනුව වෙනස් වේ — වාහනය බලා නිවැරදි මිල කියමි.',
];
