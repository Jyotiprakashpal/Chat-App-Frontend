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
import socket from "../../services/socket";
import { Message } from "../../types/message";

export default function ChatScreen() {
  const { id } = useLocalSearchParams(); // id = receiver email
  const { user } = useContext(AuthContext);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  // ✅ Fetch Messages
  const fetchMessages = async () => {
    try {
      console.log('Before fetchMessages for', id);
      const token = await AsyncStorage.getItem("token");
      const res = await API.get(`${ENDPOINTS.CHAT.MESSAGES}/${id}`, undefined, token ?? undefined);
      console.log('After fetchMessages for', id);
      setMessages(res.data || []);
    } catch (error) {
      console.log("Fetch error:", error);
      setMessages([]);
    }
  };

  useEffect(() => {
    fetchMessages();

    socket.connect();

    socket.emit("join", user?.email);

      socket.on("receiveMessage", (message: Message) => {
        if (
          message.sender === id ||
          message.recipient === id
        ) {
          setMessages((prev) => [...prev, message]);
        }
      });

    return () => {
      socket.off("receiveMessage");
      socket.disconnect();
    };
  }, [id, user?.email]);

  // ✅ Send Message
  const handleSend = async () => {
    if (!text.trim() || !user?.email) return;

    // Format the message data as required by the MESSAGES endpoint
    const messageData = {
      recipient: id as string,
      content: text.trim(),
    };
    console.log("Sending message data:", messageData);
    try {
      // Get the token from AsyncStorage and pass it explicitly
      const token = await AsyncStorage.getItem("token");
      
      // Make the API call with explicit token passing (convert null to undefined)
      await API.post(ENDPOINTS.CHAT.MESSAGES, messageData, token ?? undefined);

      // Also emit via socket for real-time updates
      socket.emit("sendMessage", {
        senderEmail: user.email,
        receiverEmail: id as string,
        text: text.trim(),
        createdAt: new Date().toISOString(),
      });

      // Add to local messages state for UI update
      const newMessage: Message = {
        _id: Date.now().toString(),
        sender: user.email,
        recipient: id as string,
        content: text.trim(),
        createdAt: new Date().toISOString(),
        read: false,
        updatedAt: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, newMessage]);
      setText("");
    } catch (error) {
      console.log("Send error:", error);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender === user?.email;

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
        <Text style={isMyMessage ? styles.messageTime : styles.otherMessageTime}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
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
        <Text style={styles.headerTitle}>{id}</Text>
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
    marginTop: 4,
  },
  otherMessageTime: {
    color: "#64748B",
    fontSize: 10,
    alignSelf: "flex-end",
    marginTop: 4,
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
