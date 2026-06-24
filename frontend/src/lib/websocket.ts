// Singleton WebSocket client for real-time communication.
// Handles connection lifecycle, reconnection, and typed message routing.

import { Message } from "@/types";

type WSMessage = {
  type: string;
  sender_id: number;
  receiver_id?: number;
  group_id?: number;
  body: string;
  payload?: any;
};

type EventCallback = (data: WSMessage) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectInterval = 3000;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private isManualClose = false;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.isManualClose = false;

    // Browser automatically sends the session_id cookie on upgrade if SameSite allows
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.reconnectInterval = 3000; // Reset interval on success
    };

    this.ws.onmessage = (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data);
        this.emit(data.type, data);
        // Also emit a generic 'message' event for chat windows
        if (data.type === "private_message" || data.type === "group_message") {
          this.emit("chat_message", data);
        }
      } catch (err) {
        console.error("Failed to parse WS message:", err);
      }
    };

    this.ws.onclose = () => {
      if (!this.isManualClose) {
        console.log("WebSocket disconnected. Reconnecting...");
        setTimeout(() => this.connect(), this.reconnectInterval);
        this.reconnectInterval = Math.min(this.reconnectInterval * 2, 30000);
      }
    };

    this.ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };
  }
