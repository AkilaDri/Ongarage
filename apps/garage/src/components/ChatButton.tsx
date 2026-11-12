import React from 'react';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { ChatIconButton, OnChatIcon, getThemeMode } from '@ongarage/shared';
import { chatKey, useChat } from '../context/ChatContext';
import type { Booking, DirectRequest } from '../types';

/**
 * Calls for a tap, like someone waving "talk to me": every few seconds the bubble hops twice and tilts, with a soft ring spreading out from it.
 * The beat is read from the clock on every frame, so it never stalls.
 */
const CallingBubble: React.FC<{ children: React.ReactNode; width: number }> = ({ children, width }) => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      t.setValue((Date.now() % 3200) / 3200);
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [t]);
  const at = [0, 0.06, 0.12, 0.18, 0.24, 0.3, 1];
  const hop = t.interpolate({ inputRange: at, outputRange: [0, -7, 0, -5, 0, 0, 0] });
  const tilt = t.interpolate({ inputRange: at, outputRange: ['0deg', '-8deg', '0deg', '6deg', '0deg', '0deg', '0deg'] });
  const ring = t.interpolate({ inputRange: [0, 0.06, 0.45, 1], outputRange: [0.9, 0.9, 1.7, 1.7] });
  const ringOpacity = t.interpolate({ inputRange: [0, 0.06, 0.45, 1], outputRange: [0, 0.45, 0, 0] });
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', width: width * 0.9, height: width * 0.6, borderRadius: width * 0.3, backgroundColor: '#1a73e8', opacity: ringOpacity, transform: [{ scale: ring }] }} />
      <Animated.View style={{ transform: [{ translateY: hop }, { rotate: tilt }] }}>{children}</Animated.View>
    </View>
  );
};

/** The chat target of a booked job: its customer. */
export const chatTargetOf = (b: Booking) => ({ id: chatKey(b.id), title: b.customer.name, subtitle: `${b.title} · ${b.vehicle.plate}`, phone: b.customer.phone, vehicle: b.vehicle });

/** The chat target of a direct request (not booked yet): its customer. */
export const chatTargetOfDirect = (d: DirectRequest) => ({ id: chatKey(d.id), title: d.customer.name, subtitle: `ඍජු ඉල්ලීම · ${d.vehicle.plate}`, phone: d.customer.phone, vehicle: d.vehicle });

/** The OnChat button on a booked job (or a direct request): opens the chat with its customer. */
export const ChatButton: React.FC<{ booking?: Booking; direct?: DirectRequest; size?: number; plain?: boolean; /** The same bubble as the Home page's floating OnChat button: filled blue with ONCHAT in white. */ solid?: boolean }> = ({ booking, direct, size, plain, solid }) => {
  const { open, unread, unreadCalls } = useChat();
  const target = booking ? chatTargetOf(booking) : direct ? chatTargetOfDirect(direct) : null;
  if (!target) return null;
  const id = booking ? booking.id : direct!.id;
  if (solid) {
    const calls = unreadCalls(id);
    const msgs = Math.max(0, unread(id) - calls);
    const kind = calls === 0 && msgs > 0 ? 'message' : 'call';
    const n = kind === 'message' ? msgs : calls;
    return (
      <Pressable onPress={() => open(target)} hitSlop={6} accessibilityLabel={`Chat with ${target.title}`}>
        <CallingBubble width={size ?? 52}>
          <OnChatIcon width={Math.round((size ?? 52) * 0.6)} outline kind={kind} short color={getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8'} label={n > 0 ? (n > 9 ? '9+' : String(n)) : undefined} />
        </CallingBubble>
      </Pressable>
    );
  }
  return <ChatIconButton onPress={() => open(target)} unread={unread(id)} calls={unreadCalls(id)} label={`Chat with ${target.title}`} size={size} plain={plain} />;
};
