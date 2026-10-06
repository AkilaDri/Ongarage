import React from 'react';
import { NoticeToast } from '@ongarage/shared';
import { useTech } from '../context/TechContext';

// The technician store's notices (new jobs, approvals, ratings…).
export const Toast: React.FC<{ topOffset?: number }> = ({ topOffset }) => {
  const { notice, dismissNotice } = useTech();
  return <NoticeToast notice={notice} onDismiss={dismissNotice} topOffset={topOffset} />;
};
