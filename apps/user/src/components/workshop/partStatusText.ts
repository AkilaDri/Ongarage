import { money } from '@ongarage/shared';
import type { JobPartStatus } from '../../utils/jobParts';

/** The line that says where a job part has got to: the same words on the job card, in the pop-up and in OnMart. */
export const partStatusText = (s: JobPartStatus): string => {
  switch (s.state) {
    case 'held':
      return 'ගරාජයට දැනුම් දුන්නා · පිළිතුරු දෙන තුරු නවතා ඇත';
    case 'waiting':
      return `වෙළඳසැල් ${s.shopsAsked ?? 0} කට යැව්වා · පිළිතුරු බලාපොරොත්තුවෙන්`;
    case 'offers':
      return `මිල ගණන් ${s.offers}${s.fromPrice ? ` · ${money(s.fromPrice)} සිට` : ''}`;
    case 'reserved':
      return s.toCheck ? 'පරීක්ෂා කර මිලදී ගැනීමට සූදානම්' : 'වෙළඳසැලක වෙන් කර ඇත';
    case 'toGive':
      return `${s.bought!.shopName} වෙතින් මිලදී ගත්තා · ${money(s.bought!.amount)}`;
    case 'checking':
      return 'ගරාජය කොටස පරීක්ෂා කරමින්';
    case 'wrong':
      return `⚠️ වැරදි කොටසක්${s.wrongReason ? ` · ${s.wrongReason}` : ''}`;
    case 'done':
      return '✓ ගරාජයට නිවැරදි කොටස ලැබුණා';
    default:
      return '';
  }
};
