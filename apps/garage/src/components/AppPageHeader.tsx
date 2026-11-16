import React from 'react';
import { PageHeader } from '@ongarage/shared';
import { useChat } from '../context/ChatContext';
import { pageBg } from '../utils/pageBg';

/** The shared page header with this app's chat (the ONCHAT pill opens the inbox, the count is the unread messages) and its page colour. */
export const AppPageHeader: React.FC<Omit<React.ComponentProps<typeof PageHeader>, 'chat' | 'background'>> = (props) => {
  const { openInbox, totalUnread } = useChat();
  return <PageHeader {...props} background={pageBg()} chat={{ onPress: openInbox, count: totalUnread }} />;
};
