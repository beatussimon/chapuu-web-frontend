import * as SecureStore from 'expo-secure-store';

const DEFAULT_WS_URL = 'wss://chapuu.com';
const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_URL || DEFAULT_WS_URL;

type EventHandler = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private handlers: Record<string, EventHandler[]> = {};
  private isConnecting = false;

  constructor(endpoint: string) {
    this.url = `${WS_BASE_URL}${endpoint}`;
  }

  async connect(requiresAuth = false) {
    if (this.socket?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    let finalUrl = this.url;

    if (requiresAuth) {
      const token = await SecureStore.getItemAsync('chapuu_access_token');
      if (token) {
        finalUrl = `${this.url}?token=${token}`;
      }
    }

    this.socket = new WebSocket(finalUrl);

    this.socket.onopen = () => {
      console.log(`[WebSocket] Connected to ${this.url}`);
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.emit('connected', null);
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type) {
          this.emit(data.type, data.message || data);
        } else {
          this.emit('message', data);
        }
      } catch (e) {
        console.warn('[WebSocket] Failed to parse message', event.data);
      }
    };

    this.socket.onclose = (event) => {
      console.log(`[WebSocket] Disconnected from ${this.url}`);
      this.isConnecting = false;
      this.emit('disconnected', event);
      this.handleReconnect(requiresAuth);
    };

    this.socket.onerror = (error) => {
      console.error(`[WebSocket] Error on ${this.url}:`, error);
      this.isConnecting = false;
    };
  }

  private handleReconnect(requiresAuth: boolean) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
      console.log(`[WebSocket] Reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(requiresAuth), delay);
    } else {
      console.warn(`[WebSocket] Max reconnect attempts reached for ${this.url}`);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  send(data: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket] Cannot send, socket is not open');
    }
  }

  on(event: string, handler: EventHandler) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
    
    // Return unsubscribe function
    return () => {
      this.handlers[event] = this.handlers[event].filter(h => h !== handler);
    };
  }

  private emit(event: string, data: any) {
    if (this.handlers[event]) {
      this.handlers[event].forEach(handler => handler(data));
    }
  }
}

// Export specific instances
export const globalOrdersSocket = new WebSocketService('/ws/orders/');

export const getStoreOrdersSocket = (storeId: number) => {
  return new WebSocketService(`/ws/orders/${storeId}/`);
};

export const getCustomerOrderSocket = (orderId: number) => {
  return new WebSocketService(`/ws/order/${orderId}/`);
};
