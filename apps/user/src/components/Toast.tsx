import React from 'react';
import { NoticeToast } from '@ongarage/shared';
import { useNotice } from '../context/NoticeContext';

// The owner app's notices (garage replies, job updates…).
export const Toast: React.FC<{ topOffset?: number }> = ({ topOffset }) => {
  const { notice, dismissNotice } = useNotice();
  return <NoticeToast notice={notice} onDismiss={dismissNotice} topOffset={topOffset} />;
};
