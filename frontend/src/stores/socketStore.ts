import { create } from 'zustand';

interface SocketState {
  socket: any | null;
  isConnected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  socket: null,
  isConnected: false,
  connect: () => {},
  disconnect: () => {}
}));
