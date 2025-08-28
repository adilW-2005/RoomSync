import React, { useEffect, useRef, useState } from 'react';
import { View, FlatList, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import useMessageStore from '../../state/useMessageStore';
import useAuthStore from '../../state/useAuthStore';
import { spacing, colors, radii } from '../../styles/theme';

function MessageBubble({ msg, mine }) {
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginVertical: 6 }}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {msg.text ? <UTText variant="body" style={{ color: mine ? 'white' : '#1E1E1E' }}>{msg.text}</UTText> : null}
        <UTText variant="meta" style={{ color: mine ? 'rgba(255,255,255,0.8)' : '#6B7280', marginTop: 4 }}>{new Date(msg.createdAt).toLocaleTimeString()}</UTText>
      </View>
    </View>
  );
}

export default function ConversationScreen({ navigation, route }) {
  const { conversationId } = route.params;
  const { messagesByConvId, ensureMessagesLoaded, fetchMore, hasMoreByConvId, send, markRead } = useMessageStore();
  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => { ensureMessagesLoaded(conversationId); }, [conversationId]);
  useEffect(() => { markRead(conversationId).catch(() => {}); }, [conversationId]);

  const data = messagesByConvId[conversationId] || [];

  const onEndReached = () => {
    if (hasMoreByConvId[conversationId]) fetchMore(conversationId).catch(() => {});
  };

  const onSend = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    await send(conversationId, { text: t }).catch(() => {});
  };

  const renderItem = ({ item }) => <MessageBubble msg={item} mine={String(item.fromUserId) === String(user?.id)} />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#F8F8F8' }}>
        <FlatList ref={listRef} data={data} keyExtractor={(i) => i.id} renderItem={renderItem} inverted onEndReached={onEndReached} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.lg }} />
        <View style={styles.composerWrap}>
          <TextInput value={text} onChangeText={setText} placeholder="Type a message" placeholderTextColor="#9CA3AF" style={styles.input} multiline={false} />
          <TouchableOpacity onPress={onSend} style={styles.sendBtn}><UTText variant="label" style={{ color: 'white' }}>Send</UTText></TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 14 },
  bubbleMine: { backgroundColor: colors.burntOrange, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: 'white', borderBottomLeftRadius: 4 },
  composerWrap: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: 'white', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EEE' },
  input: { flex: 1, height: 40, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#FAFAFA' },
  sendBtn: { marginLeft: 8, backgroundColor: colors.burntOrange, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
}); 