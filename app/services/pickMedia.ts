import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

export type PickedMediaFile = {
  uri: string;
  name?: string;
  type?: string;
};

export const pickImageFiles = async (): Promise<PickedMediaFile[] | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Media library permission is required to upload images");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    allowsMultipleSelection: true,
    quality: 0.9,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return result.assets.map((asset, index) => {
    const isVideo = asset.type === "video";

    return {
      uri: asset.uri,
      name: asset.fileName || `${isVideo ? "video" : "image"}-${Date.now()}-${index}.${isVideo ? "mp4" : "jpg"}`,
      type: asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
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

