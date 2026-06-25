import AsyncStorage from "@react-native-async-storage/async-storage";

import { PickedMediaFile } from "../pickMedia";
import { BASE_URL } from "./baseurl";
import { ENDPOINTS } from "./endpoints";

export type UploadedMediaFile = {
  filename?: string;
  url?: string;
  contentType?: string;
  format?: string;
  resourceType?: string;
  publicId?: string;
};

export const uploadMedia = async (files: PickedMediaFile[]): Promise<UploadedMediaFile[]> => {
  const formData = new FormData();

  for (const file of files) {
    const name = file.name || `media-${Date.now()}`;
    const type = file.type || "application/octet-stream";

    if (typeof window !== "undefined" && (file.uri.startsWith("blob:") || file.uri.startsWith("data:"))) {
      const blob = await fetch(file.uri).then((response) => response.blob());
      formData.append("image", blob, name);
    } else {
      formData.append("image", {
        uri: file.uri,
        name,
        type,
      } as any);
    }
  }

  const token = await AsyncStorage.getItem("token");
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${ENDPOINTS.IMAGES.UPLOAD}`, {
    method: "POST",
    headers,
    body: formData,
  });

  const responseText = await response.text();
  let responseData: any;

  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = { message: responseText || "Invalid upload response" };
  }

  if (!response.ok) {
    throw new Error(responseData.message || "Media upload failed");
  }

  return responseData.images || [];
};
