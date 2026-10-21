import { OnChatIcon } from '@ongarage/shared';
import { elevation1, outline } from '../../utils/material';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Platform, Share } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ago, Colors, EmptyState, FONTS, getThemeMode, money, SERVICE_CATEGORIES, softEdge, softFill, softShadow, themedStyles } from '@ongarage/shared';
import { useWall, type WallPost } from '../../context/WallContext';
import { useNotice } from '../../context/NoticeContext';
import { useChat } from '../../context/ChatContext';

/** A post on the wall, whether another owner's or the signed-in owner's own request. */
export type FeedPost = WallPost & {
  mine?: boolean;
  /** For the owner's own request: the shops' answers (the existing enquiry card), shown on demand. */
  details?: React.ReactNode;
  /** Removes the owner's own post (absent once a part is reserved or bought). */
  onDelete?: () => void;
  /** Opens the form to add to the description or photos of the owner's own post. */
  onEdit?: () => void;
};

/** The post action icons: the same outlined thumbs-up and speech bubble a social feed uses (filled when switched on). */
const ICON_PATHS = {
  like: 'M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3',
  comment: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  bookmark: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
};
const ActionIcon: React.FC<{ name: keyof typeof ICON_PATHS; color: string; filled?: boolean }> = ({ name, color, filled }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24">
    <Path d={ICON_PATHS[name]} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill={filled ? color : 'none'} />
  </Svg>
);

const Avatar: React.FC<{ name: string; mine?: boolean; big?: boolean }> = ({ name, mine, big }) => (
  <View style={[styles.avatar, big && styles.avatarBig, mine && styles.avatarMine]}>
    <Text style={styles.avatarText}>{mine ? '👤' : name.trim().charAt(0)}</Text>
  </View>
);

const PostCard: React.FC<{ post: FeedPost; now: number }> = ({ post, now }) => {
  const wall = useWall();
  const { notify } = useNotice();
  const chat = useChat();
  const { count, liked } = wall.likes(post.id, post.baseLikes);
  const comments = wall.commentsFor(post.id);
  const sent = wall.replyFor(post.id);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [replying, setReplying] = useState(false);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // A photo that cannot load (offline) is dropped rather than left as an empty grey box.
  const [photoFailed, setPhotoFailed] = useState(false);

  // Share: the phone's own share sheet (or the browser's); where there is none the post is copied, so it can be pasted into a message.
  const sharePost = async () => {
    wall.markShared(post.id);
    const text = `${post.part} — ${post.vehicle ? post.vehicle + ' · ' : ''}${post.place} (OnMart On Feed · ${post.author})\n${post.description}`.trim();
    try {
      const nav = (globalThis as { navigator?: { share?: (d: { title: string; text: string }) => Promise<void>; clipboard?: { writeText: (t: string) => Promise<void> } } }).navigator;
      if (nav?.share) await nav.share({ title: post.part, text });
      else if (Platform.OS !== 'web') await Share.share({ message: text });
      else if (nav?.clipboard) {
        await nav.clipboard.writeText(text);
        notify({ icon: '📋', title: 'පෝස්ට් එක පිටපත් කළා', body: 'වෙනත් තැනක අලවා බෙදාගන්න.', tone: 'primary' });
      }
    } catch {
      // the share sheet was closed: nothing to do
    }
  };

  const submitComment = () => {
    const text = comment.trim();
    if (!text) return;
    wall.addComment(post.id, text);
    setComment('');
  };
  const submitReply = () => {
    const amount = Number(price.replace(/[^\d]/g, ''));
    wall.sendReply(post.id, { price: amount > 0 ? amount : undefined, message: message.trim() });
    setReplying(false);
    // A direct message to the poster is a conversation: it opens in OnChat, with what was written as its first message.
    const text = ['🙋 මෙම කොටස මා ළඟ තිබේ.', amount > 0 ? `මිල රු. ${amount.toLocaleString('en-US')}` : '', message.trim()].filter(Boolean).join(' · ');
    chat.openWith({ id: `feed:${post.id}`, title: post.author, subtitle: 'On Feed', profile: 'shop' }, text);
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Avatar name={post.author} mine={post.mine} big />
        <View style={styles.flex1}>
          <Text style={styles.author} numberOfLines={1}>
            {post.mine ? 'ඔබ' : post.author}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {post.place} · {ago(now - post.at)} · 🌐
          </Text>
        </View>
        {post.mine && (post.onEdit || post.onDelete) && (
          <View style={styles.postBtns}>
            {post.onEdit && (
              <Pressable style={styles.deleteBtn} onPress={post.onEdit} accessibilityLabel="Edit my post">
                <Text style={styles.editText}>✎ සංස්කරණය</Text>
              </Pressable>
            )}
            {post.onDelete && (
              <Pressable style={styles.deleteBtn} onPress={() => setConfirmDelete(true)} accessibilityLabel="Delete my post">
                <Text style={styles.deleteText}>🗑️ මකන්න</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {confirmDelete && (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>මෙම පෝස්ට් එක මකන්නද? ඉල්ලීම අවලංගු වන අතර වෙළඳසැල්වලට තවදුරටත් නොපෙනේ.</Text>
          <View style={styles.confirmRow}>
            <Pressable style={styles.confirmCancel} onPress={() => setConfirmDelete(false)} accessibilityLabel="Keep post">
              <Text style={styles.confirmCancelText}>අවලංගු</Text>
            </Pressable>
            <Pressable
              style={styles.confirmDelete}
              onPress={() => {
                post.onDelete?.();
                notify({ icon: '🗑️', title: 'පෝස්ට් එක මකා දැමුවා', body: post.part, tone: 'primary' });
              }}
              accessibilityLabel="Confirm delete post"
            >
              <Text style={styles.confirmDeleteText}>මකන්න</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.textBlock}>
        <Text style={styles.part}>🔧 {post.part}</Text>
        {!!post.description && <Text style={styles.body}>{post.description}</Text>}
        <Text style={styles.vehicleText}>🚗 {post.vehicle}</Text>
      </View>
      {post.photos.length > 0 && !photoFailed && (
        <Image source={{ uri: post.photos[0] }} style={styles.photo} resizeMode="cover" onError={() => setPhotoFailed(true)} accessibilityLabel={`${post.part} photo`} />
      )}

      <View style={styles.counts}>
        {/* the likes first, then the comments (touching the comments count opens the comments) */}
        <View style={styles.countGroup}>
          <Text style={styles.countText}>👍 {count}</Text>
          <Pressable onPress={() => setShowComments((v) => !v)} hitSlop={8} accessibilityLabel="Comments">
            <Text style={styles.countText}>💬 {comments.length}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={() => wall.toggleLike(post.id)} accessibilityLabel="Like post">
          <ActionIcon name="like" color={liked ? Colors.primary : Colors.textMuted} filled={liked} />
        </Pressable>
        <Pressable style={styles.action} onPress={() => setShowComments((s) => !s)} accessibilityLabel="Comment on post">
          <ActionIcon name="comment" color={showComments ? Colors.primary : Colors.textMuted} />
        </Pressable>
        <Pressable style={styles.action} onPress={sharePost} accessibilityLabel="Share post">
          <ActionIcon name="share" color={Colors.textMuted} />
        </Pressable>
        {post.mine ? (
          post.details ? (
            <Pressable style={styles.action} onPress={() => setShowDetails((s) => !s)} accessibilityLabel="Show answers">
              <ActionIcon name="inbox" color={showDetails ? Colors.primary : Colors.textMuted} />
            </Pressable>
          ) : null
        ) : (
          <Pressable style={styles.action} onPress={() => setReplying((r) => !r)} accessibilityLabel="I have this part">
            {/* The direct message to the poster is named for where it goes: OnChat, in the same type as the icons beside it. */}
            {/* A chat icon (a speech bubble with its tail) with the word ONCHAT written inside it. */}
            <OnChatIcon width={44} color={sent ? Colors.success : replying ? Colors.primary : Colors.textMuted} />
          </Pressable>
        )}
        {/* the bookmark: at the right end of the same line as the other icons */}
        <View style={styles.flex1} />
        <Pressable
          style={styles.action}
          onPress={() => {
            wall.toggleSave(post.id);
            notify({ icon: wall.isSaved(post.id) ? '🔖' : '🗑️', title: wall.isSaved(post.id) ? 'පෝස්ට් එක ඉවත් කළා' : 'පෝස්ට් එක සුරැකුවා', body: post.part, tone: 'primary' });
          }}
          hitSlop={8}
          accessibilityLabel={wall.isSaved(post.id) ? 'Remove saved post' : 'Save post'}
        >
          <ActionIcon name="bookmark" color={wall.isSaved(post.id) ? Colors.primary : Colors.textMuted} filled={wall.isSaved(post.id)} />
        </Pressable>
      </View>

      {!!sent && (
        <View style={styles.sent}>
          <Text style={styles.sentText}>
            ✓ ඔබ {post.author} වෙත සෘජුවම දැනුම් දුන්නා{sent.price ? ` · ${money(sent.price)}` : ''}
            {sent.message ? ` · “${sent.message}”` : ''}
          </Text>
        </View>
      )}

      {replying && !sent && (
        <View style={styles.reply}>
          <Text style={styles.replyTitle}>මෙම කොටස ඔබ ළඟ තිබේද? පෝස්ට් කළ අයට පෞද්ගලිකව දැනුම් දෙන්න.</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="ඔබේ මිල (රු.) — අත්‍යවශ්‍ය නැත" placeholderTextColor={Colors.textMuted} />
          <TextInput style={[styles.input, styles.inputTall]} value={message} onChangeText={setMessage} multiline placeholder="තත්වය, ස්ථානය, වෙනත් විස්තර…" placeholderTextColor={Colors.textMuted} />
          <Pressable style={styles.send} onPress={submitReply} accessibilityLabel="Send reply to poster">
            <Text style={styles.sendText}>සෘජුවම දැනුම් දෙන්න</Text>
          </Pressable>
        </View>
      )}

      {post.mine && showDetails && post.details}

      {showComments && (
        <View style={styles.comments}>
          {comments.map((c) => (
            <View key={c.id} style={styles.commentRow}>
              <Avatar name={c.author} mine={c.author === 'ඔබ'} />
              <View style={styles.bubble}>
                <Text style={styles.commentAuthor}>{c.author}</Text>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            </View>
          ))}
          <View style={styles.commentInputRow}>
            <TextInput style={[styles.input, styles.flex1]} value={comment} onChangeText={setComment} onSubmitEditing={submitComment} accessibilityLabel="Write a comment" placeholder="Comment" placeholderTextColor={Colors.textMuted} />
            <Pressable style={styles.commentSend} onPress={submitComment} accessibilityLabel="Post comment">
              <Text style={styles.sendText}>➤</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

/** The service-category buttons; MartScreen pins them under the header so they stay put while the posts scroll. */
export const WallFilters: React.FC<{ category: string; onChange: (id: string) => void }> = ({ category, onChange }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
    {[{ id: '', icon: '🗂️', name: 'සියල්ල' }, ...SERVICE_CATEGORIES].map((c) => {
      const on = category === c.id;
      return (
        <Pressable key={c.id || 'all'} style={[styles.filter, on && styles.filterOn]} onPress={() => onChange(c.id)} accessibilityLabel={`Filter ${c.name}`}>
          <Text style={[styles.filterText, on && styles.filterTextOn]}>
            {c.icon} {c.name}
          </Text>
        </Pressable>
      );
    })}
  </ScrollView>
);

/** The open wall, laid out like a social feed: a "what part do you need?" box, then everyone's posts, newest first. */
export const WallFeed: React.FC<{ myPosts: FeedPost[]; category: string; now: number; onCompose: () => void }> = ({ myPosts, category, now, onCompose }) => {
  const { posts } = useWall();
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const all: FeedPost[] = [...myPosts, ...posts].sort((a, b) => b.at - a.at);
  const shown = all
    .filter((p) => scope === 'all' || p.mine)
    .filter((p) => !category || p.categoryId === category);

  return (
    <>
      <View style={styles.compose}>
        <Pressable style={styles.composeBox} onPress={onCompose} accessibilityLabel="What part do you need?">
          <Text style={styles.composeText} numberOfLines={1}>ඔබට අවශ්‍ය දුර්ලභ කොටස කුමක්ද?</Text>
          <Text style={styles.composePhoto}>🖼️</Text>
        </Pressable>
      </View>
      <View style={styles.scope}>
        {[
          { id: 'all', label: '🌐 සියලු පෝස්ට්' },
          { id: 'mine', label: `👤 මගේ පෝස්ට් (${myPosts.length})` },
        ].map((s) => {
          const on = (scope === 'mine') === (s.id === 'mine');
          return (
            <Pressable key={s.id} style={[styles.scopeTab, on && styles.scopeTabOn]} onPress={() => setScope(s.id as 'all' | 'mine')} accessibilityLabel={s.label}>
              <Text style={[styles.scopeText, on && styles.scopeTextOn]} numberOfLines={1}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {/* On my posts: a question that offers to add another rare part (it opens the same form as the box above). */}
      {scope === 'mine' && (
        <Pressable style={styles.addChip} onPress={onCompose} accessibilityLabel="Add a new rare part">
          <Text style={styles.addChipPlus}>＋</Text>
          <Text style={styles.addChipText} numberOfLines={1}>
            අලුතින් දුර්ලභ කොටසක් එකතු කරන්නද?
          </Text>
        </Pressable>
      )}
      {shown.length === 0 ? (
        <EmptyState icon={scope === 'mine' ? '📭' : '🔍'} title={scope === 'mine' ? 'ඔබගේ පෝස්ට් නැත' : 'පෝස්ට් හමු නොවීය'} text={category ? 'වෙනත් අංශයක් තෝරන්න, නැතහොත් ඔබම පෝස්ට් එකක් දමන්න.' : scope === 'mine' ? 'ඔබ වෝල් එකට දමන කොටස් මෙහි පෙන්වයි.' : 'තවම පෝස්ට් නැත.'} />
      ) : (
        shown.map((p) => <PostCard key={p.id} post={p} now={now} />)
      )}
    </>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    flex1: { flex: 1 },
    compose: { flexDirection: 'row', alignItems: 'center' },
    addChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 38, borderRadius: 19, backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderWidth: 1, borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    addChipPlus: { fontSize: 16, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    addChipText: { fontSize: 13, fontFamily: FONTS.bodyBold, color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    scope: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
    scopeTab: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
    scopeTabOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe' },
    scopeText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    scopeTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    filters: { gap: 8, paddingHorizontal: 6 },
    filter: { paddingHorizontal: 14, height: 32, borderRadius: 8, justifyContent: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
    filterOn: { backgroundColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.16)' : '#e8f0fe', borderColor: getThemeMode() === 'dark' ? 'rgba(141, 177, 255, 0.3)' : '#d2e3fc' },
    filterText: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: Colors.textSoft },
    filterTextOn: { color: getThemeMode() === 'dark' ? '#8db1ff' : '#1a73e8' },
    composePhoto: { fontSize: 20 },
    composeBox: { flex: 1, height: 46, borderRadius: 23, paddingLeft: 16, paddingRight: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    composeText: { flex: 1, fontSize: 14, fontFamily: FONTS.bodyRegular, color: Colors.textMuted },
    // A Material post card: 16px of inner padding for text, the photo full width, a reactions row and equal action buttons.
    card: { paddingTop: 16, paddingBottom: 8, borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), ...elevation1() },
    textBlock: { paddingHorizontal: 16, gap: 6, paddingBottom: 12 },
    rule: { height: 1, marginHorizontal: 16, backgroundColor: getThemeMode() === 'dark' ? Colors.borderColor : '#dadce0' },
    avatarBig: { width: 40, height: 40, borderRadius: 20 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
    avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarMine: { backgroundColor: softFill() },
    avatarText: { fontSize: 15, fontFamily: FONTS.titleBold, color: '#ffffff' },
    author: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    meta: { fontSize: 12.5, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 2 },
    deleteBtn: { paddingHorizontal: 12, height: 30, borderRadius: 8, justifyContent: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
    postBtns: { flexDirection: 'row', gap: 6 },
    editText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.primary },
    deleteText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
    confirm: { gap: 8, padding: 12, borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#fef7e0', marginHorizontal: 16 },
    confirmText: { fontSize: 11.5, lineHeight: 16, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    confirmRow: { flexDirection: 'row', gap: 8 },
    confirmCancel: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline() },
    confirmCancelText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    confirmDelete: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.errorText },
    confirmDeleteText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    part: { fontSize: 16, fontFamily: FONTS.titleBold, color: Colors.textMain },
    body: { fontSize: 14, lineHeight: 21, fontFamily: FONTS.bodyRegular, color: Colors.textSoft },
    vehicleText: { fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    photo: { width: '100%', height: 280, backgroundColor: softFill() },
    countGroup: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    counts: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 10 },
    countText: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 2, paddingHorizontal: 6, paddingVertical: 2 },
    // The icons sit together at the left (no longer spread over the whole width), with a small space between them.
    // The word sits in the middle of the bubble's body (the part above its tail).
    onChatIcon: { width: 44, height: 26, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 5.5 },
    onChatWord: { fontSize: 7, lineHeight: 9, fontFamily: FONTS.bodyBold, letterSpacing: 0.1 },
    action: { alignItems: 'center', justifyContent: 'center', height: 44, paddingHorizontal: 10, borderRadius: 8 },
    actionText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    actionOn: { color: Colors.primary },
    actionHave: { color: Colors.success },
    sent: { padding: 12, borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#e6f4ea', marginHorizontal: 16 },
    sentText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.success },
    reply: { gap: 8, padding: 12, borderRadius: 8, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#f1f3f4', marginHorizontal: 16 },
    replyTitle: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    input: { minHeight: 40, paddingHorizontal: 12, borderRadius: 8, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: outline(), color: Colors.textMain, fontSize: 13.5, fontFamily: FONTS.bodyRegular },
    inputTall: { minHeight: 64, paddingTop: 8, textAlignVertical: 'top' },
    send: { height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.success },
    sendText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#ffffff' },
    comments: { gap: 8, paddingTop: 4, marginHorizontal: 16 },
    commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    bubble: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: getThemeMode() === 'dark' ? Colors.subtleFill : '#f1f3f4' },
    commentAuthor: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    commentText: { fontSize: 13, lineHeight: 19, fontFamily: FONTS.bodyRegular, color: Colors.textMain },
    commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    commentSend: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  })
);
