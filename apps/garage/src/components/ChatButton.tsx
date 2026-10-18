import React from 'react';
import { ChatIconButton } from '@ongarage/shared';
import { chatKey, useChat } from '../context/ChatContext';
import type { Booking } from '../types';

/** The chat target of a booked job: its customer. */
export const chatTargetOf = (b: Booking) => ({ id: chatKey(b.id), title: b.customer.name, subtitle: `${b.title} · ${b.vehicle.plate}`, phone: b.customer.phone, vehicle: b.vehicle });

/** The 💬 button on a booked job: opens the chat with its customer. */
export const ChatButton: React.FC<{ booking: Booking; size?: number }> = ({ booking, size }) => {
  const { open, unread } = useChat();
  return <ChatIconButton onPress={() => open(chatTargetOf(booking))} unread={unread(booking.id)} label={`Chat with ${booking.customer.name}`} size={size} />;
};
