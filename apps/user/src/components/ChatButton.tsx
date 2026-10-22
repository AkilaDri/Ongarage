import React from 'react';
import { ChatIconButton } from '@ongarage/shared';
import { useChat, type ChatTarget } from '../context/ChatContext';

/** The 💬 button on a job card: opens the chat with that job's garage. */
export const ChatButton: React.FC<{ target: ChatTarget; size?: number; tag?: boolean; plain?: boolean }> = ({ target, size, tag, plain }) => {
  const { open, unread } = useChat();
  return <ChatIconButton onPress={() => open(target)} unread={unread(target.id)} label={`Chat with ${target.title}`} size={size} tag={tag} plain={plain} />;
};
