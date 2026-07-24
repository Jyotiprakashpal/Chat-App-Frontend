export interface Message {
  _id: string;
  content: string;
  attachments?: {
    message?: string;
    publicId?: string;
    filename?: string;
    url?: string;
    contentType?: string;
    bytes?: number;
    width?: number;
    height?: number;
    format?: string;
    resourceType?: string;
    localUri?: string;
  }[];
  attachment?: {
    images?: {
      message?: string;
      publicId?: string;
      filename?: string;
      url?: string;
      contentType?: string;
      bytes?: number;
      width?: number;
      height?: number;
      format?: string;
      resourceType?: string;
      localUri?: string;
    }[];
  };
  createdAt: string;
  deletedAt?: string;
  editedAt?: string;
  isDeleted?: boolean;
  isMediaDeleted?: boolean;
  mediaDeletedAt?: string;
  read: boolean;
  recipient: string | { _id: string; email?: string; username?: string };
  sender: string | { _id: string; email?: string; username?: string };
  status?: "pending" | "sent" | "read";
  updatedAt: string;
}

