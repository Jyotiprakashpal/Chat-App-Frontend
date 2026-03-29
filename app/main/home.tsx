import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

export default function Home() {
  const router = useRouter();
  const { logout, user: authUser } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const isTabletOrWeb = width >= 768;

  // States
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState("");
  const [usersModalVisible, setUsersModalVisible] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [logoutVisible, setLogoutVisible] = useState(false);

  // ✅ Logout popup state
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [mobileChatVisible, setMobileChatVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatFlatListRef, setChatFlatListRef] = useState(null);


  // ✅ Mobile menu state + Mobile chat modal state
  // ✅ Message input state
  const [message, setMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // ✅ Fetch conversations using ENDPOINTS
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

  // ✅ Handle mobile menu item press
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

  // ✅ Handle user selection - Different behavior for mobile/desktop
  const fetchChatMessages = useCallback(async (recipientEmail: string) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await API.get(`${ENDPOINTS.CHAT.MESSAGES}/${recipientEmail}`, undefined, token ?? undefined);
      setChatMessages(response.data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setChatMessages([]);
    }
  }, []);

  const handleUserSelect = useCallback(async (user: SelectedUser) => {
    await fetchChatMessages(user.email);
    setSelectedUser(user);
    if (!isTabletOrWeb) {
      setMobileChatVisible(true);
    }
  }, [isTabletOrWeb, fetchChatMessages]);

  // ✅ Close mobile chat and go back to conversations
  const handleBackToConversations = useCallback(() => {
    setMobileChatVisible(false);
    setSelectedUser(null);
    setMessage("");
  }, []);

  // ✅ Handle sending message using ENDPOINTS
  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || !selectedUser) {
      Alert.alert("Error", "Please select a user and enter a message");
      return;
    }

    try {
      setSendingMessage(true);
      await API.post(ENDPOINTS.CHAT.MESSAGES, {
        recipient: selectedUser.email,
        content: message.trim()
      });

      // Clear message after sending
      setMessage("");

      // Add new message to local chat state immediately
      const newMessage: Message = {
        _id: Date.now().toString(),
        sender: authUser?._id || '',
        recipient: selectedUser!.email,
        content: message.trim(),
        createdAt: new Date().toISOString(),
        read: false,
        updatedAt: new Date().toISOString(),
      };
      setChatMessages(prev => [newMessage, ...prev]);
      
      // Refresh conversations list
      fetchConversations(true);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  }, [message, selectedUser, fetchConversations]);



  const getOtherParticipant = useCallback((conversation: Conversation): User | undefined => {
    console.log("🔍 getOtherParticipant - conversation:", conversation);
    
    // For self-chats or single participant convos - return first participant
    if (conversation.participants && Array.isArray(conversation.participants) && conversation.participants.length > 0) {
      const fallback = conversation.participants[0];
      console.log("✅ Using first participant (self-chat):", fallback);
      return fallback;
    }
    
    // First, try to get from partner field (API response format)
    if (conversation.partner) {
      if (conversation.partner._id !== authUser?._id && conversation.partner.email !== authUser?.email) {
        console.log("✅ Found partner:", conversation.partner);
        return conversation.partner;
      } else {
        console.log("✅ Partner is self - using:", conversation.partner);
        return conversation.partner;
      }
    }

    console.log("❌ No participant found for conversation:", conversation._id);
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
    return item._id || item.partnerId || item.participants?.[0]?._id || `conv-${Math.random()}`;
  }, []);

  const renderItem = useCallback(({ item }: { item: Conversation }) => {
    const otherUser = getOtherParticipant(item);

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={async () => {
          console.log('🔥 CLICKED CHAT:', item._id);
          const recipientEmail = otherUser?.email || (item.participants && item.participants[0]?.email) || item.partner?.email || '';
          console.log('📧 Using recipientEmail:', recipientEmail);
          
          if (recipientEmail) {
            try {
              console.log('Before API call:', `${ENDPOINTS.CHAT.MESSAGES}/${recipientEmail}`);
              const token = await AsyncStorage.getItem("token");
              console.log('Token:', token ? 'Present' : 'Missing');
              const responseData = await API.get(`${ENDPOINTS.CHAT.MESSAGES}/${recipientEmail}`, undefined, token ?? undefined);
              console.log('✅ API response data:', responseData);
              console.log('responseData type:', typeof responseData, 'Array?', Array.isArray(responseData));
              
              setChatMessages((responseData || []).reverse());
              console.log('✅ setChatMessages called with', (responseData || []).length, 'messages');
              
              if (Array.isArray(responseData)) {
                console.log('📱 MESSAGES:', responseData.map((msg, i) => ({
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
              if (!isTabletOrWeb) {
                setMobileChatVisible(true);
              }
            } catch (error) {
              console.error('❌ Message fetch error:', error);
              Alert.alert('Error', 'Failed to load messages');
            }
          } else {
            console.error('❌ No recipient email found');
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
            <Text style={styles.time} numberOfLines={1}>
              {item.lastMessage
                ? formatTime(item.lastMessage.createdAt || item.updatedAt)
                : formatTime(item.updatedAt)}
            </Text>
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
  }, [getOtherParticipant, formatTime, authUser?.email, isTabletOrWeb]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  // ✅ Mobile Header Component
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

  // ✅ Mobile Menu Modal
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

  // ✅ Mobile Full Screen Chat Modal
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
                const isMyMessage = item.sender === authUser?._id;
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
                      <Text style={isMyMessage ? styles.myMessageText : styles.otherMessageText}>
                        {item.content}
                      </Text>
                      <Text style={isMyMessage ? styles.messageTime : styles.otherMessageTime}>
                        {formatTime(item.createdAt)}
                      </Text>
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
            style={[styles.mobileSendButton, sendingMessage && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={sendingMessage}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, isTabletOrWeb && styles.containerLarge]}>
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
                        const isMyMessage = item.sender === authUser?._id;
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
                              <Text style={isMyMessage ? styles.chatMyMessageText : styles.chatOtherMessageText}>
                                {item.content}
                              </Text>
                              <Text style={isMyMessage ? styles.chatMessageTime : styles.chatOtherMessageTime}>
                                {formatTime(item.createdAt)}
                              </Text>
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
                    style={[styles.sendButton, sendingMessage && styles.sendButtonDisabled]}
                    onPress={handleSendMessage}
                    disabled={sendingMessage}
                  >
                    <Ionicons name="send" size={20} color="#fff" />
                  </TouchableOpacity>
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
  },
  containerLarge: {
    flexDirection: "row",
    paddingHorizontal: 0,
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1E293B",
    marginRight: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  mobileChatInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
    marginRight: 12,
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
