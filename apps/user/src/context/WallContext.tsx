import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { SAMPLE_UPLOAD_PHOTOS } from '../constants/mockData';

// The open wall for rare parts: other owners' posts (seeded here until the backend exists), plus likes,
// comments and private "I have it" replies to the poster. The owner's own wall requests come from MartContext.

export type WallComment = { id: string; author: string; text: string; at: number };

export type WallPost = {
  id: string;
  author: string;
  place: string;
  at: number;
  part: string;
  description: string;
  vehicle: string;
  photos: string[];
  baseLikes: number;
  /** SERVICE_CATEGORIES id the part belongs to, for the wall's category filters. */
  categoryId?: string;
};

export type WallReply = { price?: number; message: string; at: number };

const H = 3600000;
const T0 = Date.now();

const SEED: WallPost[] = [
  {
    id: 'w1', author: 'නිමල් පෙරේරා', place: 'කොළඹ 05', at: T0 - 1 * H, categoryId: '2', part: 'Toyota Aqua headlamp (වම)',
    description: 'ගිය සතියේ අනතුරකින් වම් headlamp එක කැඩුණා. Genuine හෝ හොඳ used එකක් හොයනවා. කාටහරි තියෙනවද?',
    vehicle: 'Toyota Aqua 2014', photos: [SAMPLE_UPLOAD_PHOTOS[2]], baseLikes: 12,
  },
  {
    id: 'w2', author: 'සුනිල් ප්‍රනාන්දු', place: 'ගම්පහ', at: T0 - 5 * H, categoryId: '2', part: 'Suzuki Wagon R ECU',
    description: 'ECU එක fail වෙලා. Part No. 33920-72K10 වගේ එකක්. Used හෝ reconditioned කමක් නෑ.',
    vehicle: 'Suzuki Wagon R FX 2012', photos: [SAMPLE_UPLOAD_PHOTOS[1]], baseLikes: 5,
  },
  {
    id: 'w3', author: 'චමරි ජයසිංහ', place: 'කුරුණෑගල', at: T0 - 9 * H, categoryId: '3', part: 'Honda Fit Hybrid IMA battery',
    description: 'IMA battery එකේ cells පරණ වෙලා. Replacement එකක් හෝ rebuilt එකක් තියෙන කෙනෙක් දන්නවනම් කියන්න.',
    vehicle: 'Honda Fit GP1 2011', photos: [SAMPLE_UPLOAD_PHOTOS[0]], baseLikes: 21,
  },
  {
    id: 'w4', author: 'රුවන් සිල්වා', place: 'ගාල්ල', at: T0 - 26 * H, categoryId: '1', part: 'Nissan Sunny B13 timing cover',
    description: 'පරණ Sunny B13 එකකට timing cover එක ඕනේ. අලුත් හම්බවෙන්නේ නෑ, හොඳ used එකක් වුනත් ඇති.',
    vehicle: 'Nissan Sunny B13 1994', photos: [], baseLikes: 8,
  },
  {
    id: 'w5', author: 'දිනේෂ් බණ්ඩාර', place: 'මහනුවර', at: T0 - 50 * H, categoryId: '1', part: 'Mitsubishi L200 turbo',
    description: 'L200 (4D56) turbo charger එක ගිහින්. Used හොඳ තත්වයේ එකක් හෝ rebuilt එකක් ඕනේ.',
    vehicle: 'Mitsubishi L200 2008', photos: [SAMPLE_UPLOAD_PHOTOS[1]], baseLikes: 3,
  },
];

const BASE_COMMENTS: Record<string, WallComment[]> = {
  w1: [{ id: 'c1', author: 'කසුන් ලියනගේ', text: 'Pettah පැත්තේ ඇහුවොත් තියෙන්න ඉඩ තියෙනවා.', at: T0 - 40 * 60000 }],
  w3: [
    { id: 'c2', author: 'අජිත් ද සිල්වා', text: 'මම rebuilt battery එකක් දැකලා තියෙනවා, ගාන ටිකක් වැඩියි.', at: T0 - 6 * H },
    { id: 'c3', author: 'තිලිණි', text: 'මටත් ඕනේ, follow කරනවා 👍', at: T0 - 5 * H },
  ],
};

type WallState = {
  posts: WallPost[];
  likes: (id: string, base: number) => { count: number; liked: boolean };
  toggleLike: (id: string) => void;
  commentsFor: (id: string) => WallComment[];
  addComment: (id: string, text: string) => void;
  replyFor: (id: string) => WallReply | undefined;
  sendReply: (id: string, reply: Omit<WallReply, 'at'>) => void;
};

const WallContext = createContext<WallState | null>(null);

export const WallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, WallComment[]>>({});
  const [replies, setReplies] = useState<Record<string, WallReply>>({});

  const toggleLike = useCallback((id: string) => setLiked((l) => ({ ...l, [id]: !l[id] })), []);
  const addComment = useCallback(
    (id: string, text: string) => setComments((c) => ({ ...c, [id]: [...(c[id] ?? []), { id: `${id}-${Date.now()}`, author: 'ඔබ', text, at: Date.now() }] })),
    []
  );
  const sendReply = useCallback((id: string, reply: Omit<WallReply, 'at'>) => setReplies((r) => ({ ...r, [id]: { ...reply, at: Date.now() } })), []);

  const value = useMemo<WallState>(
    () => ({
      posts: SEED,
      likes: (id, base) => ({ count: base + (liked[id] ? 1 : 0), liked: !!liked[id] }),
      toggleLike,
      commentsFor: (id) => [...(BASE_COMMENTS[id] ?? []), ...(comments[id] ?? [])],
      addComment,
      replyFor: (id) => replies[id],
      sendReply,
    }),
    [liked, comments, replies, toggleLike, addComment, sendReply]
  );
  return <WallContext.Provider value={value}>{children}</WallContext.Provider>;
};

export const useWall = () => {
  const ctx = useContext(WallContext);
  if (!ctx) throw new Error('useWall must be used inside WallProvider');
  return ctx;
};
