// The owner's closing code: shown as a QR on the owner's phone with the same six digits
// underneath, for when the QR can't be scanned (the owner reads it out). Used to close
// SOS and workshop jobs, and for collecting parts at a shop counter.

export const makeCloseCode = (): string => String(100000 + Math.floor(Math.random() * 900000));

/** "482913" → "482 913" for reading aloud. */
export const formatCloseCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

/** QR payload for a parts pickup at a shop counter (same six-digit format as closing codes). */
export const pickupCodePayload = (code: string) => `ongarage:pickup:${code}`;

export const checkCloseCode = (expected: string, entered: string) => entered.replace(/\D/g, '') === expected;

/** QR payload for an owner showing the purchase code at a parts shop (for a part a garage asked them to buy). */
export const purchaseCodePayload = (code: string) => `ongarage:purchase:${code}`;
