export interface Message {
  _id: string;
  content: string;
  createdAt: string;
  read: boolean;
  recipient: string;
  sender: string;
  updatedAt: string;
}
