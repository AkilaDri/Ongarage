import React from 'react';
import { NoticeToast } from '@ongarage/shared';
import { useGarage } from '../context/GarageContext';

// The garage store's notices (new SOS request, customer replies, bid results…).
export const Toast: React.FC<{ topOffset?: number }> = ({ topOffset }) => {
  const { notice, dismissNotice } = useGarage();
  return <NoticeToast notice={notice} onDismiss={dismissNotice} topOffset={topOffset} />;
};
