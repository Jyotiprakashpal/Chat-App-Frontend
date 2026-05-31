import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Alert, AlertButton, Linking, Platform } from "react-native";
import { ENDPOINTS } from "./api/endpoints";
import API from "./api/method";

type AppVersionInfo = {
  latestVersion: string;
  minimumVersion?: string;
  updateTitle?: string;
  updateMessage?: string;
  updateUrl?: string;
  forceUpdate?: boolean;
  updatedAt?: string;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const compareVersions = (current: string, latest: string) => {
  const currentParts = current.split(".").map(Number);
  const latestParts = latest.split(".").map(Number);
  const maxLength = Math.max(currentParts.length, latestParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const currentPart = currentParts[index] || 0;
    const latestPart = latestParts[index] || 0;
    if (currentPart < latestPart) return -1;
    if (currentPart > latestPart) return 1;
  }

  return 0;
};

export const requestNotificationPermission = async () => {
  if (Platform.OS === "web") return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#4F46E5",
    });
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermission.status;

  if (finalStatus !== "granted") {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  return finalStatus === "granted";
};

export const registerPushToken = async () => {
  if (Platform.OS === "web") return;

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.log("Expo push token skipped: missing EAS projectId");
    return;
  }

  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
  await API.post(ENDPOINTS.AUTH.PUSH_TOKEN, { token: pushToken.data });
};

export const showAppUpdateNotification = async (versionInfo: AppVersionInfo) => {
  const title = versionInfo.updateTitle || "JyoChat update available";
  const body = versionInfo.updateMessage || `Version ${versionInfo.latestVersion} is available.`;
  const androidPackage = Constants.expoConfig?.android?.package;
  const fallbackUpdateUrl = androidPackage
    ? `https://play.google.com/store/apps/details?id=${androidPackage}`
    : "";
  const updateUrl = versionInfo.updateUrl || fallbackUpdateUrl;

  const openUpdateUrl = async () => {
    if (!updateUrl) {
      Alert.alert("Update link missing", "Please configure updateUrl in the app version collection.");
      return;
    }

    await Linking.openURL(updateUrl);
  };

  if (Platform.OS !== "web" && await requestNotificationPermission()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { updateUrl },
      },
      trigger: null,
    });
  }

  const buttons: AlertButton[] = [
    {
      text: "Update",
      onPress: openUpdateUrl,
    },
  ];

  if (!versionInfo.forceUpdate) {
    buttons.push({
      text: "Later",
      style: "cancel",
    });
  }

  Alert.alert(title, body, buttons);
};

export const checkForAppUpdate = async () => {
  const versionInfo: AppVersionInfo = await API.get(ENDPOINTS.APP.VERSION);
  const currentVersion = Constants.expoConfig?.version || "1.0.1";
  const updateAvailable = compareVersions(currentVersion, versionInfo.latestVersion) < 0;

  if (!updateAvailable) return;

  const notificationKey = `app-update-notified-${versionInfo.latestVersion}-${versionInfo.updatedAt || "no-date"}`;
  const alreadyNotified = await AsyncStorage.getItem(notificationKey);

  if (alreadyNotified && !versionInfo.forceUpdate) return;

  await AsyncStorage.setItem(notificationKey, new Date().toISOString());
  await showAppUpdateNotification(versionInfo);
};
