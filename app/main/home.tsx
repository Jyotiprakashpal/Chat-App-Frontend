import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AuthContext } from "../context/Authcontext";
import LogoutPopup from "../Popup/logout";
import { ENDPOINTS } from "../services/api/endpoints";
import API from "../services/api/method";
import { uploadMedia } from "../services/api/uploadMedia";
import { PickedMediaFile, pickImageFiles } from "../services/pickMedia";
import socket, { connectSocket, sendSocketMessageAsync } from "../services/socket";
import { Message } from "../types/message";
import AllUserModal from "./chat/Utility/alluser";

// Types
interface User {
  _id: string;
  name?: string;
  username?: string;
  email: string;
}

interface Conversation {
  _id: string;
  partnerId?: string;
  participants?: User[];
  partner?: User;
  unreadCount?: number;
  lastMessage?: {
    _id?: string;
    text?: string;
    content?: string;
    sender: string;
    recipient?: string;
    read?: boolean;
    createdAt: string;
    updatedAt?: string;
  };
  updatedAt: string;
}

interface SelectedUser {
  id: string;
  name: string;
  email: string;
}

type SocketMessage = Message & {
  senderUser?: User;
  recipientUser?: User;
};

type PendingAttachment = {
  filename?: string;
  url?: string;
  contentType?: string;
  format?: string;
  resourceType?: string;
  localUri?: string;
};

const getMessageUserId = (value: Message["sender"] | Message["recipient"]) => {
  return typeof value === "string" ? value : value?._id;
};

const getMessageUserEmail = (value: Message["sender"] | Message["recipient"]) => {
  return typeof value === "string" ? undefined : value?.email;
};

const getConversationKey = (conversation: Conversation) => {
  return conversation.partnerId || conversation.partner?._id || conversation.participants?.[0]?._id || conversation._id;
};

const isPendingMessage = (message: Message) => {
  return message.status === "pending" || message._id.startsWith("temp-");
};

export default function Home() {
  const router = useRouter();
  const { logout, user: authUser } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const isTabletOrWeb = width >= 768;

  const backgroundDrift = useRef(new Animated.Value(0)).current;
  const backgroundPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const driftAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundDrift, {
          toValue: 1,
          duration: 9000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(backgroundDrift, {
          toValue: 0,
          duration: 9000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundPulse, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(backgroundPulse, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    driftAnimation.start();
    pulseAnimation.start();

    return () => {
      driftAnimation.stop();
      pulseAnimation.stop();
    };
  }, [backgroundDrift, backgroundPulse]);


  // States
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState("");
  const [usersModalVisible, setUsersModalVisible] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [logoutVisible, setLogoutVisible] = useState(false);

  // Ã¢Å“â€¦ Logout popup state
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [mobileChatVisible, setMobileChatVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatFlatListRef, setChatFlatListRef] = useState(null);


  // Ã¢Å“â€¦ Mobile menu state + Mobile chat modal state
  // Ã¢Å“â€¦ Message input state
  const [message, setMessage] = useState("");
  const [selectedMediaFiles, setSelectedMediaFiles] = useState<PickedMediaFile[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Ã¢Å“â€¦ Fetch conversations using ENDPOINTS
  const fetchConversations = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await API.get(ENDPOINTS.CHAT.GET_CONVERSATIONS);
      const convData = res.data?.conversations || res.data || res || [];
      setConversations(convData);
      setFilteredConversations(convData);
    } catch (error) {
      // Error fetching conversations
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/auth");
    } catch (error) {
      // Logout error
    }
  };

  // Ã¢Å“â€¦ Handle mobile menu item press
  const handleMobileMenuItemPress = useCallback((action: string) => {
    setMobileMenuVisible(false);

    switch (action) {
      case 'newChat':
        setUsersModalVisible(true);
        break;
      case 'logout':
        setLogoutVisible(true);
        break;
      default:
        break;
    }
  }, [handleLogout]);

  // Ã¢Å“â€¦ Handle user selection - Different behavior for mobile/desktop
  const fetchChatMessages = useCallback(async (recipientEmail: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await API.get(`${ENDPOINTS.CHAT.MESSAGES}/${recipientEmail}`, undefined, token ?? undefined);
      setChatMessages([...(response.data || response || [])].reverse());
    } catch (error) {
      console.error('Error fetching messages:', error);
      setChatMessages([]);
    }
  }, []);

  const clearConversationUnread = useCallback((partnerId?: string, partnerEmail?: string) => {
    setConversations(prev => prev.map(conv => {
      const convPartnerId = conv.partnerId || conv.partner?._id || conv.participants?.[0]?._id;
      const convPartnerEmail = conv.partner?.email || conv.participants?.[0]?.email;
      if (convPartnerId === partnerId || convPartnerEmail === partnerEmail) {
        return { ...conv, unreadCount: 0 };
      }
      return conv;
    }));

    setFilteredConversations(prev => prev.map(conv => {
      const convPartnerId = conv.partnerId || conv.partner?._id || conv.participants?.[0]?._id;
      const convPartnerEmail = conv.partner?.email || conv.participants?.[0]?.email;
      if (convPartnerId === partnerId || convPartnerEmail === partnerEmail) {
        return { ...conv, unreadCount: 0 };
      }
      return conv;
    }));
  }, []);

  const markConversationAsRead = useCallback(async (partnerId?: string, partnerEmail?: string) => {
    const identifier = partnerId || partnerEmail;
    if (!identifier) return;

    clearConversationUnread(partnerId, partnerEmail);

    try {
      await API.put(`${ENDPOINTS.CHAT.MARK_READ}/${encodeURIComponent(identifier)}`, {});
    } catch (error) {
      console.error('Error marking messages read:', error);
    }
  }, [clearConversationUnread]);

  const handleUserSelect = useCallback(async (user: SelectedUser) => {
    await fetchChatMessages(user.email);
    setSelectedUser(user);
    markConversationAsRead(user.id, user.email);
    if (!isTabletOrWeb) {
      setMobileChatVisible(true);
    }
  }, [isTabletOrWeb, fetchChatMessages, markConversationAsRead]);

  // Ã¢Å“â€¦ Close mobile chat and go back to conversations
  const handleBackToConversations = useCallback(() => {
    setMobileChatVisible(false);
    setSelectedUser(null);
    setMessage("");
    setSelectedMediaFiles([]);
  }, []);

  // Ã¢Å“â€¦ Handle sending message using ENDPOINTS
  const handleSendMessage = useCallback(async () => {
    const hasText = Boolean(message.trim());
    const hasMedia = selectedMediaFiles.length > 0;

    if ((!hasText && !hasMedia) || !selectedUser) {
      Alert.alert("Error", "Please select a user and enter a message or media");
      return;
    }

    const content = message.trim() || (hasMedia ? "Sent an attachment" : "");
    const recipient = selectedUser;
    const tempId = `temp-${hasMedia ? "media" : "text"}-${Date.now()}`;
    const pendingAttachments: PendingAttachment[] = selectedMediaFiles.map((file) => ({
      filename: file.name,
      url: file.uri,
      localUri: file.uri,
      contentType: file.type,
      resourceType: file.type?.startsWith("video") ? "video" : "image",
    }));
    const optimisticMessage: Message = {
      _id: tempId,
      sender: authUser?._id || authUser?.email || "",
      recipient: recipient.id || recipient.email,
      content,
      attachments: pendingAttachments,
      createdAt: new Date().toISOString(),
      read: false,
      status: "pending",
      updatedAt: new Date().toISOString(),
    };

    setChatMessages(prev => [optimisticMessage, ...prev]);
    setMessage("");
    setSelectedMediaFiles([]);

    try {
      setIsUploadingMedia(hasMedia);

      const saveWithApi = async () => {
        const uploadedAttachments = hasMedia
          ? (await uploadMedia(selectedMediaFiles)).map((file) => ({
              filename: file.filename || file.publicId,
              url: file.url,
              contentType: file.contentType,
              format: file.format,
              resourceType: file.resourceType,
            }))
          : [];

        const savedMessage = await API.post(ENDPOINTS.CHAT.MESSAGES, {
          recipient: recipient.email,
          content,
          attachments: uploadedAttachments,
        });

        setChatMessages(prev => prev.map(item => item._id === tempId ? { ...savedMessage, status: savedMessage.read ? "read" : "sent" } : item));
        fetchConversations(true);
      };

      if (hasMedia) {
        await saveWithApi();
        return;
      }

      if (!socket.connected) {
        await saveWithApi();
        return;
      }

      const response = await sendSocketMessageAsync(recipient.email, content);
      if (!response.ok || !response.message) {
        await saveWithApi();
        return;
      }

      setChatMessages(prev => prev.map(item => item._id === tempId ? { ...response.message, status: response.message.read ? "read" : "sent" } : item));
      fetchConversations(true);
    } catch (error: any) {
      setChatMessages(prev => prev.map(item => item._id === tempId ? { ...item, status: "pending" } : item));
      Alert.alert("Send failed", error?.message || "Could not send this message");
    } finally {
      setIsUploadingMedia(false);
    }
  }, [message, selectedMediaFiles, selectedUser, authUser?._id, authUser?.email, fetchConversations]);

  const handlePickAndUploadMedia = useCallback(async () => {
    if (!selectedUser) {
      Alert.alert("Error", "Please select a user before attaching media");
      return;
    }

    try {
      const pickedFiles = await pickImageFiles();
      if (!pickedFiles || pickedFiles.length === 0) return;
      setSelectedMediaFiles(prev => [...prev, ...pickedFiles]);
    } catch (error: any) {
      Alert.alert("Media picker failed", error?.message || "Could not pick media");
    }
  }, [selectedUser]);

  const removeSelectedMedia = useCallback((indexToRemove: number) => {
    setSelectedMediaFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  }, []);

  const renderMessageContent = useCallback((item: Message, isMyMessage: boolean, compact = false) => {
    const messageTextStyle = compact
      ? (isMyMessage ? styles.chatMyMessageText : styles.chatOtherMessageText)
      : (isMyMessage ? styles.myMessageText : styles.otherMessageText);
    const attachmentTextStyle = isMyMessage ? styles.myAttachmentText : styles.otherAttachmentText;
    const hasAttachments = Array.isArray(item.attachments) && item.attachments.length > 0;

    return (
      <View style={hasAttachments ? styles.attachmentMessageBody : undefined}>
        {!!item.content && item.content !== "Sent an attachment" && (
          <Text style={messageTextStyle}>{item.content}</Text>
        )}
        {hasAttachments && item.attachments?.map((attachment, index) => (
          <View key={`${attachment.filename || attachment.url || index}-${index}`}>
            {attachment.contentType?.startsWith("image") && attachment.url ? (
              <Image source={{ uri: attachment.url }} style={compact ? styles.chatAttachmentImage : styles.attachmentImage} />
            ) : (
              <View
                style={[styles.attachmentChip, isMyMessage ? styles.myAttachmentChip : styles.otherAttachmentChip]}
              >
                <Ionicons
                  name={attachment.resourceType === "video" || attachment.contentType?.startsWith("video") ? "videocam" : "document-attach"}
                  size={16}
                  color={isMyMessage ? "#EEF2FF" : "#4F46E5"}
                />
                <Text numberOfLines={1} style={attachmentTextStyle}>
                  {attachment.filename || attachment.url || "Uploaded media"}
                </Text>
              </View>
            )}
          </View>
        ))}
        {!hasAttachments && (
          <Text style={messageTextStyle}>{item.content}</Text>
        )}
      </View>
    );
  }, []);

  const renderSelectedMediaPreview = useCallback(() => {
    if (selectedMediaFiles.length === 0) return null;

    return (
      <View style={styles.selectedMediaStrip}>
        {selectedMediaFiles.map((file, index) => {
          const isImage = file.type?.startsWith("image");

          return (
            <View key={`${file.uri}-${index}`} style={styles.selectedMediaItem}>
              {isImage ? (
                <Image source={{ uri: file.uri }} style={styles.selectedMediaImage} />
              ) : (
                <View style={styles.selectedMediaFile}>
                  <Ionicons name="videocam" size={24} color="#4F46E5" />
                </View>
              )}
              <TouchableOpacity
                style={styles.removeMediaButton}
                onPress={() => removeSelectedMedia(index)}
                disabled={isUploadingMedia}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  }, [selectedMediaFiles, removeSelectedMedia, isUploadingMedia]);



  const getOtherParticipant = useCallback((conversation: Conversation): User | undefined => {
    console.log("Ã°Å¸â€Â getOtherParticipant - conversation:", conversation);
    
    // For self-chats or single participant convos - return first participant
    if (conversation.participants && Array.isArray(conversation.participants) && conversation.participants.length > 0) {
      const fallback = conversation.participants[0];
      console.log("Ã¢Å“â€¦ Using first participant (self-chat):", fallback);
      return fallback;
    }
    
    // First, try to get from partner field (API response format)
    if (conversation.partner) {
      if (conversation.partner._id !== authUser?._id && conversation.partner.email !== authUser?.email) {
        console.log("Ã¢Å“â€¦ Found partner:", conversation.partner);
        return conversation.partner;
      } else {
        console.log("Ã¢Å“â€¦ Partner is self - using:", conversation.partner);
        return conversation.partner;
      }
    }

    console.log("Ã¢ÂÅ’ No participant found for conversation:", conversation._id);
    return undefined;
  }, [authUser?._id, authUser?.email]);

  const getDateHeader = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    } else {
      return date.toLocaleDateString([], { month: 'long', day: 'numeric' });
    }
  }, []);

  const formatTime = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Just now";

    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchConversations(true);
  }, [fetchConversations]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    const setupSocket = async () => {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        connectSocket(token);
      }
    };

    setupSocket();

    const handleNewMessage = async (incomingMessage: SocketMessage) => {
      const senderId = getMessageUserId(incomingMessage.sender);
      const recipientId = getMessageUserId(incomingMessage.recipient);
      const senderEmail = incomingMessage.senderUser?.email || getMessageUserEmail(incomingMessage.sender);
      const recipientEmail = incomingMessage.recipientUser?.email || getMessageUserEmail(incomingMessage.recipient);
      if (senderId === authUser?._id || senderEmail === authUser?.email) {
        fetchConversations(true);
        return;
      }

      const partnerId = senderId === authUser?._id
        ? recipientId
        : senderId;
      const partnerEmail = senderId === authUser?._id
        ? recipientEmail
        : senderEmail;
      const isCurrentChat = Boolean(
        selectedUser &&
        (
          selectedUser.id === partnerId ||
          selectedUser.id === senderId ||
          selectedUser.id === recipientId ||
          selectedUser.email === partnerEmail ||
          selectedUser.email === senderEmail ||
          selectedUser.email === recipientEmail
        )
      );

      if (isCurrentChat) {
        setChatMessages(prev => {
          const alreadyExists = prev.some(item =>
            item._id === incomingMessage._id ||
            (
              item._id.startsWith("temp-") &&
              item.content === incomingMessage.content &&
              getMessageUserId(item.sender) === senderId
            )
          );
          if (alreadyExists) return prev;
          return [incomingMessage, ...prev];
        });
        await markConversationAsRead(partnerId, partnerEmail);
      }

      fetchConversations(true);
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("receiveMessage", handleNewMessage);

    const handleMessagesRead = (data: { readBy?: string }) => {
      setChatMessages(prev => prev.map(item => {
        const isMyMessage =
          getMessageUserId(item.sender) === authUser?._id ||
          getMessageUserEmail(item.sender) === authUser?.email;
        const wasReadByRecipient =
          getMessageUserId(item.recipient) === data.readBy ||
          getMessageUserEmail(item.recipient) === data.readBy;

        return isMyMessage && wasReadByRecipient ? { ...item, read: true, status: "read" } : item;
      }));
    };

    socket.on("messagesRead", handleMessagesRead);

    const retryPendingMessages = async () => {
      if (!selectedUser) return;

      const pendingMessages = chatMessages.filter(item => {
        const isMyMessage =
          getMessageUserId(item.sender) === authUser?._id ||
          getMessageUserEmail(item.sender) === authUser?.email;
        return isMyMessage && isPendingMessage(item);
      });

      for (const pendingMessage of pendingMessages) {
        try {
          const response = await sendSocketMessageAsync(selectedUser.email, pendingMessage.content);
          if (response.ok && response.message) {
            setChatMessages(prev => prev.map(item =>
              item._id === pendingMessage._id
                ? { ...response.message, status: response.message.read ? "read" : "sent" }
                : item
            ));
            fetchConversations(true);
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
  }, [authUser?._id, authUser?.email, selectedUser, chatMessages, fetchConversations, markConversationAsRead]);

  useEffect(() => {
    if (!conversations.length) return;

    const filtered = conversations.filter((conv) => {
      const otherParticipant = getOtherParticipant(conv);
      const name = (otherParticipant?.name || otherParticipant?.username || otherParticipant?.email || "").toLowerCase();
      const email = otherParticipant?.email?.toLowerCase() || "";
      const searchLower = search.toLowerCase();

      return name.includes(searchLower) || email.includes(searchLower);
    });
    setFilteredConversations(filtered);
  }, [search, conversations, getOtherParticipant]);

  const keyExtractor = useCallback((item: Conversation) => {
    return getConversationKey(item) || `conv-${Math.random()}`;
  }, []);

  const renderItem = useCallback(({ item }: { item: Conversation }) => {
    const otherUser = getOtherParticipant(item);
    const unreadCount = item.unreadCount || 0;

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={async () => {
          console.log('Ã°Å¸â€Â¥ CLICKED CHAT:', item._id);
          const recipientEmail = otherUser?.email || (item.participants && item.participants[0]?.email) || item.partner?.email || '';
          console.log('Ã°Å¸â€œÂ§ Using recipientEmail:', recipientEmail);
          
          if (recipientEmail) {
            try {
              console.log('Before API call:', `${ENDPOINTS.CHAT.MESSAGES}/${recipientEmail}`);
              const token = await AsyncStorage.getItem("token");
              console.log('Token:', token ? 'Present' : 'Missing');
              const responseData = await API.get(`${ENDPOINTS.CHAT.MESSAGES}/${recipientEmail}`, undefined, token ?? undefined);
              console.log('Ã¢Å“â€¦ API response data:', responseData);
              console.log('responseData type:', typeof responseData, 'Array?', Array.isArray(responseData));
              
              setChatMessages((responseData || []).reverse());
              console.log('Ã¢Å“â€¦ setChatMessages called with', (responseData || []).length, 'messages');
              
              if (Array.isArray(responseData)) {
                console.log('Ã°Å¸â€œÂ± MESSAGES:', responseData.map((msg, i) => ({
                  i, content: msg.content, sender: msg.sender, recipient: msg.recipient
                })));
              }
              
            const displayName = otherUser?.name || otherUser?.username || "Chat";
              const userData = {
                id: otherUser?._id || recipientEmail,
                name: displayName,
                email: recipientEmail
              };
              setSelectedUser(userData);
              markConversationAsRead(userData.id, userData.email);
              if (!isTabletOrWeb) {
                setMobileChatVisible(true);
              }
            } catch (error) {
              console.error('Ã¢ÂÅ’ Message fetch error:', error);
              Alert.alert('Error', 'Failed to load messages');
            }
          } else {
            console.error('Ã¢ÂÅ’ No recipient email found');
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {otherUser?.name?.charAt(0).toUpperCase() ||
              otherUser?.username?.charAt(0).toUpperCase() ||
              otherUser?.email?.charAt(0).toUpperCase() || "?"}
          </Text>
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {otherUser?.username?.includes("(You)") ? "(You)" : (otherUser?.name || otherUser?.username || "Chat")}
            </Text>
            <View style={styles.chatMeta}>
              <Text style={[styles.time, unreadCount > 0 && styles.unreadTime]} numberOfLines={1}>
                {item.lastMessage
                  ? formatTime(item.lastMessage.createdAt || item.updatedAt)
                  : formatTime(item.updatedAt)}
              </Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {item.lastMessage ? (
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage.sender === authUser?.email ? "You: " : ""}
              {item.lastMessage.text || item.lastMessage.content}
            </Text>
          ) : (
            <Text style={styles.lastMessage}>No messages yet</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
      </TouchableOpacity>
    );
  }, [getOtherParticipant, formatTime, authUser?.email, isTabletOrWeb, markConversationAsRead]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  // Ã¢Å“â€¦ Mobile Header Component
  const renderMobileHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>JyoChat</Text>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => setMobileMenuVisible(true)}
      >
        <Ionicons name="ellipsis-vertical" size={24} color="#0F172A" />
      </TouchableOpacity>
    </View>
  );

  // Ã¢Å“â€¦ Mobile Menu Modal
  const renderMobileMenu = () => (
    <>
      <TouchableOpacity
        style={styles.menuBackdrop}
        activeOpacity={1}
        onPress={() => setMobileMenuVisible(false)}
      />
      <View style={styles.mobileMenu}>
        <View style={styles.mobileMenuHeader}>
          <Text style={styles.mobileMenuTitle}>Menu</Text>
          <TouchableOpacity onPress={() => setMobileMenuVisible(false)}>
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
        <View style={styles.mobileMenuItems}>
          <TouchableOpacity
            style={styles.mobileMenuItem}
            onPress={() => handleMobileMenuItemPress('profile')}
          >
            <Ionicons name="person-circle-outline" size={24} color="#4F46E5" />
            <Text style={styles.mobileMenuItemText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mobileMenuItem}
            onPress={() => handleMobileMenuItemPress('newChat')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#4F46E5" />
            <Text style={styles.mobileMenuItemText}>New Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mobileMenuItem}
            onPress={() => handleMobileMenuItemPress('contacts')}
          >
            <Ionicons name="people-outline" size={24} color="#64748B" />
            <Text style={styles.mobileMenuItemText}>Contacts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mobileMenuItem}
            onPress={() => handleMobileMenuItemPress('notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color="#64748B" />
            <Text style={styles.mobileMenuItemText}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mobileMenuItem}
            onPress={() => handleMobileMenuItemPress('settings')}
          >
            <Ionicons name="settings-outline" size={24} color="#64748B" />
            <Text style={styles.mobileMenuItemText}>Settings</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity
            style={styles.mobileMenuLogout}
            onPress={() => handleMobileMenuItemPress('logout')}
          >
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
            <Text style={styles.mobileMenuLogoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  // Ã¢Å“â€¦ Mobile Full Screen Chat Modal
  const renderMobileChat = () => (
    <>
      <TouchableOpacity
        style={styles.chatBackdrop}
        activeOpacity={1}
        onPress={handleBackToConversations}
      />
      <View style={styles.mobileChatContainer}>
        <View style={styles.mobileChatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToConversations}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          {selectedUser && (
            <>
              <View style={styles.mobileChatHeaderInfo}>
                <Text style={styles.mobileChatHeaderName}>{selectedUser.name}</Text>
                <Text style={styles.mobileChatHeaderStatus}>Online</Text>
              </View>
              <View style={styles.mobileChatHeaderAvatar}>
                <Text style={styles.mobileChatHeaderAvatarText}>
                  {selectedUser.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.mobileMessagesContainer}>
          {chatMessages.length === 0 ? (
            <View style={styles.noMessages}>
              <Ionicons name="chatbubble-outline" size={64} color="#CBD5E1" />
              <Text style={styles.noMessagesText}>No messages yet</Text>
              <Text style={styles.noMessagesSubtext}>
                Start a conversation with {selectedUser?.name}
              </Text>
            </View>
          ) : (
            <FlatList
              data={chatMessages}
              keyExtractor={(item, index) => `${item._id}-${index}`}
              renderItem={({ item, index }) => {
                const isMyMessage =
                  getMessageUserId(item.sender) === authUser?._id ||
                  getMessageUserEmail(item.sender) === authUser?.email;
                const showDateHeader = index === chatMessages.length - 1 || 
                  getDateHeader(chatMessages[index].createdAt) !== getDateHeader(chatMessages[index + 1]?.createdAt || '');
                
                return (
                  <View>
                    {showDateHeader && (
                      <View style={styles.dateHeaderContainer}>
                        <Text style={styles.dateHeaderText}>
                          {getDateHeader(chatMessages[index].createdAt)}
                        </Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.messageContainer,
                        isMyMessage ? styles.myMessage : styles.otherMessage,
                      ]}
                    >
                      {renderMessageContent(item, isMyMessage)}
                      <View style={[styles.messageFooter, isMyMessage ? styles.myMessageFooter : styles.otherMessageFooter]}>
                        <Text style={isMyMessage ? styles.messageTime : styles.otherMessageTime}>
                          {formatTime(item.createdAt)}
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
                  </View>
                );
              }}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              inverted
            />
          )}
        </View>

        <View style={styles.mobileChatInputContainer}>
          {renderSelectedMediaPreview()}
          <View style={styles.inputRow}>
          <View style={styles.mobileInputShell}>
            <TextInput
              style={styles.mobileChatInput}
            placeholder="Type a message..."
            placeholderTextColor="#94A3B8"
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
            blurOnSubmit={false}
            />
            <TouchableOpacity
              style={styles.mediaPickerButton}
              onPress={handlePickAndUploadMedia}
              disabled={isUploadingMedia}
            >
              {isUploadingMedia ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : (
                <Ionicons name="image-outline" size={21} color="#4F46E5" />
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.mobileSendButton, !message.trim() && selectedMediaFiles.length === 0 && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={(!message.trim() && selectedMediaFiles.length === 0) || isUploadingMedia}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );

  const backgroundStyles = [styles.backgroundBase];
  return (

    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, isTabletOrWeb && styles.containerLarge]}>
        <View style={backgroundStyles} pointerEvents="none">
          <Animated.View
            style={[
              styles.backgroundBand,
              styles.backgroundBandPrimary,
              {
                opacity: isTabletOrWeb ? 0.32 : 0.5,
                transform: [
                  { translateX: backgroundDrift.interpolate({ inputRange: [0, 1], outputRange: [-42, 34] }) },
                  { rotate: "-16deg" },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.backgroundBand,
              styles.backgroundBandSecondary,
              {
                opacity: isTabletOrWeb ? 0.28 : 0.42,
                transform: [
                  { translateX: backgroundDrift.interpolate({ inputRange: [0, 1], outputRange: [38, -28] }) },
                  { rotate: "18deg" },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.backgroundGlow,
              {
                opacity: backgroundPulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.36] }),
                transform: [
                  {
                    scale: backgroundPulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.08] }),
                  },
                ],
              },
            ]}
          />
        </View>
        {isTabletOrWeb ? (
        <>
          <View style={styles.sidebar}>

            <View style={styles.sidebarIconsGroup}>
              <TouchableOpacity style={styles.profileIcon}>
                <Ionicons name="person-circle-outline" size={36} color="#4F46E5" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sidebarIconBtn}
                onPress={() => setUsersModalVisible(true)}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={28} color="#4F46E5" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.sidebarIconBtn}>
                <Ionicons name="people-outline" size={28} color="#64748B" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.sidebarIconBtn}>
                <Ionicons name="notifications-outline" size={28} color="#64748B" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.sidebarIconBtn}>
                <Ionicons name="settings-outline" size={28} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.sidebarBottom}>
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={() => setLogoutVisible(true)}
              >
                <Ionicons name="log-out-outline" size={28} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.mainContent}>
            <View style={styles.header}>
              <Text style={styles.title}>JyoChat</Text>
            </View>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" />
              <TextInput
                placeholder="Search chats..."
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
                placeholderTextColor="#94A3B8"
              />
            </View>
            {filteredConversations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No conversations</Text>
                <Text style={styles.emptySubtext}>Start chatting!</Text>
              </View>
            ) : (
              <FlatList
                data={filteredConversations}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={["#4F46E5"]}
                    tintColor="#4F46E5"
                  />
                }
              />
            )}
          </View>

          <View style={styles.rightPanel}>
            {selectedUser ? (
              <View style={styles.chatPreviewContainer}>
                <View style={styles.chatHeader}>
                  <View style={styles.chatHeaderAvatar}>
                    <Text style={styles.chatHeaderAvatarText}>
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.chatHeaderInfo}>
                    <Text style={styles.chatHeaderName}>{selectedUser.name}</Text>
                    <Text style={styles.chatHeaderStatus}>Online</Text>
                  </View>
                </View>
                <View style={styles.chatMessagesContainer}>
                  {chatMessages.length === 0 ? (
                    <View style={styles.noMessages}>
                      <Ionicons name="chatbubble-outline" size={64} color="#CBD5E1" />
                      <Text style={styles.noMessagesText}>No messages yet</Text>
                      <Text style={styles.noMessagesSubtext}>
                        Start a conversation with {selectedUser.name}
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={chatMessages}
                      keyExtractor={(item, index) => `${item._id}-${index}`}
                      renderItem={({ item, index }) => {
                        const isMyMessage =
                          getMessageUserId(item.sender) === authUser?._id ||
                          getMessageUserEmail(item.sender) === authUser?.email;
                        const showDateHeader = index === chatMessages.length - 1 || 
                          getDateHeader(chatMessages[index].createdAt) !== getDateHeader(chatMessages[index + 1]?.createdAt || '');
                        
                        return (
                          <View>
                            {showDateHeader && (
                              <View style={styles.dateHeaderContainer}>
                                <Text style={styles.dateHeaderText}>
                                  {getDateHeader(chatMessages[index].createdAt)}
                                </Text>
                              </View>
                            )}
                            <View
                              style={[
                                styles.chatMessageContainer,
                                isMyMessage ? styles.chatMyMessage : styles.chatOtherMessage,
                              ]}
                            >
                              {renderMessageContent(item, isMyMessage, true)}
                              <View style={[styles.messageFooter, isMyMessage ? styles.myMessageFooter : styles.otherMessageFooter]}>
                                <Text style={isMyMessage ? styles.chatMessageTime : styles.chatOtherMessageTime}>
                                  {formatTime(item.createdAt)}
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
                          </View>
                        );
                      }}
                      contentContainerStyle={styles.chatMessagesList}
                      showsVerticalScrollIndicator={false}
                      inverted
                    />
                  )}
                </View>
                <View style={styles.chatInputContainer}>
                  {renderSelectedMediaPreview()}
                  <View style={styles.inputRow}>
                  <View style={styles.inputShell}>
                    <TextInput
                      style={styles.chatInput}
                    placeholder="Type a message..."
                    placeholderTextColor="#94A3B8"
                    value={message}
                    onChangeText={setMessage}
                    onSubmitEditing={handleSendMessage}
                    returnKeyType="send"
                    blurOnSubmit={false}
                    />
                    <TouchableOpacity
                      style={styles.mediaPickerButton}
                      onPress={handlePickAndUploadMedia}
                      disabled={isUploadingMedia}
                    >
                      {isUploadingMedia ? (
                        <ActivityIndicator size="small" color="#4F46E5" />
                      ) : (
                        <Ionicons name="image-outline" size={21} color="#4F46E5" />
                      )}
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={[styles.sendButton, !message.trim() && selectedMediaFiles.length === 0 && styles.sendButtonDisabled]}
                    onPress={handleSendMessage}
                    disabled={(!message.trim() && selectedMediaFiles.length === 0) || isUploadingMedia}
                  >
                    <Ionicons name="send" size={20} color="#fff" />
                  </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.placeholderContent}>
                <Ionicons name="chatbubbles-outline" size={80} color="#CBD5E1" />
                <Text style={styles.placeholderTitle}>Welcome to JyoChat</Text>
                <Text style={styles.placeholderSubtitle}>
                  Select a conversation to start chatting
                </Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <>
          {renderMobileHeader()}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              placeholder="Search chats..."
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              placeholderTextColor="#94A3B8"
            />
          </View>
          {filteredConversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>Start chatting with someone!</Text>
            </View>
          ) : (
            <FlatList
              data={filteredConversations}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={["#4F46E5"]}
                  tintColor="#4F46E5"
                />
              }
            />
          )}
        </>
      )}

      <AllUserModal
        visible={usersModalVisible}
        onClose={() => setUsersModalVisible(false)}
        onUserSelect={handleUserSelect}
      />

      {mobileMenuVisible && !isTabletOrWeb && renderMobileMenu()}

      {mobileChatVisible && !isTabletOrWeb && selectedUser && renderMobileChat()}

      <LogoutPopup
        visible={logoutVisible}
        onClose={() => setLogoutVisible(false)}
      />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  containerLarge: {
    flexDirection: "row",
    paddingHorizontal: 0,
  },

  backgroundBase: {

    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F8FAFC",
  },
  backgroundBand: {
    position: "absolute",
    width: "130%",
    height: 190,
    borderRadius: 42,
  },
  backgroundBandPrimary: {
    top: 44,
    left: "-16%",
    backgroundColor: "#CFFAFE",
  },
  backgroundBandSecondary: {
    bottom: 78,
    right: "-18%",
    backgroundColor: "#FED7AA",
  },
  backgroundGlow: {
    position: "absolute",
    top: "26%",
    right: "-18%",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#A7F3D0",
  },

  sidebar: {

    width: 80,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    justifyContent: "space-between",
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },
  sidebarIconsGroup: {
    paddingTop: 20,
    gap: 8,
    alignItems: "center",
  },
  sidebarBottom: {
    paddingBottom: 20,
  },
  profileIcon: {
    padding: 8,
  },
  sidebarIconBtn: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutBtn: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  mainContent: {
    flex: 0.3,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  rightPanel: {
    flex: 0.7,
    backgroundColor: "#fff",
  },

  chatPreviewContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  chatHeaderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  chatHeaderAvatarText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 18,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  chatHeaderStatus: {
    fontSize: 14,
    color: "#22C55E",
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  noMessages: {
    alignItems: "center",
  },
  noMessagesText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 16,
    marginBottom: 8,
  },
  noMessagesSubtext: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
  },
  chatInputContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputShell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 24,
    marginRight: 12,
    paddingLeft: 20,
    paddingRight: 8,
  },
  chatInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1E293B",
  },
  mediaPickerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },

  // Message styles for chat preview and mobile chat
  chatMessagesContainer: {
    paddingHorizontal: 12,
    flex: 1,
  },
  chatMessagesList: {
    paddingBottom: 80,
  },
  chatMessageContainer: {
    maxWidth: '75%',
    marginBottom: 6,
  },
  chatMyMessage: {
    alignSelf: 'flex-end',
  },
  chatOtherMessage: {
    alignSelf: 'flex-start',
  },
  chatMyMessageText: {
    backgroundColor: '#4F46E5',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 2,
  },
  chatOtherMessageText: {
    backgroundColor: '#E5E7EB',
    color: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 2,
  },
  chatMessageTime: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'right',
  },
  chatOtherMessageTime: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'left',
  },
  attachmentMessageBody: {
    gap: 6,
  },
  attachmentImage: {
    width: 220,
    height: 160,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
  },
  chatAttachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: 240,
  },
  myAttachmentChip: {
    backgroundColor: "#4F46E5",
  },
  otherAttachmentChip: {
    backgroundColor: "#E5E7EB",
  },
  myAttachmentText: {
    color: "#fff",
    fontSize: 13,
    flexShrink: 1,
  },
  otherAttachmentText: {
    color: "#1E293B",
    fontSize: 13,
    flexShrink: 1,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  myMessageFooter: {
    justifyContent: "flex-end",
  },
  otherMessageFooter: {
    justifyContent: "flex-start",
  },
  messagesList: {
    paddingBottom: 80,
  },
  messageContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "75%",
    marginBottom: 6,
  },
  myMessage: {
    alignSelf: "flex-end",
  },
  otherMessage: {
    alignSelf: "flex-start",
  },
  myMessageText: {
    backgroundColor: "#4F46E5",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 2,
  },
  otherMessageText: {
    backgroundColor: "#E5E7EB",
    color: "#1E293B",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 2,
  },
  messageTime: {
    fontSize: 10,
    color: "#94A3B8",
    textAlign: "right",
  },
  otherMessageTime: {
    fontSize: 10,
    color: "#94A3B8",
    textAlign: "left",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  headerButton: {
    padding: 8,
    borderRadius: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 20,
    height: 52,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    marginLeft: 12,
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
  },

  listContainer: {
    paddingBottom: 100,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    position: "relative",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 20,
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 3,
    borderColor: "#fff",
  },
  chatInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
    flexShrink: 1,
  },
  chatMeta: {
    alignItems: "flex-end",
    marginLeft: 8,
    minWidth: 52,
  },
  unreadTime: {
    color: "#22C55E",
    fontWeight: "700",
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginTop: 6,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  lastMessage: {
    fontSize: 14,
    color: "#64748B",
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
  },
  placeholderContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderSubtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
  },

  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  mobileMenu: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 280,
    height: '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
  },
  mobileMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mobileMenuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  mobileMenuItems: {
    flex: 1,
    paddingTop: 8,
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  mobileMenuItemText: {
    fontSize: 16,
    color: '#1E293B',
    flex: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 20,
  },
  mobileMenuLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  mobileMenuLogoutText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
  },

  chatBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 2000,
  },
  mobileChatContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    zIndex: 2001,
  },
  mobileChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#4F46E5',
    elevation: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  mobileChatHeaderInfo: {
    flex: 1,
  },
  mobileChatHeaderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  mobileChatHeaderStatus: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  mobileChatHeaderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileChatHeaderAvatarText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  mobileMessagesContainer: {
    flex: 1,
  },
  mobileChatInputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  selectedMediaStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  selectedMediaItem: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    position: 'relative',
    overflow: 'visible',
  },
  selectedMediaImage: {
    width: 62,
    height: 62,
    borderRadius: 12,
  },
  selectedMediaFile: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMediaButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileInputShell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    marginRight: 12,
    paddingLeft: 20,
    paddingRight: 8,
  },
  mobileChatInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
    maxHeight: 100,
  },
  mobileSendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 12,
    marginHorizontal: 24,
  },
  dateHeaderText: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: '#64748B',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: '600',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
});





