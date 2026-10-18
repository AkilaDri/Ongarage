/**
 * Every transaction made through OnGarage has an id the owner can quote anywhere: OG-<kind>-<5 characters>, e.g. OG-SOS-4F7K2.
 *   JOB  a repair job / an accepted bid (and its receipt)
 *   BKG  a direct booking with a garage
 *   SOS  an SOS service
 *   ORD  an OnMart order (a part bought or reserved)
 *   REQ  an OnMart part request (to shops or on the wall)
 * The id is worked out from the record's own id, so the same record shows the same transaction id on every screen.
 */
export type TxnKind = 'JOB' | 'BKG' | 'SOS' | 'ORD' | 'REQ';

const ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const txnId = (kind: TxnKind, source: string) => {
  let h = 2166136261;
  for (let i = 0; i < source.length; i++) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let out = '';
  let x = h;
  for (let i = 0; i < 5; i++) {
    out += ALPHABET[x % ALPHABET.length];
    x = Math.floor(x / ALPHABET.length) || (Math.imul(h, 2654435761) >>> 0);
  }
  return `OG-${kind}-${out}`;
};
