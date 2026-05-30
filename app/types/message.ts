export interface Message {
  _id: string;
  content: string;
  createdAt: string;
  read: boolean;
  recipient: string | { _id: string; email?: string; username?: string };
  sender: string | { _id: string; email?: string; username?: string };
  status?: "pending" | "sent" | "read";
  updatedAt: string;
}
