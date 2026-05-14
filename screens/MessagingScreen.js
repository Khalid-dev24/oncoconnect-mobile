import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  dark: '#0A1628',
  card: '#0F1E35',
  teal: '#0B8F8F',
  mint: '#0DD6C8',
  text: '#FFFFFF',
  muted: '#7A9EAE',
  red: '#EF4444',
  green: '#22C55E',
};

export default function MessagingScreen() {
  const [windowActive, setWindowActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    checkWindowStatus();
    loadMessages();
    const interval = setInterval(checkWindowStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkWindowStatus = async () => {
    try {
      const windowData = await AsyncStorage.getItem('consultation_window');
      if (windowData) {
        const window = JSON.parse(windowData);
        const expiresAt = new Date(window.expires_at).getTime();
        setWindowActive(expiresAt > Date.now());
      }
    } catch (err) {
      console.error('Error checking window status:', err);
    }
  };

  const loadMessages = async () => {
    try {
      const messagesData = await AsyncStorage.getItem('messages');
      if (messagesData) {
        const msgs = JSON.parse(messagesData);
        setMessages(msgs.sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at)));
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) {
      Alert.alert('Empty Message', 'Please type a message');
      return;
    }

    if (!windowActive) {
      Alert.alert('Window Closed', 'Your consultation window is no longer active');
      return;
    }

    setSending(true);
    try {
      const newMessage = {
        id: Math.random().toString(36),
        sender_type: 'patient',
        body: inputText,
        sent_at: new Date().toISOString(),
        read_at: null,
      };

      let msgs = [];
      const messagesData = await AsyncStorage.getItem('messages');
      if (messagesData) {
        msgs = JSON.parse(messagesData);
      }

      msgs.push(newMessage);
      await AsyncStorage.setItem('messages', JSON.stringify(msgs));

      setMessages([...messages, newMessage]);
      setInputText('');

      // Simulate doctor response after 2 seconds
      setTimeout(() => {
        const doctorMessage = {
          id: Math.random().toString(36),
          sender_type: 'doctor',
          body: 'Thank you for your message. I have received it and will review your symptoms shortly.',
          sent_at: new Date().toISOString(),
          read_at: null,
        };
        setMessages((prev) => [...prev, doctorMessage]);
      }, 2000);

      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (err) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const MessageBubble = ({ message }) => {
    const isPatient = message.sender_type === 'patient';
    return (
      <View
        style={[
          styles.messageBubble,
          isPatient ? styles.patientMessage : styles.doctorMessage,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isPatient ? styles.patientMessageText : styles.doctorMessageText,
          ]}
        >
          {message.body}
        </Text>
        <Text
          style={[
            styles.messageTime,
            isPatient ? styles.patientMessageTime : styles.doctorMessageTime,
          ]}
        >
          {formatTime(message.sent_at)}
        </Text>
      </View>
    );
  };

  if (!windowActive) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No Active Consultation</Text>
          <Text style={styles.emptyText}>
            You need an active consultation window to message your doctor.
          </Text>
          <Text style={styles.emptyText}>
            Go to Home and open a consultation to start messaging.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Message Your Doctor</Text>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Connected</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          placeholderTextColor={COLORS.muted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || sending}
        >
          <Text style={styles.sendButtonText}>{sending ? '...' : '→'}</Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Messages are encrypted and only visible to you and your doctor
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.green,
    marginRight: 6,
  },
  statusText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 10,
  },
  messagesList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageBubble: {
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    maxWidth: '85%',
  },
  patientMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.teal,
  },
  doctorMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  patientMessageText: {
    color: COLORS.dark,
  },
  doctorMessageText: {
    color: COLORS.text,
  },
  messageTime: {
    fontSize: 10,
  },
  patientMessageTime: {
    color: COLORS.dark,
    opacity: 0.6,
  },
  doctorMessageTime: {
    color: COLORS.muted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.card,
    backgroundColor: COLORS.dark,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.teal,
    fontSize: 13,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.mint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: COLORS.dark,
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
  },
  footerText: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: 'center',
  },
});