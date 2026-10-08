import React from 'react';
import { purchaseCodePayload } from '../marketplace/closeCode';
import { CloseCode } from './CloseCode';

/**
 * The code an owner shows at a parts shop (QR with the six digits under it). The shop enters it
 * to record the purchase; for parts a garage asked the owner to buy, it also tells the garage.
 */
export const PurchaseCode: React.FC<{ code: string; title?: string; caption?: string; size?: number }> = ({ code, title, caption, size }) => (
  <CloseCode code={code} title={title ?? 'වෙළඳසැලේදී පෙන්වන කේතය'} caption={caption ?? 'කොටස රැගෙන යන විට මෙය වෙළඳසැලට පෙන්වන්න — එය ඔබගේ මිලදී ගැනීම තහවුරු කරයි.'} size={size} payload={purchaseCodePayload(code)} />
);
