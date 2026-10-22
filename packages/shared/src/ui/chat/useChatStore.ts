import { useCallback, useEffect, useRef, useState } from 'react';
import { chatAllowed, simulatedChatReply } from '../../marketplace/chat';
import type { ChatMessage, ChatShopTag, ChatSide, VoiceNote } from '../../types';

const REPLY_MS = 3200;

/**
 * The chat state of one app: a conversation per job (by the job's id), the messages this side sends, and — until a backend
 * delivers the real ones — the other side's simulated replies. `onIncoming` tells the app a message came in (a toast).
 */
export const useChatStore = (
  me: ChatSide,
  seed: Record<string, ChatMessage[]>,
  onIncoming?: (threadId: string, message: ChatMessage) => void,
  /** Who the other side of a conversation is (a shop talks to garages and to owners); the default is owner ↔ garage. */
  peerOf?: (threadId: string) => ChatSide
) => {
  const peerRef = useRef(peerOf);
  peerRef.current = peerOf;
  const peer = useCallback((id: string): ChatSide => peerRef.current?.(id) ?? (me === 'owner' ? 'garage' : 'owner'), [me]);
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>(seed);
  // When this side last looked at each conversation (anything the other side sent after it is unread).
  const [seen, setSeen] = useState<Record<string, number>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const incoming = useRef(onIncoming);
  incoming.current = onIncoming;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const messages = useCallback((id: string) => threads[id] ?? [], [threads]);
  const unread = useCallback((id: string) => (threads[id] ?? []).filter((m) => m.from !== me && !m.record && m.at > (seen[id] ?? 0)).length, [threads, seen, me]);
  // Conversations that are new (a job just taken): marked until the first time they are opened.
  const [fresh, setFresh] = useState<Record<string, true>>({});
  const markFresh = useCallback((id: string) => setFresh((f) => (f[id] ? f : { ...f, [id]: true })), []);
  const isFresh = useCallback((id: string) => !!fresh[id], [fresh]);
  /** When this side last looked at a conversation (read it before opening: what came after is the "new" part). */
  const seenAt = useCallback((id: string) => seen[id] ?? 0, [seen]);
  const markRead = useCallback((id: string) => {
    setSeen((s) => ({ ...s, [id]: Date.now() }));
    setFresh((f) => {
      if (!f[id]) return f;
      const { [id]: _gone, ...rest } = f;
      return rest;
    });
  }, []);

  const add = useCallback((id: string, m: ChatMessage) => setThreads((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), m] })), []);

  /** Puts the job's record at the head of the conversation (once). */
  const note = useCallback(
    (id: string, text: string) => setThreads((prev) => ((prev[id] ?? []).some((m) => m.record) ? prev : { ...prev, [id]: [{ id: `r-${id}`, from: me, text, at: Math.min(Date.now(), ...(prev[id] ?? []).map((m) => m.at)) - 1, record: true }, ...(prev[id] ?? [])] })),
    [me]
  );

  /**
   * Writes a step of the job (a step done, a part, a call) into the conversation as a message from the side that did it. From
   * the other side it arrives like any message: unread, and the app is told.
   */
  const postUpdate = useCallback(
    (id: string, text: string, from: ChatSide = me, photos?: string[], report?: ChatMessage['report']) => {
      const m: ChatMessage = { id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, from, text, photos, at: Date.now(), update: true, report };
      add(id, m);
      if (from !== me) incoming.current?.(id, m);
    },
    [add, me]
  );

  /** A message from the other side, as it will arrive from the backend (here: a first word from the customer once a job is taken). */
  const receive = useCallback(
    (id: string, text: string) => {
      const m: ChatMessage = { id: `m-${Date.now()}`, from: peer(id), text, at: Date.now() };
      add(id, m);
      incoming.current?.(id, m);
    },
    [add, peer]
  );

  /** Takes back a message this side sent (a mistake): its text and photos are removed, a note stays in its place. */
  /** Changes the text of a message this side sent (a step or a note that needs correcting); it is marked as edited. */
  const edit = useCallback(
    (id: string, messageId: string, text: string, photos?: string[]) => {
      const next = text.trim();
      if (!next) return;
      setThreads((prev) => ({ ...prev, [id]: (prev[id] ?? []).map((m) => (m.id === messageId && m.from === me && !m.deleted ? { ...m, text: next, edited: true, ...(photos ? { photos: photos.length ? photos : undefined } : {}) } : m)) }));
    },
    [me]
  );

  const remove = useCallback(
    (id: string, messageId: string) =>
      setThreads((prev) => ({ ...prev, [id]: (prev[id] ?? []).map((m) => (m.id === messageId && m.from === me ? { ...m, text: undefined, photos: undefined, voiceNotes: undefined, deleted: true } : m)) })),
    [me]
  );

  /** Sends a message; false when it was held back (it tried to move the deal off the app). */
  const send = useCallback(
    async (id: string, msg: { text?: string; photos?: string[]; voiceNotes?: VoiceNote[]; shops?: ChatShopTag[] }) => {
      const text = msg.text?.trim();
      if (!text && !msg.photos?.length && !msg.voiceNotes?.length) return true;
      if (text && !(await chatAllowed(text))) return false;
      const stamp = Date.now();
      add(id, { id: `m-${stamp}`, from: me, text: text || undefined, photos: msg.photos, voiceNotes: msg.voiceNotes, shops: msg.shops?.length ? msg.shops : undefined, at: stamp });
      // Simulated: the other side answers a little later.
      timers.current.push(
        setTimeout(() => {
          const replier = peer(id);
          const reply: ChatMessage = { id: `m-${Date.now()}`, from: replier, text: simulatedChatReply(replier, text ?? ''), at: Date.now() };
          add(id, reply);
          incoming.current?.(id, reply);
        }, REPLY_MS)
      );
      return true;
    },
    [add, me, peer]
  );

  return { messages, send, note, postUpdate, receive, remove, edit, unread, markRead, markFresh, isFresh, seenAt };
};
