import React, { useEffect, useState } from 'react';
import { ChatSheet, type ChatMessage, type PartsQuickAsk, type PartsShop } from '@ongarage/shared';
import { useMart } from '../../context/MartContext';
import { Toast } from '../Toast';
import { ThreadDealCards } from './ThreadDealCards';
import { ChatAskShopChip } from './ChatAskShopChip';
import { openShopFor } from '../../utils/martBridge';

export type ThreadTarget = { enquiryId: string; shop: PartsShop };

const QUICK: { id: PartsQuickAsk; label: string }[] = [
  { id: 'available', label: 'තොගයේ තිබේද?' },
  { id: 'price', label: 'මිල කීයද?' },
  { id: 'fits', label: 'මගේ වාහනයට ගැළපේද?' },
  { id: 'holdIt', label: 'මට තබා ගන්න' },
  { id: 'delivery', label: 'ගෙදරටම එවන්න පුළුවන්ද?' },
  { id: 'photo', label: 'ඡායාරූපයක් එවන්න' },
];

/**
 * A conversation with one shop about one request: the same OnChat window as everywhere else (the WhatsApp-style box with emoji, attachments, camera and voice notes, the
 * ready-made questions that slide in when the box is touched, edit and delete of one's own messages), with the quick questions as the ready-made replies. A message that tries
 * to move the deal off the app (a phone number, paying elsewhere) is held back; there is always a call button.
 */
export const ThreadSheet: React.FC<{ target: ThreadTarget | null; onClose: () => void }> = ({ target, onClose }) => {
  const { threadFor, sendMessage, editMessage, removeMessage } = useMart();
  const [shown, setShown] = useState<ThreadTarget | null>(target);
  useEffect(() => {
    if (target) setShown(target);
  }, [target]);
  if (!shown) return null;
  const s = shown;
  const thread = threadFor(s.enquiryId, s.shop.id);
  const quickLabel = (q?: PartsQuickAsk) => QUICK.find((x) => x.id === q)?.label;
  const messages: ChatMessage[] = (thread?.messages ?? []).map((m) => ({
    id: m.id,
    from: m.from === 'buyer' ? 'garage' : 'shop',
    text: m.text ?? quickLabel(m.quick),
    photos: m.photos,
    voiceNotes: m.voiceNotes,
    at: m.at,
    edited: m.edited,
    deleted: m.deleted,
  }));

  return (
    <ChatSheet
      visible={!!target}
      onClose={onClose}
      overlay={<Toast topOffset={40} />}
      me="garage"
      title={s.shop.name}
      subtitle="කොටස ගැන වෙළඳසැලෙන් අසන්න"
      phone={s.shop.phone}
      messages={messages}
      // The deal itself, from the offer to the part in hand, is done in the chat: reserve, collect or have it delivered, inspect and buy, rate, return.
      cards={<ThreadDealCards enquiryId={s.enquiryId} shopId={s.shop.id} />}
      // The decision to ask this shop for a part is in every chat with a shop.
      tagBarExtra={<ChatAskShopChip onPress={() => { onClose(); openShopFor(s.shop.id, true); }} />}
      quickReplies={QUICK.map((q) => q.label)}
      // A ready-made question goes as its quick id (the shop answers it by kind); anything else as written.
      onSend={(msg) => {
        const quick = msg.text ? QUICK.find((q) => q.label === msg.text!.trim()) : undefined;
        return sendMessage(s.enquiryId, s.shop.id, quick ? { quick: quick.id } : { text: msg.text, photos: msg.photos, voiceNotes: msg.voiceNotes });
      }}
      onEdit={(id, text) => editMessage(s.enquiryId, s.shop.id, id, text)}
      onDelete={(id) => removeMessage(s.enquiryId, s.shop.id, id)}
      onCall={() => undefined}
      whatsapp
    />
  );
};
