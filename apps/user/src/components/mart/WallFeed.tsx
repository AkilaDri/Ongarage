import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ago, Colors, EmptyState, FONTS, getThemeMode, money, SERVICE_CATEGORIES, softEdge, softFill, softShadow, themedStyles } from '@ongarage/shared';
import { useWall, type WallPost } from '../../context/WallContext';
import { useNotice } from '../../context/NoticeContext';

/** A post on the wall, whether another owner's or the signed-in owner's own request. */
export type FeedPost = WallPost & {
  mine?: boolean;
  /** For the owner's own request: the shops' answers (the existing enquiry card), shown on demand. */
  details?: React.ReactNode;
  /** Removes the owner's own post (absent once a part is reserved or bought). */
  onDelete?: () => void;
};

/** The post action icons: the same outlined thumbs-up and speech bubble a social feed uses (filled when switched on). */
const ICON_PATHS = {
  like: 'M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3',
  comment: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
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
    notify({ icon: '🙋', title: 'පිළිතුර එවා ඇත', body: `${post.author} වෙත සෘජුවම දැනුම් දුන්නා.`, tone: 'primary' });
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
        {post.mine && post.onDelete && (
          <Pressable style={styles.deleteBtn} onPress={() => setConfirmDelete(true)} accessibilityLabel="Delete my post">
            <Text style={styles.deleteText}>🗑️ මකන්න</Text>
          </Pressable>
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
        <Text style={styles.countText}>👍 {count}</Text>
        <Pressable onPress={() => setShowComments((s) => !s)}>
          <Text style={styles.countText}>අදහස් {comments.length}</Text>
        </Pressable>
      </View>
      <View style={styles.rule} />

      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={() => wall.toggleLike(post.id)} accessibilityLabel="Like post">
          <ActionIcon name="like" color={liked ? Colors.primary : Colors.textMuted} filled={liked} />
        </Pressable>
        <Pressable style={styles.action} onPress={() => setShowComments((s) => !s)} accessibilityLabel="Comment on post">
          <ActionIcon name="comment" color={showComments ? Colors.primary : Colors.textMuted} />
        </Pressable>
        {post.mine ? (
          post.details ? (
            <Pressable style={styles.action} onPress={() => setShowDetails((s) => !s)} accessibilityLabel="Show answers">
              <ActionIcon name="inbox" color={showDetails ? Colors.primary : Colors.textMuted} />
            </Pressable>
          ) : null
        ) : (
          <Pressable style={styles.action} onPress={() => setReplying((r) => !r)} accessibilityLabel="I have this part">
            <ActionIcon name="send" color={sent ? Colors.success : replying ? Colors.primary : Colors.textMuted} filled={!!sent} />
          </Pressable>
        )}
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
            <TextInput style={[styles.input, styles.flex1]} value={comment} onChangeText={setComment} onSubmitEditing={submitComment} accessibilityLabel="Write a comment" placeholder="අදහසක් දක්වන්න…" placeholderTextColor={Colors.textMuted} />
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
    scope: { flexDirection: 'row', padding: 4, borderRadius: 22, backgroundColor: softFill() },
    scopeTab: { flex: 1, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
    scopeTabOn: { backgroundColor: Colors.bgCard, ...softShadow() },
    scopeText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    scopeTextOn: { color: Colors.primary },
    filters: { gap: 8, paddingHorizontal: 16 },
    filter: { paddingHorizontal: 13, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge() },
    filterOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    filterText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    filterTextOn: { color: '#ffffff' },
    composePhoto: { fontSize: 20 },
    composeBox: { flex: 1, height: 46, borderRadius: 23, paddingLeft: 18, paddingRight: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: softFill(), borderWidth: 1, borderColor: softEdge() },
    composeText: { flex: 1, fontSize: 13, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    // A Facebook-style post: edge to edge (the negative margin cancels the list's side padding (6px)), hairlines above and below,
    // 12px of inner padding for text, the photo full width, a reactions row and three equal action buttons.
    card: { marginHorizontal: -6, paddingTop: 12, paddingBottom: 6, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderBottomWidth: 1, borderColor: getThemeMode() === 'dark' ? softEdge() : '#d3d9e2' },
    textBlock: { paddingHorizontal: 12, gap: 6, paddingBottom: 10 },
    rule: { height: 1, marginHorizontal: 12, backgroundColor: softEdge() },
    avatarBig: { width: 40, height: 40, borderRadius: 20 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 10 },
    avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarMine: { backgroundColor: softFill() },
    avatarText: { fontSize: 15, fontFamily: FONTS.titleBold, color: '#ffffff' },
    author: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    meta: { fontSize: 12, fontFamily: FONTS.bodyRegular, color: Colors.textMuted, marginTop: 1 },
    deleteBtn: { paddingHorizontal: 10, height: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: softFill() },
    deleteText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: Colors.errorText },
    confirm: { gap: 8, padding: 10, borderRadius: 14, backgroundColor: softFill(), marginHorizontal: 12 },
    confirmText: { fontSize: 11.5, lineHeight: 16, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    confirmRow: { flexDirection: 'row', gap: 8 },
    confirmCancel: { flex: 1, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge() },
    confirmCancelText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    confirmDelete: { flex: 1, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.errorText },
    confirmDeleteText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: '#ffffff' },
    part: { fontSize: 15, fontFamily: FONTS.titleBold, color: Colors.textMain },
    body: { fontSize: 14, lineHeight: 20, fontFamily: FONTS.bodyRegular, color: Colors.textMain },
    vehicleText: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    photo: { width: '100%', height: 280, backgroundColor: softFill() },
    counts: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
    countText: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: Colors.textMuted },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 2 },
    action: { width: 48, alignItems: 'center', justifyContent: 'center', height: 42, borderRadius: 21 },
    actionText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: Colors.textMuted },
    actionOn: { color: Colors.primary },
    actionHave: { color: Colors.success },
    sent: { padding: 10, borderRadius: 12, backgroundColor: softFill(), marginHorizontal: 12 },
    sentText: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.success },
    reply: { gap: 8, padding: 10, borderRadius: 14, backgroundColor: softFill(), marginHorizontal: 12 },
    replyTitle: { fontSize: 11.5, fontFamily: FONTS.bodySemiBold, color: Colors.textMain },
    input: { minHeight: 38, paddingHorizontal: 12, borderRadius: 12, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: softEdge(), color: Colors.textMain, fontSize: 12.5, fontFamily: FONTS.bodyRegular },
    inputTall: { minHeight: 64, paddingTop: 8, textAlignVertical: 'top' },
    send: { height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.success },
    sendText: { fontSize: 12.5, fontFamily: FONTS.bodySemiBold, color: '#ffffff' },
    comments: { gap: 8, paddingTop: 4, marginHorizontal: 12 },
    commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    bubble: { flex: 1, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: softFill() },
    commentAuthor: { fontSize: 11.5, fontFamily: FONTS.bodyBold, color: Colors.textMain },
    commentText: { fontSize: 12, lineHeight: 17, fontFamily: FONTS.bodyRegular, color: Colors.textMain },
    commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    commentSend: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  })
);
