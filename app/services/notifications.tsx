import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Alert, Linking, Platform } from "react-native";
import { ENDPOINTS } from "./api/endpoints";
import API from "./api/method";

type AppVersionInfo = {
  latestVersion: string;
  minimumVersion?: string;
  updateTitle?: string;
  updateMessage?: string;
  updateUrl?: string;
  forceUpdate?: boolean;
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

  const currentPermission = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermission.status;

  if (finalStatus !== "granted") {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  return finalStatus === "granted";
};

export const showAppUpdateNotification = async (versionInfo: AppVersionInfo) => {
  const title = versionInfo.updateTitle || "JyoChat update available";
  const body = versionInfo.updateMessage || `Version ${versionInfo.latestVersion} is available.`;

  if (Platform.OS !== "web" && await requestNotificationPermission()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { updateUrl: versionInfo.updateUrl || "" },
      },
      trigger: null,
    });
  }

  Alert.alert(title, body, [
    ...(versionInfo.updateUrl ? [{
      text: "Update",
      onPress: () => Linking.openURL(versionInfo.updateUrl as string),
    }] : []),
    {
      text: versionInfo.forceUpdate ? "OK" : "Later",
      style: "cancel",
    },
  ]);
};

export const checkForAppUpdate = async () => {
  const versionInfo: AppVersionInfo = await API.get(ENDPOINTS.APP.VERSION);
  const currentVersion = Constants.expoConfig?.version || "1.0.1";
  const updateAvailable = compareVersions(currentVersion, versionInfo.latestVersion) < 0;

  if (!updateAvailable) return;

  const notificationKey = `app-update-notified-${versionInfo.latestVersion}`;
  const alreadyNotified = await AsyncStorage.getItem(notificationKey);

  if (alreadyNotified && !versionInfo.forceUpdate) return;

  await AsyncStorage.setItem(notificationKey, new Date().toISOString());
  await showAppUpdateNotification(versionInfo);
};
