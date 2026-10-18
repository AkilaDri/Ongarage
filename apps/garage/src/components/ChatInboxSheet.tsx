import React from 'react';
import { ChatInboxSheet as BaseInbox } from '@ongarage/shared';
import { Toast } from './Toast';
import type { ChatThreadInfo } from '../context/ChatContext';

/** The shared chat inbox, with the garage's toasts above it. */
export const ChatInboxSheet: React.FC<{ visible: boolean; onClose: () => void; threads: ChatThreadInfo[]; onOpen: (thread: ChatThreadInfo) => void }> = (props) => (
  <BaseInbox {...props} me="garage" overlay={<Toast topOffset={40} />} />
);
