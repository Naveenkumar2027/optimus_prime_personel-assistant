
export interface StreamConfig {
  sampleRate: number;
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
  LISTENING_WAKE_WORD = 'LISTENING_WAKE_WORD'
}

export interface BluetoothDeviceMock {
  id: string;
  name: string;
  type: 'speaker' | 'light' | 'phone' | 'display';
  connected: boolean;
}

export interface LogMessage {
  id: string;
  sender: 'user' | 'prime' | 'system';
  text: string;
  timestamp: Date;
}
