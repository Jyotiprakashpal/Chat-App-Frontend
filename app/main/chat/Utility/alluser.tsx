import { Ionicons } from "@expo/vector-icons";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthContext } from "../../../context/Authcontext";
import { ENDPOINTS } from "../../../services/api/endpoints";
import API from "../../../services/api/method";

interface User {
  _id: string;
  name?: string;
  username?: string;
  email: string;
}

interface SelectedUser {
  id: string;
  name: string;
  email: string;
}

interface AllUserModalProps {
  visible: boolean;
  onClose: () => void;
  onUserSelect: (user: SelectedUser) => void;
}

export default function AllUserModal({ 
  visible, 
  onClose, 
  onUserSelect 
}: AllUserModalProps) {
  const { user: authUser } = useContext(AuthContext);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

  const fetchAllUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await API.get(ENDPOINTS.USER.GET_USERS);
      
      let usersList: User[] = [];
      if (Array.isArray(res)) {
        usersList = res;
      } else if (res && typeof res === 'object' && Array.isArray(res.data)) {
        usersList = res.data;
      } else if (res && typeof res === 'object' && Array.isArray(res.users)) {
        usersList = res.users;
      }
      
      // Normalize users (ensure name is always string)
      const normalizedUsers = usersList.map((user: User) => ({
        ...user,
        name: (user.name || user.username || "").toString(),
      }));
      
      setAllUsers(normalizedUsers);
    } catch (error) {
      setAllUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchAllUsers();
    } else {
      setAllUsers([]);
    }
  }, [visible]);

  const handleUserSelect = (user: User) => {
    onClose();
    
    // ✅ Safe user data creation
    const selectedUser: SelectedUser = {
      id: user._id || user.email,
      name: user.name || user.username || "Unknown User",
      email: user.email
    };
    
    onUserSelect(selectedUser);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.usersModalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.usersModalContent}>
          <View style={styles.usersModalHeader}>
            <Text style={styles.usersModalTitle}>New Chat</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-outline" size={24} color="#1E293B" />
            </TouchableOpacity>
          </View>

          {loadingUsers ? (
            <View style={styles.usersLoader}>
              <ActivityIndicator size="small" color="#4F46E5" />
              <Text style={styles.loadingText}>Loading users...</Text>
            </View>
          ) : allUsers.length === 0 ? (
            <View style={styles.noUsersContainer}>
              {/* <Ionicons name="users-outline" size={48} color="#CBD5E1" /> */}
              <Text style={styles.noUsersText}>No other users found</Text>
              <Text style={styles.noUsersSubtext}>Start by creating conversations</Text>
            </View>
          ) : (
            <FlatList
              data={allUsers}
              keyExtractor={(item, index) => item._id || item.email || index.toString()}
              renderItem={({ item }) => {
                return (
                <TouchableOpacity 
                  style={styles.userItem}
                  onPress={() => handleUserSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {item.name && item.name.charAt(0) ? 
                        item.name.charAt(0).toUpperCase() : "?"}
                    </Text>
                    <View style={styles.userOnlineDot} />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {item.username}
                    </Text>
                    <Text style={styles.userEmail} numberOfLines={1}>
                      {item.email}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.usersList}
            />
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  usersModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  usersModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 30,
  },
  usersModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  usersModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  usersLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748B",
  },
  noUsersContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 50,
  },
  noUsersText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  noUsersSubtext: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  usersList: {
    paddingHorizontal: 0,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    position: "relative",
  },
  userAvatarText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 18,
  },
  userOnlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#fff",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0F172A",
  },
  userEmail: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
});
