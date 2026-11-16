import React from 'react';
import { PageHeader } from '@ongarage/shared';
import { useChat } from '../context/ChatContext';
import { pageBg } from '../utils/material';

/** The shared page header with this app's chat (the ONCHAT pill opens the inbox, the count is the unread messages) and its page colour. */
export const AppPageHeader: React.FC<Omit<React.ComponentProps<typeof PageHeader>, 'chat' | 'background'> & { /** The OnChat pill floats at the bottom of the page instead (as on Home), so the header does not show it. */ hideChat?: boolean }> = ({ hideChat, ...props }) => {
  const { openInbox, totalUnread } = useChat();
  return <PageHeader {...props} background={pageBg()} chat={hideChat ? undefined : { onPress: openInbox, count: totalUnread }} />;
};
