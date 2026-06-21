// TypeScript interfaces mapped directly from the Go backend models.
// Ensures strict type safety across the frontend application.

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  avatar?: string;
  nickname?: string;
  about_me?: string;
  is_public: boolean;
  created_at: string;
}

export interface AuthResponse {
  message: string;
  user_id?: number;
  user?: User;
}

export interface Post {
  id: number;
  user_id: number;
  title: string;
  content: string;
  image?: string;
  privacy: "public" | "almost_private" | "private";
  created_at: string;
  user?: User;
  comment_count?: number;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  content: string;
  related_user_id?: number;
  related_group_id?: number;
  is_read: boolean;
  created_at: string;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id?: number;
  group_id?: number;
  content: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
}
