import React, { useEffect, useRef, useState } from 'react';
import { blankPhoto, canEditPhotos, pickPhotos } from '../../utils/photos';
import { ChatComposerBar, ComposerMoreMenu, type ComposerMore } from './ChatComposerBar';
import { PhotoComposeSheet } from './PhotoComposeSheet';
import { MART_SHOPS } from '../../constants/martShops';
import { Animated, Easing, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Colors, getThemeMode, themedStyles } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { formatDate, formatTime } from '../../utils/format';
import { CHAT_QUICK } from '../../marketplace/chat';
import { Sheet } from '../Sheet';
import { Icon } from '../Icons';
import { CallPill } from './CallPill';
import { VehicleLine } from '../LkPlate';
import { CHAT_TERMS } from './chatTerms';
import { VoiceNotePlayer } from '../VoiceNotePlayer';
import type { ChatMessage, ChatShopTag, ChatSide, VoiceNote } from '../../types';

const outline = () => (getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0');
const BLUE = () => (getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8');

/** The vehicle a chat is about, shown under the app bar: its model and number plate. */
export type ChatVehicle = { name: string; plate: string; type: string; registrationNo?: string };

/**
 * Slides its content in from the right edge across the row (as if dragged in) when `show` turns on, and back out to the right when it turns off; it takes no space while
 * it is away.
 */
const SlideFromRight: React.FC<{ show: boolean; children: React.ReactNode }> = ({ show, children }) => {
  const { width } = useWindowDimensions();
  const t = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(show);
  useEffect(() => {
    if (show) {
      setMounted(true);
      Animated.timing(t, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(t, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => finished && setMounted(false));
    }
  }, [show, t]);
  if (!mounted) return null;
  return <Animated.View style={{ opacity: t, transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [width, 0] }) }] }}>{children}</Animated.View>;
};

/**
 * The chat between a vehicle owner and a garage about one job: the messages (mine on the right), ready-made replies, a box,
 * a photo button and a call button. A message that tries to move the deal off the app is held back with a warning.
 */
export const ChatSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  overlay?: React.ReactNode;
  /** Who is chatting on this phone. */
  me: ChatSide;
  /** The other side's name and the job, for the header. */
  title: string;
  subtitle?: string;
  phone?: string;
  messages: ChatMessage[];
  /** Resolves false when the message was held back. */
  onSend: (msg: { text?: string; photos?: string[]; voiceNotes?: VoiceNote[]; shops?: ChatShopTag[] }) => Promise<boolean>;
  /** Typing "@" offers the parts shops to tag in a message (the customer and the garage tell each other where to buy a part). */
  shopTagging?: boolean;
  /** More chips in a row of their own above the ready-made replies (the owner's "fit a new part"). */
  tagBarExtra?: React.ReactNode;
  /** A tagged shop was tapped (in the message or its chip): go to that shop. */
  onOpenShop?: (shopId: string) => void;
  /** Sample photos until the camera is wired. */
  /** WhatsApp look: beige wallpaper, green bubbles with ticks, round green send button. */
  whatsapp?: boolean;
  /** The vehicle the job is about: its model and number plate sit under the app bar. */
  vehicle?: ChatVehicle;
  /** Takes back one of this side's own messages (tap it to get the delete button). */
  onDelete?: (messageId: string) => void;
  /** Changes the text of one of this side's own messages (tap it, then Edit). */
  onEdit?: (messageId: string, text: string) => void;
  /** A message that carries a report (the diagnosis, extra work) is changed in the report's own form, not in the typing box. */
  onEditReport?: (message: ChatMessage) => void;
  /** Which update messages have a form to change them in (default: the diagnosis and extra-work reports); the edit chip shows only on those. */
  editFormFor?: (message: ChatMessage) => boolean;
  /** The part a message is about, if buying it is next (a part asked for, or one the garage may buy): that message gets an OnMart chip that calls `onOpenMart(part)`. */
  martPartOf?: (message: ChatMessage) => string | undefined;
  /** The part has to be bought by this side (the repair waits for it): the chip becomes a prominent nudge, "ඔබ OnMart හි මිලදී ගත යුතුය - part". */
  martMustBuy?: (message: ChatMessage) => boolean;
  onOpenMart?: (part: string) => void;
  /** The call button was used (the app writes the call into the conversation). */
  onCall?: () => void;
  /** Buttons for what this side can do about the job from the chat (above the quick replies). */
  actions?: React.ReactNode;
  /** Cards for what the other side is waiting for from this side (at the end of the conversation). */
  cards?: React.ReactNode;
  /** An action at the right end of the vehicle bar under the app bar (the owner's "cancel the job"). */
  vehicleAction?: React.ReactNode;
  /** A notice shown as a message in the middle of the chat (in the Job Info colour), e.g. the vehicle must be confirmed before answering. */
  composerLocked?: string;
  /** The ready-made replies under the messages (the side's usual ones when not given). */
  quickReplies?: string[];
  /** When this side last looked before opening the chat: what the other side wrote after it is marked "new" with a count. */
  newSince?: number;
  /** A chip under a message that carries a report opens it in a popup. */
  onOpenReport?: (message: ChatMessage) => void;
}> = ({ visible, onClose, overlay, me, title, subtitle, phone, messages, onSend, shopTagging, tagBarExtra, onOpenShop, whatsapp, vehicle, onDelete, onEdit, onEditReport, editFormFor, martPartOf, martMustBuy, onOpenMart, onCall, actions, cards, composerLocked, quickReplies, vehicleAction, newSince, onOpenReport }) => {
  const st = whatsapp ? wa : styles;
  // An update line the app wrote (a step of the job) is changed in the form it came from, never in the typing box; one with no form has no edit chip.
  const formEdit = (m: ChatMessage) => !m.deleted && !!onEditReport && !!m.update && (editFormFor ? editFormFor(m) : !!m.report && (m.report.kind === 'diagnosis' || m.report.kind === 'extra'));
  const [text, setText] = useState('');
  const [blocked, setBlocked] = useState(false);
  const scroll = useRef<ScrollView>(null);
  // The vehicle bar (model and number) folds away as the messages scroll up and comes back, whole, on the first scroll down.
  const vehOpen = useRef(new Animated.Value(1)).current;
  const [vehH, setVehH] = useState(0);
  const vehHidden = useRef(false);
  const lastY = useRef(0);
  const autoScrollAt = useRef(0);
  const setVehicleBar = (open: boolean) => {
    if (vehHidden.current === !open) return;
    vehHidden.current = !open;
    Animated.timing(vehOpen, { toValue: open ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  };
  // The message of mine that was tapped: it shows a delete button under it.
  const [picked, setPicked] = useState<string | null>(null);
  // The terms under the job's record stay folded; one tap opens them for whoever wants to read.
  const [moreTerms, setMoreTerms] = useState(false);
  const terms = CHAT_TERMS[me];
  // The new messages: those from the other side after the time it was last looked at; the divider sits before the first.
  const fresh = newSince === undefined ? [] : messages.filter((m) => m.from !== me && !m.record && m.at > newSince);
  const firstNewId = fresh[0]?.id;

  useEffect(() => {
    if (visible) {
      setText('');
      setMoreOpen(false);
      setDraft(null);
      setBlocked(false);
      setPicked(null);
      setEditingId(null);
      setMoreTerms(false);
      vehOpen.setValue(1);
      vehHidden.current = false;
      lastY.current = 0;
    }
  }, [visible]);
  useEffect(() => {
    // Jumping to the newest message is not the person scrolling: the bar stays as it is.
    autoScrollAt.current = Date.now();
    scroll.current?.scrollToEnd({ animated: true });
  }, [messages.length, visible]);

  // A voice note: tap the microphone to record, tap again to send (the inspection said aloud instead of typed).
  const [emojiOpen, setEmojiOpen] = useState(false);
  // The paper clip opens a card of what can be attached (only what a job chat can carry: photos from the gallery, a photo from the camera, a voice note).
  const [attachOpen, setAttachOpen] = useState(false);
  // The ready-made replies and the @ chip show only while the typing box is touched (focused); they stay a moment after it loses focus so that tapping one still lands.
  const [boxFocused, setBoxFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusBox = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setBoxFocused(true);
  };
  const blurBox = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => setBoxFocused(false), 250);
  };
  useEffect(() => () => { if (blurTimer.current) clearTimeout(blurTimer.current); }, []);
  // The message being edited: its text goes into the input; sending saves the change instead of adding a message.
  const [editingId, setEditingId] = useState<string | null>(null);
  const saveEdit = () => {
    if (editingId && text.trim()) onEdit?.(editingId, text);
    setEditingId(null);
    setText('');
  };
  const [recSec, setRecSec] = useState<number | null>(null);
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (recTimer.current) clearInterval(recTimer.current); }, []);
  const stopRec = (sec: number) => {
    if (recTimer.current) clearInterval(recTimer.current);
    recTimer.current = null;
    setRecSec(null);
    if (sec >= 1) void send({ voiceNotes: [{ id: `vn-${Date.now()}`, durationSec: sec }] });
  };
  const cancelRec = () => {
    if (recTimer.current) clearInterval(recTimer.current);
    recTimer.current = null;
    setRecSec(null);
  };
  // The recording can be paused (the stop square) and carried on, then sent or thrown away.
  const [recPaused, setRecPaused] = useState(false);
  const pausedRef = useRef(false);
  const toggleRec = () => {
    if (recSec !== null) return stopRec(recSec);
    let s = 0;
    pausedRef.current = false;
    setRecPaused(false);
    setRecSec(0);
    recTimer.current = setInterval(() => {
      if (pausedRef.current) return;
      s += 1;
      setRecSec(s);
      if (s >= 60) stopRec(s);
    }, 1000);
  };
  const pauseRec = () => {
    pausedRef.current = !pausedRef.current;
    setRecPaused(pausedRef.current);
  };
  // The pictures just chosen, on their way to the caption screen; the "more" menu of the bar.
  const [draft, setDraft] = useState<{ photos: string[]; edit?: boolean } | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreItems: ComposerMore[] = [
    // The attach button opens this list; the pictures live in it.
    { key: 'gallery', icon: '🖼️', label: 'පින්තූර', run: () => void pickPhotos(10, 'library').then((ph) => ph.length && setDraft({ photos: ph })) },
    ...(canEditPhotos ? [{ key: 'draw', icon: '✏️', label: 'ඇඳ යවන්න', run: () => setDraft({ photos: [blankPhoto()], edit: true }) }] : []),
    ...((globalThis as { navigator?: { geolocation?: { getCurrentPosition: (ok: (p: { coords: { latitude: number; longitude: number } }) => void) => void } } }).navigator?.geolocation
      ? [{ key: 'loc', icon: '📍', label: 'මගේ ස්ථානය', run: () => (globalThis as { navigator: { geolocation: { getCurrentPosition: (ok: (p: { coords: { latitude: number; longitude: number } }) => void) => void } } }).navigator.geolocation.getCurrentPosition((p) => void send({ text: `📍 මගේ ස්ථානය: https://maps.google.com/?q=${p.coords.latitude.toFixed(5)},${p.coords.longitude.toFixed(5)}` })) }]
      : []),
    ...(vehicle ? [{ key: 'veh', icon: '🚗', label: 'වාහන විස්තර', run: () => void send({ text: `🚗 ${vehicle.name} · ${vehicle.plate}` }) }] : []),
  ];

  // Parts shops tagged in the message being typed ("@name" in the text).
  const [tagged, setTagged] = useState<ChatShopTag[]>([]);
  const mention = shopTagging ? /(^|\s)@([^@\n]*)$/.exec(text) : null;
  const shopHits = mention
    ? MART_SHOPS.filter((s) => s.name.toLowerCase().includes(mention[2].trim().toLowerCase())).slice(0, 5)
    : [];
  /** The "tag a shop" chip: starts an "@" in the box, which lists the shops. */
  const startTag = () => {
    setAttachOpen(false);
    setEmojiOpen(false);
    setText((t) => (/(^|\s)@[^@\n]*$/.test(t) ? t : `${t && !t.endsWith(' ') ? `${t} ` : t}@`));
  };
  const tagShop = (shop: { id: string; name: string }) => {
    setText((t) => t.replace(/(^|\s)@([^@\n]*)$/, (_m, lead: string) => `${lead}@${shop.name} `));
    setTagged((list) => (list.some((x) => x.id === shop.id) ? list : [...list, { id: shop.id, name: shop.name }]));
  };

  const send = async (msg: { text?: string; photos?: string[]; voiceNotes?: VoiceNote[] }) => {
    const shops = msg.text ? tagged.filter((t) => msg.text!.includes(`@${t.name}`)) : [];
    const ok = await onSend(shops.length ? { ...msg, shops } : msg);
    setBlocked(!ok);
    if (ok) {
      setText('');
      setTagged([]);
    }
  };

  // The text of a message with its tagged shops ("@name") drawn as links: tapping one goes to that shop.
  const mentioned = (m: ChatMessage) => {
    const text = m.text ?? '';
    if (!m.shops?.length) return <Text style={[st.msg, m.from === me && st.msgMine]}>{text}</Text>;
    const names = m.shops.map((s) => `@${s.name}`);
    const parts = text.split(new RegExp(`(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`));
    return (
      <Text style={[st.msg, m.from === me && st.msgMine]}>
        {parts.map((p, i) => {
          const shop = m.shops!.find((s) => `@${s.name}` === p);
          return shop ? (
            <Text key={i} style={st.mention} onPress={() => onOpenShop?.(shop.id)}>
              {p}
            </Text>
          ) : (
            p
          );
        })}
      </Text>
    );
  };

  // What the other side waits for (the cards) and the "messages locked" notice belong under the latest update of the job, where they arose: a message either side
  // writes afterwards reads below them, instead of above a block that stays stuck at the end of the chat.
  let anchorAt = -1;
  messages.forEach((m, i) => {
    if (m.update && !m.deleted) anchorAt = i;
  });
  const pending = (
    <>
      {cards}
      {!!composerLocked && (
        <View style={[st.bubble, st.event, st.recordMessage, st.eventJobInfo]} accessibilityLabel="Messages locked">
          <Text style={st.recordText}>{composerLocked}</Text>
        </View>
      )}
    </>
  );

  // Ready-made replies, the error and the input row: pinned under the messages in the full-screen look.
  const footer = (
    <View style={st.composer}>
        {actions}
        <View style={st.composerInner}>
        {/* The app's own chips (the owner's "fit a new part") sit in a row of their own, above the ready-made replies. */}
        {!!tagBarExtra && <View style={st.tagBar}>{tagBarExtra}</View>}
        <SlideFromRight show={boxFocused}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={st.quick}>
          {/* The @ chip (tag a parts shop) leads the ready-made replies, just above the typing box. */}
          {shopTagging && (
            <Pressable style={st.tagBtn} onPress={startTag} accessibilityLabel="Tag a parts shop">
              <Text style={st.tagBtnText}>@</Text>
            </Pressable>
          )}
          {(quickReplies ?? CHAT_QUICK[me]).map((q) => (
            <Pressable key={q} style={st.chip} onPress={() => send({ text: q })} accessibilityLabel={`Quick ${q}`}>
              <Text style={st.chipText}>{q}</Text>
            </Pressable>
          ))}
        </ScrollView>
        </SlideFromRight>
        {blocked && <Text style={st.error}>දුරකථන අංක, ගෙවීම් හෝ වෙනත් යෙදුම් පණිවිඩ යැවිය නොහැක — මෙහිම කතා කරන්න, නැත්නම් ඉහත අමතන්න බොත්තම භාවිත කරන්න.</Text>}

        {!!editingId && (
          <View style={st.editBar}>
            <Text style={st.editBarText}>✎ පණිවිඩය සංස්කරණය කරමින් — වෙනස සුරකින්න බොත්තම ඔබන්න</Text>
            <Pressable onPress={() => { setEditingId(null); setText(''); }} hitSlop={8} accessibilityLabel="Cancel edit">
              <Text style={st.editBarText}>✕</Text>
            </Pressable>
          </View>
        )}
        {shopHits.length > 0 && recSec === null && (
          <View style={st.shopList} accessibilityLabel="Tag a parts shop">
            <Text style={st.shopListHead}>🏪 වෙළඳසැලක් ටැග් කරන්න</Text>
            {shopHits.map((s) => (
              <Pressable key={s.id} style={st.shopRow} onPress={() => tagShop(s)} accessibilityLabel={`Tag ${s.name}`}>
                <Text style={st.shopRowName} numberOfLines={1}>🏪 {s.name}</Text>
                <Text style={st.shopRowSub} numberOfLines={1}>{s.district} · {s.distanceKm} km</Text>
              </Pressable>
            ))}
          </View>
        )}
        {moreOpen && recSec === null && moreItems.length > 0 && (
          <ComposerMoreMenu
            items={moreItems}
            onPick={(i) => {
              setMoreOpen(false);
              i.run();
            }}
          />
        )}
        {/* The bar: the camera on its left, the voice note, the pictures and "more" on its right (Send once there is text); a recording turns it into the recording bar. */}
        <ChatComposerBar
          text={text}
          onChangeText={(t) => {
            setText(t);
            setBlocked(false);
          }}
          placeholder="පණිවිඩයක් ලියන්න…"
          onFocus={focusBox}
          onBlur={blurBox}
          onSendText={() => (editingId ? saveEdit() : void send({ text }))}
          editing={!!editingId}
          onCamera={() => void pickPhotos(1, 'camera').then((ph) => ph.length && setDraft({ photos: ph }))}
          onGallery={() => void pickPhotos(10, 'library').then((ph) => ph.length && setDraft({ photos: ph }))}
          onMic={() => {
            setMoreOpen(false);
            toggleRec();
          }}
          moreOpen={moreOpen}
          onMore={moreItems.length ? () => setMoreOpen((v) => !v) : undefined}
          recSec={recSec}
          recPaused={recPaused}
          onRecPause={pauseRec}
          onRecCancel={cancelRec}
          onRecSend={() => recSec !== null && stopRec(recSec)}
        />
        <PhotoComposeSheet
          photos={draft?.photos ?? null}
          startEditing={draft?.edit}
          onClose={() => setDraft(null)}
          onSend={async (photos, caption) => {
            setDraft(null);
            await send({ photos, text: caption });
          }}
        />
        </View>
    </View>
  );

  return (
    <Sheet
      visible={visible}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      overlay={overlay}
      fullScreen={whatsapp}
      bare={whatsapp}
      headerRight={
        whatsapp && phone ? (
          <CallPill phone={phone} onCall={onCall} />
        ) : undefined
      }
      footer={whatsapp ? footer : undefined}
    >
      {!!phone && !whatsapp && (
        <Pressable style={st.call} onPress={() => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)} accessibilityLabel="Call">
          <Text style={st.callText}>{phone}</Text>
        </Pressable>
      )}

      {!!vehicle && (
        <Animated.View style={[{ overflow: 'hidden' }, vehH > 0 && { height: vehOpen.interpolate({ inputRange: [0, 1], outputRange: [0, vehH] }), opacity: vehOpen }]}>
          <View style={st.vehicleBar} onLayout={(e) => e.nativeEvent.layout.height > 0 && setVehH(Math.round(e.nativeEvent.layout.height))}>
            <View style={st.vehicleMain}>
              <VehicleLine vehicle={vehicle} textStyle={st.vehicleText} />
            </View>
            {vehicleAction}
          </View>
        </Animated.View>
      )}

      <ScrollView
        ref={scroll}
        style={st.list}
        contentContainerStyle={st.listBody}
        nestedScrollEnabled
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          const dy = y - lastY.current;
          lastY.current = y;
          if (Date.now() - autoScrollAt.current < 900) return;
          if (y <= 4 || dy < -3) setVehicleBar(true);
          else if (dy > 3 && y > 12) setVehicleBar(false);
        }}
      >
        {!messages.length && <Text style={st.empty}>තවම පණිවිඩ නැත. පහත ඉක්මන් පිළිතුරක් තෝරන්න, නැත්නම් පණිවිඩයක් ලියන්න.</Text>}
        {messages.map((m, i) => {
          const row = ((): React.ReactElement => {
          if (m.record) {
            // A Material card: a tonal blue heading strip, the job in bold, then one line per detail.
            const [heading, title, ...rows] = (m.text ?? '').split('\n');
            // Chats with the technician or a parts shop (not the owner and garage owner): the job info is one centred message in the middle of the chat, not the full record card.
            if (me === 'tech' || me === 'shop') {
              return (
                <View key={m.id}>
                  {whatsapp && (
                    <View style={st.dateChipWrap}>
                      <Text style={st.dateChip}>{formatDate(m.at)}</Text>
                    </View>
                  )}
                  <View style={[st.bubble, st.event, st.recordMessage, st.eventJobInfo]}>
                    <View style={[st.eventTag, { backgroundColor: TAGS.garage.bg() }]}>
                      <Text style={[st.eventTagText, { color: TAGS.garage.fg() }]}>{heading.replace(/^[^A-Za-z]+/, '')}</Text>
                    </View>
                    <Text style={[st.msg, st.eventLine, st.eventHead]}>{title}</Text>
                    {rows.map((r, n) => (
                      <Text key={n} style={[st.msg, st.eventLine]}>{r}</Text>
                    ))}
                  </View>
                </View>
              );
            }
            return (
              <View key={m.id}>
              {whatsapp && (
                <View style={st.dateChipWrap}>
                  <Text style={st.dateChip}>{formatDate(m.at)}</Text>
                </View>
              )}
              <View style={st.record}>
                <View style={st.recordHead}>
                  <Text style={st.recordHeadText}>{heading}</Text>
                </View>
                <View style={st.recordBody}>
                  <Text style={st.recordTitle}>{title}</Text>
                  {rows.map((r, n) => (
                    <Text key={n} style={st.recordText}>{r}</Text>
                  ))}
                </View>
                {/* The terms and rules are part of the record, folded until someone wants to read them. */}
                <Pressable style={st.termsRow} onPress={() => setMoreTerms(!moreTerms)} accessibilityRole="button" accessibilityState={{ expanded: moreTerms }} accessibilityLabel={moreTerms ? 'Hide terms' : 'Read terms'}>
                  <Text style={st.termsRowText}>Terms & Conditions</Text>
                  <Text style={st.termsRowText}>{moreTerms ? '▴' : '▾'}</Text>
                </Pressable>
                {moreTerms && (
                  <View style={st.termsInner}>
                    {terms.map((t, n) => (
                      <Text key={n} style={st.termsText}>{n + 1}. {t}</Text>
                    ))}
                  </View>
                )}
              </View>
              </View>
            );
          }
          const mine = m.from === me;
          // Messages in a row from the same side sit close together; the time shows under the last of them.
          const last = messages[i + 1]?.from !== m.from;
          return (
            <View key={m.id} style={[st.group, mine ? st.groupMine : st.groupTheirs, last && st.groupLast]}>
              <Pressable
                style={[st.bubble, mine ? st.mine : st.theirs, !!m.update && !m.deleted && st.event, !!m.update && !m.deleted && mine && st.eventMine, !!m.update && !m.deleted && (m.from === 'tech' || m.from === 'shop') && st.eventJobInfo, m.deleted && st.deleted]}
                disabled={!mine || !onDelete || !!m.deleted}
                onPress={() => setPicked(picked === m.id ? null : m.id)}
                accessibilityLabel={mine && !m.deleted ? 'My message' : undefined}
              >
                {m.deleted && <Text style={st.deletedText}>🚫 මෙම පණිවිඩය මකා දමන ලදී</Text>}
                {!!m.update && !m.deleted && !!m.text && (
                  <View style={[st.eventTag, { backgroundColor: TAGS[m.from].bg() }]}>
                    <Text style={[st.eventTagText, { color: TAGS[m.from].fg() }]}>{TAGS[m.from].label}</Text>
                  </View>
                )}
                {!!m.text &&
                  (m.update ? (
                    // A step of the job: its title and the headings (lines ending with a colon) in bold
                    <View style={st.updateBody}>
                      {m.text.split('\n').map((ln, i) => (
                        <Text key={i} style={[st.msg, mine && st.msgMine, (i === 0 || ln.endsWith(':')) && st.msgHead, i > 0 && ln.endsWith(':') && st.msgHeadGap, st.eventLine, i === 0 && st.eventHead]}>
                          {ln}
                        </Text>
                      ))}
                    </View>
                  ) : (
                    mentioned(m)
                  ))}
                {!!m.report && !!onOpenReport && (
                  <Pressable style={st.reportChip} onPress={() => onOpenReport(m)} accessibilityLabel="View report">
                    <Text style={st.reportChipText}>📋 වාර්තාව බලන්න</Text>
                  </Pressable>
                )}
                {!m.deleted && !!m.shops?.length && (
                  <View style={st.shopChips}>
                    {m.shops.map((s) => (
                      <Pressable key={s.id} style={st.reportChip} onPress={() => onOpenShop?.(s.id)} disabled={!onOpenShop} accessibilityLabel={`Open shop ${s.name}`}>
                        <Text style={st.reportChipText}>🏪 {s.name}{onOpenShop ? ' ›' : ''}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {!m.deleted && !!martPartOf && !!onOpenMart && !!martPartOf(m) && (
                  <Pressable
                    style={martMustBuy?.(m) ? { alignSelf: 'flex-start', paddingHorizontal: 12, minHeight: 38, justifyContent: 'center', borderRadius: 19, borderWidth: 1.5, borderColor: getThemeMode() === 'dark' ? 'rgba(253, 214, 99, 0.6)' : '#f9ab00', backgroundColor: getThemeMode() === 'dark' ? 'rgba(253, 214, 99, 0.14)' : '#fef7e0' } : st.reportChip}
                    onPress={() => onOpenMart(martPartOf(m)!)}
                    accessibilityLabel="Open OnMart for this part"
                  >
                    {martMustBuy?.(m) ? (
                      <Text style={{ fontSize: 12.5, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#fdd663' : '#b06000' }}>⚠️ ඔබ OnMart හි මිලදී ගත යුතුය - {martPartOf(m)}</Text>
                    ) : (
                      <Text style={st.reportChipText}>🛍️ OnMart හි බලන්න · {martPartOf(m)}</Text>
                    )}
                  </Pressable>
                )}
                {!!m.photos?.length && (
                  <View style={st.photoRow}>
                    {m.photos.map((u) => (
                      <Image key={u} source={{ uri: u }} style={st.photo} />
                    ))}
                  </View>
                )}
                {!!m.edited && !m.deleted && <Text style={st.editedMark}>සංස්කරණය කළා</Text>}
                {m.voiceNotes?.map((n, i) => (
                  <VoiceNotePlayer key={n.id} note={n} index={i} compact />
                ))}
                {whatsapp && (
                  <Text style={st.time}>
                    {formatTime(m.at)}
                    {mine ? <Text style={st.tick}>  ✓✓</Text> : null}
                  </Text>
                )}
              </Pressable>
              {picked === m.id && (
                <View style={st.msgActions}>
                  {picked === m.id && formEdit(m) && (
                <Pressable
                  style={st.editBtn}
                  onPress={() => {
                    setPicked(null);
                    onEditReport?.(m);
                  }}
                  accessibilityLabel="Edit report"
                >
                  <Text style={st.editBtnText}>✎ සංස්කරණය</Text>
                </Pressable>
              )}
              {picked === m.id && !!onEdit && !!m.text && !m.deleted && !m.update && (
                    <Pressable
                      style={st.editBtn}
                      onPress={() => {
                        setPicked(null);
                        setEditingId(m.id);
                        setText(m.text ?? '');
                      }}
                      accessibilityLabel="Edit message"
                    >
                      <Text style={st.editBtnText}>✎ සංස්කරණය</Text>
                    </Pressable>
                  )}
                  {picked === m.id && !!onDelete && (
                    <Pressable
                      style={st.deleteBtn}
                      onPress={() => {
                        setPicked(null);
                        onDelete(m.id);
                      }}
                      accessibilityLabel="Delete message"
                    >
                      <Icon name="trash" size={9} color="#d93025" />
                      <Text style={st.deleteText}>මකන්න</Text>
                    </Pressable>
                  )}
                </View>
              )}
              {last && !whatsapp && <Text style={st.time}>{formatTime(m.at)}</Text>}
            </View>
          );
          })();
          return (
            <React.Fragment key={m.id}>
              {m.id === firstNewId && (
                <View style={st.newDivider} accessibilityLabel={`${fresh.length} new messages`}>
                  <View style={st.newLine} />
                  <Text style={st.newText}>{fresh.length} new {fresh.length === 1 ? 'message' : 'messages'}</Text>
                  <View style={st.newLine} />
                </View>
              )}
              {row}
              {i === anchorAt && pending}
            </React.Fragment>
          );
        })}
        {anchorAt < 0 && pending}
      </ScrollView>

      {!whatsapp && footer}
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    call: { alignSelf: 'flex-start', paddingHorizontal: 14, height: 34, justifyContent: 'center', borderRadius: 17, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    callText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: BLUE() },
    composer: { gap: 8 },
    pill: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 48, borderRadius: 24, paddingHorizontal: 4, backgroundColor: getThemeMode() === 'dark' ? '#303134' : '#f1f3f4', borderWidth: 1, borderColor: 'transparent' },
    pillBtn: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
    pillInput: { flex: 1, height: 44, paddingHorizontal: 4, color: Colors.textMain, fontSize: 15, fontFamily: FONTS.bodyRegular, ...({ outlineStyle: 'none' } as object) },
    recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#dc2626', marginLeft: 4, marginRight: 8 },
    recTime: { fontSize: 15, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    recHint: { flex: 1, textAlign: 'right', paddingRight: 12, fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    sendRec: { backgroundColor: '#dc2626' },
    emojiRow: { gap: 6, paddingHorizontal: 6, paddingVertical: 2 },
    tagBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tagBtn: { alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard },
    tagBtnIcon: { fontSize: 15 },
    tagBtnText: { fontSize: 18, lineHeight: 22, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    mention: { color: getThemeMode() === 'dark' ? '#8ab4f8' : '#1a73e8', fontFamily: FONTS.bodyBold, textDecorationLine: 'underline' },
    shopChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    shopList: { marginHorizontal: 4, borderRadius: 14, overflow: 'hidden', backgroundColor: getThemeMode() === 'dark' ? '#303134' : '#ffffff', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? '#3c4043' : '#dadce0' },
    shopListHead: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, fontSize: 11.5, fontFamily: FONTS.bodyBold, color: Colors.textMuted },
    shopRow: { paddingHorizontal: 14, paddingVertical: 9, gap: 1 },
    shopRowName: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    shopRowSub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    attachCard: { paddingTop: 8, paddingBottom: 14, paddingHorizontal: 10, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: getThemeMode() === 'dark' ? '#202124' : '#ffffff', borderWidth: 1, borderBottomWidth: 0, borderColor: getThemeMode() === 'dark' ? '#3c4043' : '#dadce0' },
    attachHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 14, backgroundColor: getThemeMode() === 'dark' ? '#5f6368' : '#dadce0' },
    attachGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
    attachItem: { width: '25%', alignItems: 'center', gap: 6 },
    attachDisc: { width: '86%', height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? '#3c4043' : '#dadce0', backgroundColor: getThemeMode() === 'dark' ? '#202124' : '#ffffff' },
    attachGlyph: { fontSize: 24 },
    attachLabel: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    emoji: { fontSize: 26, paddingHorizontal: 3 },

    list: { maxHeight: 320 },
    listBody: { paddingVertical: 4, gap: 3 },
    empty: { fontSize: 13, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 20, textAlign: 'center', paddingVertical: 24 },
    group: { maxWidth: '82%' },
    groupMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    groupTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    groupLast: { marginBottom: 8 },
    // Google Messages bubbles: mine blue, theirs soft grey; the corner next to the sender is squarer.
    bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, gap: 6 },
    mine: { backgroundColor: BLUE(), borderBottomRightRadius: 6 },
    theirs: { backgroundColor: getThemeMode() === 'dark' ? '#2a2f3a' : '#f1f3f4', borderBottomLeftRadius: 6 },
    msg: { fontSize: 15.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 23 },
    // An important step of the job (vehicle received, parts, price, handover…): a tonal Material card with a blue accent edge, not a chat bubble.
    event: { alignSelf: 'stretch', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? '#3c4043' : '#dadce0', backgroundColor: getThemeMode() === 'dark' ? '#202124' : '#ffffff', shadowColor: '#3c4043', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 2, elevation: 1 },
    eventLine: { color: getThemeMode() === 'dark' ? '#e8eaed' : '#202124', fontSize: 14.5, lineHeight: 21 },
    eventHead: { fontSize: 16.5, lineHeight: 24 },
    // The tag says which side wrote the step (garage, owner, shop, technician), in that side's own colour.
    eventMine: { backgroundColor: getThemeMode() === 'dark' ? '#1c2b4a' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? '#2f4b7c' : '#c6dafc' },
    // The Job Info card's cream: what a side other than the owner and the garage owner (technician, parts shop) posts uses it too.
    eventJobInfo: { backgroundColor: getThemeMode() === 'dark' ? '#182229' : '#ffeecd', borderColor: getThemeMode() === 'dark' ? '#2a3942' : '#f1dfb4' },
    recordMessage: { alignSelf: 'center', width: '92%', marginVertical: 6 },
    eventTag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    eventTagText: { fontSize: 11, fontFamily: FONTS.bodyBold, letterSpacing: 0.2 },
    msgMine: { color: getThemeMode() === 'dark' ? '#0b1b3a' : '#ffffff' },
    time: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 3, marginHorizontal: 6 },
    tick: { color: '#53bdeb' },
    update: { alignSelf: 'center', maxWidth: '90%', marginVertical: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.12)' : '#e8f0fe', alignItems: 'center', gap: 2 },
    updateText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain, textAlign: 'center', lineHeight: 17 },
    updateTime: { fontSize: 10, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    record: { alignSelf: 'center', width: '92%', marginVertical: 8, borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), shadowColor: '#3c4043', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 1 },
    recordHead: { paddingHorizontal: 14, paddingVertical: 9, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    recordHeadText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: BLUE() },
    recordBody: { paddingHorizontal: 14, paddingVertical: 10, gap: 5 },
    recordTitle: { fontSize: 14, fontFamily: FONTS.titleBold, color: Colors.textMain, marginBottom: 2 },
    recordText: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMain, lineHeight: 18 },
    terms: { alignSelf: 'center', width: '92%', marginBottom: 8, gap: 5 },
    termsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, height: 40, borderTopWidth: 1, borderTopColor: outline(), backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.08)' : '#f8fafd' },
    termsRowText: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: BLUE() },
    dateChipWrap: { alignItems: 'center' },
    dateChip: { fontSize: 12, color: Colors.textMuted },
    termsInner: { gap: 6, paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.08)' : '#f8fafd' },
    termsText: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, lineHeight: 17 },
    moreChip: { alignSelf: 'flex-start', paddingHorizontal: 12, height: 28, justifyContent: 'center', borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    moreChipText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: BLUE() },
    reportChip: { alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: 14, paddingVertical: 7, minHeight: 34, borderRadius: 10, justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.2)' : '#e8f0fe', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc', marginTop: 8 },
    reportChipText: { fontSize: 12.5, lineHeight: 18, fontFamily: FONTS.bodySemiBold, color: BLUE() },
    newDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
    newLine: { flex: 1, height: 1, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.35)' : '#aecbfa' },
    newText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: BLUE() },
    updateBody: { gap: 1 },
    msgHead: { fontFamily: FONTS.bodyBold, fontWeight: '800' },
    msgHeadGap: { marginTop: 5 },
    deleted: { opacity: 0.7 },
    deletedText: { fontSize: 12, fontStyle: 'italic', fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    composerInner: { gap: 8 },
    composerLocked: { opacity: 0.45 },
    msgActions: { flexDirection: 'row', gap: 6, marginTop: 3 },
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 0, paddingHorizontal: 7, height: 20, borderRadius: 10, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? '#8ab4f8' : '#1a73e8', backgroundColor: Colors.bgCard },
    editBtnText: { fontSize: 9.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8ab4f8' : '#1a73e8' },
    editedMark: { fontSize: 10, fontStyle: 'italic', fontFamily: FONTS.bodyRegular, color: Colors.textMuted, alignSelf: 'flex-end' },
    editBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: getThemeMode() === 'dark' ? '#1c2b4a' : '#e8f0fe' },
    editBarText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8ab4f8' : '#1a73e8' },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 0, paddingHorizontal: 7, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#d93025', backgroundColor: Colors.bgCard },
    deleteText: { fontSize: 9.5, fontFamily: FONTS.bodySemiBold, color: '#d93025' },
    vehicleBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 4 },
    vehicleMain: { flex: 1 },
    vehicleText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    photo: { width: 84, height: 60, borderRadius: 8 },
    quick: { gap: 8, paddingVertical: 2 },
    chip: { paddingHorizontal: 14, height: 34, justifyContent: 'center', borderRadius: 17, borderWidth: 1, borderColor: outline(), backgroundColor: Colors.bgCard },
    chipText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: BLUE() },
    error: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.errorText, lineHeight: 18 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    photoBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#f1f3f4', alignItems: 'center', justifyContent: 'center' },
    photoIcon: { fontSize: 18 },
    input: { flex: 1, height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#f1f3f4', color: Colors.textMain, fontSize: 14.5, fontFamily: FONTS.bodyRegular },
    send: { width: 48, height: 48, borderRadius: 24, backgroundColor: BLUE(), alignItems: 'center', justifyContent: 'center' },
    sendOff: { opacity: 0.4 },
    sendIcon: { fontSize: 16, color: getThemeMode() === 'dark' ? '#0b1b3a' : '#ffffff' },
  })
);

const EMOJIS = ['👍', '🙏', '😊', '😀', '👌', '✅', '❤️', '🔧', '🚗', '⚠️', '🙂', '😅', '🤝', '👏', '🔥', '💯'];

const dk = () => getThemeMode() === 'dark';
const TAGS: Record<ChatSide, { label: string; bg: () => string; fg: () => string }> = {
  owner: { label: 'Owner update', bg: () => (dk() ? '#1c2b4a' : '#e8f0fe'), fg: () => (dk() ? '#8ab4f8' : '#1967d2') },
  garage: { label: 'Garage update', bg: () => (dk() ? '#4a3200' : '#fef7e0'), fg: () => (dk() ? '#fdd663' : '#b06000') },
  shop: { label: 'Shop update', bg: () => (dk() ? '#0d3b1f' : '#e6f4ea'), fg: () => (dk() ? '#81c995' : '#137333') },
  tech: { label: 'Technician update', bg: () => (dk() ? '#3b1f5c' : '#f3e8fd'), fg: () => (dk() ? '#d7aefb' : '#8430ce') },
};

const WA = () => {
  const dark = getThemeMode() === 'dark';
  return {
    wall: dark ? '#12161c' : '#e8edf4',
    mine: dark ? '#1f3a66' : '#d2e3fc',
    theirs: dark ? '#2a2f3a' : '#ffffff',
    text: dark ? '#e8eaed' : '#202124',
    sub: dark ? '#9aa0a6' : '#5f6368',
    green: dark ? '#8db1ff' : '#1a73e8',
    field: dark ? '#2a2f3a' : '#ffffff',
    line: dark ? '#3c4043' : '#dadce0',
  };
};

const wa = themedStyles(() => {
  const c = WA();
  return StyleSheet.create({
    call: { alignSelf: 'flex-start', paddingHorizontal: 14, height: 32, justifyContent: 'center', borderRadius: 16, backgroundColor: c.field, borderWidth: 1, borderColor: c.green },
    callText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: c.green },
    list: { flex: 1, backgroundColor: c.wall },
    pill: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 48, borderRadius: 24, paddingHorizontal: 4, backgroundColor: getThemeMode() === 'dark' ? '#303134' : '#f1f3f4', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? '#3c4043' : '#dadce0' },
    pillBtn: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
    pillInput: { flex: 1, height: 44, paddingHorizontal: 4, color: Colors.textMain, fontSize: 15, fontFamily: FONTS.bodyRegular, ...({ outlineStyle: 'none' } as object) },
    recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#dc2626', marginLeft: 4, marginRight: 8 },
    recTime: { fontSize: 15, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    recHint: { flex: 1, textAlign: 'right', paddingRight: 12, fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    sendRec: { backgroundColor: '#dc2626' },
    emojiRow: { gap: 6, paddingHorizontal: 6, paddingVertical: 2 },
    tagBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tagBtn: { alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0', backgroundColor: Colors.bgCard },
    tagBtnIcon: { fontSize: 15 },
    tagBtnText: { fontSize: 18, lineHeight: 22, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    mention: { color: getThemeMode() === 'dark' ? '#8ab4f8' : '#1a73e8', fontFamily: FONTS.bodyBold, textDecorationLine: 'underline' },
    shopChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    shopList: { marginHorizontal: 4, borderRadius: 14, overflow: 'hidden', backgroundColor: getThemeMode() === 'dark' ? '#303134' : '#ffffff', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? '#3c4043' : '#dadce0' },
    shopListHead: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, fontSize: 11.5, fontFamily: FONTS.bodyBold, color: Colors.textMuted },
    shopRow: { paddingHorizontal: 14, paddingVertical: 9, gap: 1 },
    shopRowName: { fontSize: 13.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    shopRowSub: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    attachCard: { paddingTop: 8, paddingBottom: 14, paddingHorizontal: 10, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: getThemeMode() === 'dark' ? '#202124' : '#ffffff', borderWidth: 1, borderBottomWidth: 0, borderColor: getThemeMode() === 'dark' ? '#3c4043' : '#dadce0' },
    attachHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 14, backgroundColor: getThemeMode() === 'dark' ? '#5f6368' : '#dadce0' },
    attachGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
    attachItem: { width: '25%', alignItems: 'center', gap: 6 },
    attachDisc: { width: '86%', height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? '#3c4043' : '#dadce0', backgroundColor: getThemeMode() === 'dark' ? '#202124' : '#ffffff' },
    attachGlyph: { fontSize: 24 },
    attachLabel: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    emoji: { fontSize: 26, paddingHorizontal: 3 },
    // The typing area is its own surface: a solid bar under the grey message area, cutting across the sheet's footer padding.
    composer: { gap: 8, marginHorizontal: -8, marginTop: -8, marginBottom: -10, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 12, backgroundColor: getThemeMode() === 'dark' ? '#202124' : '#ffffff', borderTopWidth: 1, borderTopColor: c.line, shadowColor: '#3c4043', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 6 },
    vehicleMain: { flex: 1 },
    vehicleBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: c.field, borderBottomWidth: 1, borderBottomColor: c.line },
    vehicleText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: c.text },
    headerCall: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.16)' : '#e6f4ea', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(129, 201, 149, 0.3)' : '#ceead6' },
    headerCallText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#81c995' : '#188038' },
    headerCallIcon: { fontSize: 18 },
    listBody: { padding: 8, gap: 2, flexGrow: 1, justifyContent: 'flex-start' },
    empty: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: c.sub, lineHeight: 19, textAlign: 'center', paddingVertical: 24, paddingHorizontal: 12 },
    group: { maxWidth: '82%' },
    groupMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    groupTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    groupLast: { marginBottom: 6 },
    bubble: { paddingHorizontal: 8, paddingTop: 4, paddingBottom: 3, borderRadius: 12, gap: 3, shadowColor: '#3c4043', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.13, shadowRadius: 0.5, elevation: 1 },
    mine: { backgroundColor: c.mine, borderBottomRightRadius: 4 },
    theirs: { backgroundColor: c.theirs, borderBottomLeftRadius: 4 },
    msg: { fontSize: 13.5, fontFamily: FONTS.bodyRegular, color: c.text, lineHeight: 19 },
    event: { alignSelf: 'stretch', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? '#3c4043' : '#dadce0', backgroundColor: getThemeMode() === 'dark' ? '#202124' : '#ffffff', shadowColor: '#3c4043', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 6 },
    eventLine: { color: c.text, fontSize: 13.5, lineHeight: 19 },
    eventHead: { fontSize: 15, lineHeight: 21 },
    eventMine: { backgroundColor: getThemeMode() === 'dark' ? '#1c2b4a' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? '#2f4b7c' : '#c6dafc' },
    // The Job Info card's cream: what a side other than the owner and the garage owner (technician, parts shop) posts uses it too.
    eventJobInfo: { backgroundColor: getThemeMode() === 'dark' ? '#182229' : '#ffeecd', borderColor: getThemeMode() === 'dark' ? '#2a3942' : '#f1dfb4' },
    recordMessage: { alignSelf: 'center', width: '92%', marginVertical: 6 },
    eventTag: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 2, borderRadius: 8 },
    eventTagText: { fontSize: 10.5, fontFamily: FONTS.bodyBold, letterSpacing: 0.2 },
    msgMine: { color: c.text },
    time: { alignSelf: 'flex-end', fontSize: 8.5, fontFamily: FONTS.bodyRegular, color: c.sub },
    tick: { color: '#1a73e8', fontWeight: '700' },
    update: { alignSelf: 'center', maxWidth: '90%', marginVertical: 3, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? '#182229' : '#ffeecd', alignItems: 'center', gap: 2 },
    updateText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#e9edef' : '#111b21', textAlign: 'center', lineHeight: 16 },
    updateTime: { fontSize: 9, fontFamily: FONTS.bodyRegular, color: getThemeMode() === 'dark' ? '#8696a0' : '#54656f' },
    record: { alignSelf: 'center', width: '92%', marginBottom: 8, borderRadius: 10, overflow: 'hidden', backgroundColor: getThemeMode() === 'dark' ? '#182229' : '#ffeecd', shadowColor: '#0b141a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 0.5, elevation: 1 },
    recordHead: { paddingHorizontal: 12, paddingTop: 10, alignItems: 'center' },
    recordHeadText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#ffd279' : '#54656f' },
    recordBody: { paddingHorizontal: 12, paddingVertical: 8, gap: 3, alignItems: 'center' },
    recordTitle: { fontSize: 13, fontFamily: FONTS.titleBold, color: getThemeMode() === 'dark' ? '#e9edef' : '#111b21', textAlign: 'center', marginBottom: 2 },
    recordText: { fontSize: 11.5, fontFamily: FONTS.bodyRegular, color: getThemeMode() === 'dark' ? '#8696a0' : '#54656f', lineHeight: 16, textAlign: 'center' },
    terms: { alignSelf: 'center', width: '92%', marginBottom: 8, gap: 4, paddingHorizontal: 2 },
    termsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: getThemeMode() === 'dark' ? '#2a3942' : '#e5d7b5' },
    dateChipWrap: { alignItems: 'center', marginTop: 4, marginBottom: 8 },
    dateChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8696a0' : '#54656f', backgroundColor: getThemeMode() === 'dark' ? '#182229' : '#ffffff' },
    termsRowText: { fontSize: 10.5, fontFamily: FONTS.bodyRegular, color: getThemeMode() === 'dark' ? '#53bdeb' : '#027eb5' },
    termsInner: { gap: 5, paddingHorizontal: 12, paddingBottom: 10, paddingTop: 4 },
    termsText: { fontSize: 11, fontFamily: FONTS.bodyRegular, color: getThemeMode() === 'dark' ? '#8696a0' : '#54656f', lineHeight: 16, textAlign: 'center' },
    moreChip: { alignSelf: 'flex-start', paddingHorizontal: 12, height: 28, justifyContent: 'center', borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    moreChipText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: c.green },
    reportChip: { alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: 14, paddingVertical: 7, minHeight: 34, borderRadius: 10, justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.2)' : '#e8f0fe', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc', marginTop: 8 },
    reportChipText: { fontSize: 12, lineHeight: 18, fontFamily: FONTS.bodySemiBold, color: c.green },
    newDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
    newLine: { flex: 1, height: 1, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.35)' : '#aecbfa' },
    newText: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: c.green },
    updateBody: { gap: 1 },
    msgHead: { fontFamily: FONTS.bodyBold, fontWeight: '800' },
    msgHeadGap: { marginTop: 5 },
    deleted: { opacity: 0.7 },
    deletedText: { fontSize: 10.5, fontStyle: 'italic', fontFamily: FONTS.bodyRegular, color: c.sub },
    composerInner: { gap: 8 },
    composerLocked: { opacity: 0.45 },
    msgActions: { flexDirection: 'row', gap: 6, marginTop: 3 },
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 0, paddingHorizontal: 7, height: 20, borderRadius: 10, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? '#8ab4f8' : '#1a73e8', backgroundColor: Colors.bgCard },
    editBtnText: { fontSize: 9.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8ab4f8' : '#1a73e8' },
    editedMark: { fontSize: 10, fontStyle: 'italic', fontFamily: FONTS.bodyRegular, color: Colors.textMuted, alignSelf: 'flex-end' },
    editBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: getThemeMode() === 'dark' ? '#1c2b4a' : '#e8f0fe' },
    editBarText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: getThemeMode() === 'dark' ? '#8ab4f8' : '#1a73e8' },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 0, paddingHorizontal: 7, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#d93025', backgroundColor: c.field },
    deleteText: { fontSize: 9.5, fontFamily: FONTS.bodySemiBold, color: '#d93025' },
    photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    photo: { width: 84, height: 60, borderRadius: 8 },
    quick: { gap: 6, paddingVertical: 2 },
    chip: { paddingHorizontal: 12, height: 32, justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: c.green, backgroundColor: c.field },
    chipText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: c.green },
    error: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.errorText, lineHeight: 18 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    photoBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.field, borderWidth: 1, borderColor: getThemeMode() === 'dark' ? '#3c4043' : '#dadce0', alignItems: 'center', justifyContent: 'center' },
    photoIcon: { fontSize: 18 },
    input: { flex: 1, height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: getThemeMode() === 'dark' ? '#303134' : '#f1f3f4', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? '#3c4043' : '#dadce0', color: c.text, fontSize: 15, fontFamily: FONTS.bodyRegular },
    send: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.green, alignItems: 'center', justifyContent: 'center' },
    sendOff: { opacity: 0.5 },
    sendIcon: { fontSize: 15, color: getThemeMode() === 'dark' ? '#0b1b3a' : '#ffffff' },
  });
});

/** The round 💬 button on a job card: opens the chat; a red dot with a count shows unread messages. */
export const ChatIconButton: React.FC<{ onPress: () => void; unread?: number; label?: string; /** The button's diameter (34 by default). */ size?: number }> = ({ onPress, unread = 0, label = 'Chat', size = 34 }) => (
  <Pressable style={[btn.btn, size !== 34 && { width: size, height: size, borderRadius: size / 2 }]} onPress={onPress} hitSlop={6} accessibilityLabel={label}>
    <Icon name="message-circle" size={Math.round(size * 0.5)} color={getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8'} />
    {unread > 0 && (
      <View style={btn.badge}>
        <Text style={btn.badgeText}>{unread > 9 ? '9+' : unread}</Text>
      </View>
    )}
  </Pressable>
);

const btn = themedStyles(() =>
  StyleSheet.create({
    btn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    icon: { fontSize: 16 },
    badge: { position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, borderWidth: 1.5, borderColor: Colors.bgCard, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
    badgeText: { fontSize: 9.5, fontWeight: '800', color: '#ffffff' },
  })
);
