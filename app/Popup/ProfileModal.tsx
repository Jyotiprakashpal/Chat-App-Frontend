import { Ionicons } from "@expo/vector-icons";
import React, { useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { AuthContext } from "../context/Authcontext";
import API from "../services/api/method";
import { uploadMedia } from "../services/api/uploadMedia";
import { pickImageFiles } from "../services/pickMedia";
import { ENDPOINTS } from "../services/api/endpoints";

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const { user, updateUser } = useContext(AuthContext);
  const [isUploading, setIsUploading] = useState(false);

  const handlePickImage = async () => {
    if (isUploading) return;

    try {
      const files = await pickImageFiles({ allowsMultipleSelection: false });
      if (!files || files.length === 0) return;

      setIsUploading(true);

      const uploadedFiles = await uploadMedia(files);
      if (!uploadedFiles || uploadedFiles.length === 0) {
        throw new Error("Upload failed");
      }

      const { publicId, url } = uploadedFiles[0];

      const updatedUser = await API.put(ENDPOINTS.USER.UPDATE_PROFILE, {
        publicId,
        url,
      });

      updateUser(updatedUser);
      Alert.alert("Success", "Profile image updated!");
    } catch (error: any) {
      Alert.alert("Upload Error", error.message || "Could not update profile image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!user?.profileImage) return;

    Alert.alert("Delete Image", "Are you sure you want to remove your profile image?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            const updatedUser = await API.delete(ENDPOINTS.USER.DELETE_PROFILE);
            updateUser(updatedUser);
            Alert.alert("Success", "Profile image removed.");
            onClose();
          } catch (error: any) {
            Alert.alert("Error", error.message || "Could not remove profile image.");
          }
        }}
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileSection}>
            <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage} disabled={isUploading}>
              {user?.profileImage?.url ? (
                <Image source={{ uri: user.profileImage.url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={40} color="#4F46E5" />
                </View>
              )}
              <View style={styles.cameraIconContainer}>
                {isUploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="camera" size={18} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            <Text style={styles.name}>{user?.name || "User"}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>

          {user?.profileImage?.url && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteImage}>
              <Text style={styles.deleteButtonText}>Remove Photo</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
    textAlign: 'center',
    marginLeft: 32, // to balance close button
  },
  closeButton: {
    padding: 4,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4F46E5',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: "#64748B",
  },
  deleteButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 15,
  },
});