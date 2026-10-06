import React from 'react';
import { NoticeToast } from '@ongarage/shared';
import { useShop } from '../context/ShopContext';

// The shop store's notices (new requests, quote results, delivery updates…).
export const Toast: React.FC<{ topOffset?: number }> = ({ topOffset }) => {
  const { notice, dismissNotice } = useShop();
  return <NoticeToast notice={notice} onDismiss={dismissNotice} topOffset={topOffset} />;
};
