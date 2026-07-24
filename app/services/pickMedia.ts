import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

export type PickedMediaFile = {
  uri: string;
  name?: string;
  type?: string;
};

const extensionFromMimeType = (mimeType?: string, fallback = "bin") => {
  if (!mimeType) return fallback;

  const [, subtype] = mimeType.split("/");
  if (!subtype) return fallback;

  return subtype.replace("quicktime", "mov").replace("x-matroska", "mkv");
};

const ensureFileExtension = (name: string, mimeType?: string, fallback = "bin") => {
  if (/\.[a-z0-9]+$/i.test(name)) return name;

  return `${name}.${extensionFromMimeType(mimeType, fallback)}`;
};

export const pickImageFiles = async (): Promise<PickedMediaFile[] | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Media library permission is required to upload media");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images", "videos"],
    allowsMultipleSelection: true,
    quality: 0.9,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return result.assets.map((asset, index) => {
    const isVideo = asset.type === "video";
    const type = asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg");
    const fallbackName = `${isVideo ? "video" : "image"}-${Date.now()}-${index}`;

    return {
      uri: asset.uri,
      name: ensureFileExtension(asset.fileName || fallbackName, type, isVideo ? "mp4" : "jpg"),
      type,
    };
  });
};

export const pickDocumentFiles = async (): Promise<PickedMediaFile[] | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: true,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return result.assets.map((asset, index) => ({
    uri: asset.uri,
    name: asset.name || `document-${Date.now()}-${index}`,
    type: asset.mimeType || "application/octet-stream",
  }));
};

