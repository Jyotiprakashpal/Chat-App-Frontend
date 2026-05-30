import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import { useContext, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthContext } from "../../context/Authcontext";
import ENDPOINTS from "../../services/api/endpoints";
import API from "../../services/api/method";
import socket, { connectSocket, sendSocketMessageAsync } from "../../services/socket";
import { Message } from "../../types/message";

const getMessageUserId = (value: Message["sender"] | Message["recipient"]) => {
  return typeof value === "string" ? value : value?._id;
};

const getMessageUserEmail = (value: Message["sender"] | Message["recipient"]) => {
  return typeof value === "string" ? undefined : value?.email;
};

const isPendingMessage = (message: Message) => {
  return message.status === "pending" || message._id.startsWith("temp-");
};

export default function ChatScreen() {
  const { id } = useLocalSearchParams(); // id = receiver email
  const chatPartnerId = Array.isArray(id) ? id[0] : id;
  const { user } = useContext(AuthContext);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const markMessagesRead = async () => {
    if (!chatPartnerId) return;

    try {
      await API.put(`${ENDPOINTS.CHAT.MARK_READ}/${encodeURIComponent(chatPartnerId)}`, {});
    } catch (error) {
      console.log("Mark read error:", error);
    }
  };

  // ✅ Fetch Messages
  const fetchMessages = async () => {
    try {
      console.log('Before fetchMessages for', id);
      const token = await AsyncStorage.getItem("token");
      const res = await API.get(`${ENDPOINTS.CHAT.MESSAGES}/${chatPartnerId}`, undefined, token ?? undefined);
      console.log('After fetchMessages for', chatPartnerId);
      setMessages(res.data || res || []);
      markMessagesRead();
    } catch (error) {
      console.log("Fetch error:", error);
      setMessages([]);
    }
  };

  useEffect(() => {
    fetchMessages();

    const setupSocket = async () => {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        connectSocket(token);
      }
    };

    setupSocket();

      const handleNewMessage = (message: Message & { senderUser?: { email?: string }; recipientUser?: { email?: string } }) => {
        const senderId = getMessageUserId(message.sender);
        const senderEmail = getMessageUserEmail(message.sender) || message.senderUser?.email;
        const recipientEmail = getMessageUserEmail(message.recipient) || message.recipientUser?.email;

        if (senderId === user?._id || senderEmail === user?.email) {
          return;
        }

        const recipientId = getMessageUserId(message.recipient);
        const isCurrentChat =
          senderId === chatPartnerId ||
          recipientId === chatPartnerId ||
          senderEmail === chatPartnerId ||
          recipientEmail === chatPartnerId ||
          message.senderUser?.email === chatPartnerId ||
          message.recipientUser?.email === chatPartnerId;

        if (isCurrentChat) {
          setMessages((prev) => {
            const alreadyExists = prev.some((item) =>
              item._id === message._id ||
              (
                item._id.startsWith("temp-") &&
                item.content === message.content &&
                getMessageUserId(item.sender) === senderId
              )
            );
            if (alreadyExists) return prev;
            return [...prev, message];
          });
          markMessagesRead();
        }
      };

      socket.on("newMessage", handleNewMessage);
      socket.on("receiveMessage", handleNewMessage);

      const handleMessagesRead = (data: { readBy?: string }) => {
        setMessages((prev) => prev.map((item) => {
          const isMyMessage =
            getMessageUserId(item.sender) === user?._id ||
            getMessageUserEmail(item.sender) === user?.email;
          const wasReadByRecipient =
            getMessageUserId(item.recipient) === data.readBy ||
            getMessageUserEmail(item.recipient) === data.readBy;

          return isMyMessage && wasReadByRecipient ? { ...item, read: true, status: "read" } : item;
        }));
      };

      socket.on("messagesRead", handleMessagesRead);

      const retryPendingMessages = async () => {
        const pendingMessages = messages.filter((item) => {
          const isMyMessage =
            getMessageUserId(item.sender) === user?._id ||
            getMessageUserEmail(item.sender) === user?.email;
          return isMyMessage && isPendingMessage(item);
        });

        for (const pendingMessage of pendingMessages) {
          try {
            const response = await sendSocketMessageAsync(chatPartnerId as string, pendingMessage.content);
            if (response.ok && response.message) {
              setMessages((prev) => prev.map((item) =>
                item._id === pendingMessage._id
                  ? { ...response.message, status: response.message.read ? "read" : "sent" }
                  : item
              ));
            }
          } catch {
            // Keep pending until another reconnect.
          }
        }
      };

      socket.on("connect", retryPendingMessages);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("receiveMessage", handleNewMessage);
      socket.off("messagesRead", handleMessagesRead);
      socket.off("connect", retryPendingMessages);
    };
  }, [chatPartnerId, messages, user?._id, user?.email]);

  // ✅ Send Message
  const handleSend = async () => {
    if (!text.trim() || !user?.email) return;

    // Format the message data as required by the MESSAGES endpoint
    const messageData = {
      recipient: chatPartnerId as string,
      content: text.trim(),
    };
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      _id: tempId,
      sender: user._id || user.email,
      recipient: chatPartnerId as string,
      content: messageData.content,
      createdAt: new Date().toISOString(),
      read: false,
      status: "pending",
      updatedAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");

    console.log("Sending message data:", messageData);
    try {
      const saveWithApi = async () => {
        const token = await AsyncStorage.getItem("token");
        const savedMessage = await API.post(ENDPOINTS.CHAT.MESSAGES, messageData, token ?? undefined);
        setMessages((prev) => prev.map((item) => item._id === tempId ? { ...savedMessage, status: savedMessage.read ? "read" : "sent" } : item));
      };

      if (!socket.connected) {
        await saveWithApi();
        return;
      }

      const response = await sendSocketMessageAsync(messageData.recipient, messageData.content);
      if (!response.ok || !response.message) {
        await saveWithApi();
        return;
      }

      setMessages((prev) => {
        if (prev.some((item) => item._id === response.message._id)) {
          return prev.filter((item) => item._id !== tempId);
        }
        return prev.map((item) => item._id === tempId ? { ...response.message, status: response.message.read ? "read" : "sent" } : item);
      });
    } catch (error) {
      setMessages((prev) => prev.map((item) => item._id === tempId ? { ...item, status: "pending" } : item));
      console.log("Send error:", error);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMyMessage =
      getMessageUserId(item.sender) === user?._id ||
      getMessageUserEmail(item.sender) === user?.email;

    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage,
        ]}
      >
        <Text style={isMyMessage ? styles.myMessageText : styles.otherMessageText}>
          {item.content}
        </Text>
        <View style={[styles.messageFooter, isMyMessage ? styles.myMessageFooter : styles.otherMessageFooter]}>
          <Text style={isMyMessage ? styles.messageTime : styles.otherMessageTime}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {isMyMessage && (
            <Ionicons
              name={isPendingMessage(item) ? "time-outline" : "checkmark-done"}
              size={14}
              color={item.read || item.status === "read" ? "#38BDF8" : isPendingMessage(item) ? "#64748B" : "#111827"}
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{chatPartnerId}</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Type a message..."
          value={text}
          onChangeText={setText}
          style={styles.input}
        />

        <TouchableOpacity 
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]} 
          onPress={handleSend}
          disabled={!text.trim()}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    alignItems: "center",
    backgroundColor: "#4F46E5",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  messageContainer: {
    maxWidth: "75%",
    padding: 10,
    borderRadius: 14,
    marginBottom: 10,
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#4F46E5",
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#E5E7EB",
  },
  messageText: {
    color: "#fff",
  },
  myMessageText: {
    color: "#fff",
    fontSize: 15,
  },
  otherMessageText: {
    color: "#1E293B",
    fontSize: 15,
  },
  messageTime: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    alignSelf: "flex-end",
  },
  otherMessageTime: {
    color: "#64748B",
    fontSize: 10,
    alignSelf: "flex-end",
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  myMessageFooter: {
    justifyContent: "flex-end",
  },
  otherMessageFooter: {
    justifyContent: "flex-start",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    borderRadius: 20,
    height: 40,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: "#4F46E5",
    padding: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
});
