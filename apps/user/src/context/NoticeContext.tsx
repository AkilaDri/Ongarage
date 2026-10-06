import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { Notice } from '@ongarage/shared';

// In-app notices (toasts) for things the owner didn't trigger themselves — a garage
// replying, a job moving on — the same pattern as the garage, parts and technician apps.

type NoticeState = {
  notice: Notice | null;
  notify: (n: Omit<Notice, 'id'>) => void;
  dismissNotice: () => void;
};

const NoticeContext = createContext<NoticeState | null>(null);

export const NoticeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notice, setNotice] = useState<Notice | null>(null);
  const id = useRef(0);
  const notify = useCallback((n: Omit<Notice, 'id'>) => setNotice({ ...n, id: ++id.current }), []);
  const dismissNotice = useCallback(() => setNotice(null), []);
  return <NoticeContext.Provider value={{ notice, notify, dismissNotice }}>{children}</NoticeContext.Provider>;
};

export const useNotice = () => {
  const ctx = useContext(NoticeContext);
  if (!ctx) throw new Error('useNotice must be used inside NoticeProvider');
  return ctx;
};
