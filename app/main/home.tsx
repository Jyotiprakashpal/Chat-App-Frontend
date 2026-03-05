import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { AuthContext } from "../context/Authcontext";
import { ENDPOINTS } from "../services/api/endpoints";
import API from "../services/api/method";

interface User {
  _id: string;
  name?: string;
  username?: string;
  email: string;
}

interface CurrentUser {
  _id: string;
  name: string;
  email: string;
  status?: string;
}

interface Conversation {
  _id: string;
  participants: User[];
  lastMessage: {
    text: string;
    sender: string;
    createdAt: string;
  };
  updatedAt: string;
}

export default function Home() {
  const router = useRouter();
  const { logout, user: authUser } = useContext(AuthContext);
  const { width } = useWindowDimensions();

  const isTabletOrWeb = width >= 768;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [profileMenuVisible, setProfileMenuVisible] = useState<boolean>(false);
  const [usersModalVisible, setUsersModalVisible] = useState<boolean>(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

  useEffect(() => {
    fetchCurrentUser();
    fetchConversations();
  }, []);

  useEffect(() => {
    const filtered = conversations.filter((conv) => {
      const otherParticipant = conv.participants.find(
        (p) => p.email !== authUser?.email
      );
      // Handle both name and username fields
      const name = otherParticipant?.name?.toLowerCase() || otherParticipant?.username?.toLowerCase() || "";
      const email = otherParticipant?.email?.toLowerCase() || "";
      const searchLower = search.toLowerCase();
      
      return name.includes(searchLower) || email.includes(searchLower);
    });
    setFilteredConversations(filtered);
  }, [search, conversations, authUser?.email]);

  const fetchCurrentUser = async () => {
    try {
      const userData = await API.get("/auth/me");
      setCurrentUser(userData);
    } catch (error) {
      console.log("Error fetching current user:", error);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await API.get("/messages/conversations");
      setConversations(res.data || res || []);
      setFilteredConversations(res.data || res || []);
    } catch (error) {
      console.log("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setProfileMenuVisible(false);
    await logout();
    router.replace("/auth");
  };

  const fetchAllUsers = async () => {
    try {
      setLoadingUsers(true);
      console.log("Fetching users...");
      const res = await API.get(ENDPOINTS.USER.GET_USERS);
      console.log("Users response:", res);
      
      // Handle different response formats
      let usersList = [];
      if (Array.isArray(res)) {
        usersList = res;
      } else if (res && Array.isArray(res.data)) {
        usersList = res.data;
      } else if (res && Array.isArray(res.users)) {
        usersList = res.users;
      }
      
      console.log("Users list before filter:", usersList);
      
      // Normalize users: map username to name if name is not present
      const normalizedUsers = usersList.map((user: User) => ({
        ...user,
        name: user.name || user.username || "",
      }));
      
      // Filter out current user from the list
      const filteredUsers = normalizedUsers.filter(
        (user: User) => user.email !== authUser?.email
      );
      console.log("Filtered users:", filteredUsers);
      setAllUsers(filteredUsers);
    } catch (error) {
      console.log("Error fetching users:", error);
      setAllUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleNewChat = async () => {
    await fetchAllUsers();
    setUsersModalVisible(true);
  };

  const handleUserSelect = (user: User) => {
    setUsersModalVisible(false);
    router.push({
      pathname: "/main/chat/[id]",
      params: { id: user._id || user.email },
    });
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(
      (p) => p.email !== authUser?.email
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
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
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const otherUser = getOtherParticipant(item);
    
    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() =>
          router.push({
            pathname: "/main/chat/[id]",
            params: { id: otherUser?._id || otherUser?.email },
          })
        }
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {otherUser?.name?.charAt(0).toUpperCase() || "?"}
          </Text>
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{otherUser?.name || "Unknown"}</Text>
            {item.lastMessage && (
              <Text style={styles.time}>
                {formatTime(item.lastMessage.createdAt || item.updatedAt)}
              </Text>
            )}
          </View>
          {item.lastMessage ? (
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage.sender === authUser?.email ? "You: " : ""}
              {item.lastMessage.text}
            </Text>
          ) : (
            <Text style={styles.lastMessage}>No messages yet</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        isTabletOrWeb && styles.containerLarge,
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.hamburgerButton}
          onPress={() => setProfileMenuVisible(true)}
        >
          <Ionicons name="menu-outline" size={28} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Chats</Text>
        <TouchableOpacity 
          style={styles.newChatButton}
          onPress={handleNewChat}
        >
          <Ionicons name="add" size={28} color="#4F46E5" />
        </TouchableOpacity>
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
          <Ionicons name="chatbubbles-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>Start chatting with someone!</Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item._id || item.participants[0]?._id || String(Math.random()) || ""}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={profileMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setProfileMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setProfileMenuVisible(false)}
        >
          <View style={styles.profileMenu}>
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>
                  {currentUser?.name?.charAt(0).toUpperCase() || "U"}
                </Text>
              </View>
              <Text style={styles.profileName}>
                {currentUser?.name}
              </Text>
              <Text style={styles.profileEmail}>
                {currentUser?.email}
              </Text>
              {currentUser?.status && (
                <Text style={styles.profileStatus}>
                  {currentUser.status}
                </Text>
              )}
            </View>

            <View style={styles.menuItems}>
              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="person-outline" size={22} color="#1E293B" />
                <Text style={styles.menuItemText}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="settings-outline" size={22} color="#1E293B" />
                <Text style={styles.menuItemText}>Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                <Text style={[styles.menuItemText, styles.logoutText]}>
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={usersModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setUsersModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.usersModalOverlay}
          activeOpacity={1}
          onPress={() => setUsersModalVisible(false)}
        >
          <View style={styles.usersModalContent}>
            <View style={styles.usersModalHeader}>
              <Text style={styles.usersModalTitle}>New Chat</Text>
              <TouchableOpacity onPress={() => setUsersModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>

            {loadingUsers ? (
              <View style={styles.usersLoader}>
                <ActivityIndicator size="small" color="#4F46E5" />
              </View>
            ) : allUsers.length === 0 ? (
              <View style={styles.noUsersContainer}>
                <Text style={styles.noUsersText}>No users found</Text>
              </View>
            ) : (
              <FlatList
                data={allUsers}
                keyExtractor={(item) => item._id || item.email}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.userItem}
                    onPress={() => handleUserSelect(item)}
                  >
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {item.name?.charAt(0).toUpperCase() || "?"}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.name || "Unknown"}</Text>
                      <Text style={styles.userEmail}>{item.email}</Text>
                    </View>
                    <Ionicons name="chatbubble-outline" size={20} color="#4F46E5" />
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  containerLarge: {
    alignSelf: "center",
    width: 700,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  hamburgerButton: {
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E293B",
  },
  placeholder: {
    width: 36,
  },
  newChatButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
    height: 45,
    elevation: 2,
  },
  searchInput: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 12,
    elevation: 2,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    position: "relative",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  onlineDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#fff",
  },
  chatInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1E293B",
  },
  time: {
    fontSize: 12,
    color: "#94A3B8",
  },
  lastMessage: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 3,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 50,
    paddingRight: 16,
  },
  profileMenu: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: 280,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  profileHeader: {
    backgroundColor: "#4F46E5",
    padding: 20,
    alignItems: "center",
  },
  profileAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  profileAvatarText: {
    color: "#4F46E5",
    fontWeight: "bold",
    fontSize: 28,
  },
  profileName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  profileEmail: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
  },
  profileStatus: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    marginTop: 4,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  menuItems: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuItemText: {
    marginLeft: 16,
    fontSize: 16,
    color: "#1E293B",
  },
  logoutText: {
    color: "#EF4444",
  },
  usersModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  usersModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 20,
  },
  usersModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  usersModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E293B",
  },
  usersLoader: {
    padding: 40,
    alignItems: "center",
  },
  noUsersContainer: {
    padding: 40,
    alignItems: "center",
  },
  noUsersText: {
    fontSize: 16,
    color: "#64748B",
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  userAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userAvatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  userEmail: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
});
