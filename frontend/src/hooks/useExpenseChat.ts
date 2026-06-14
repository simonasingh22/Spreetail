import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { getMessages, ChatMessagePayload } from '../api/chat.api';
import toast from 'react-hot-toast';

export const useExpenseChat = (expenseId: string) => {
  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const accessToken = useAuthStore((state) => state.accessToken);

  // 1. Fetch message history
  useEffect(() => {
    if (!expenseId) return;
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const res = await getMessages(expenseId);
        setMessages(res.data);
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to load message history');
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [expenseId]);

  // 2. Establish Socket.io connection and room join
  useEffect(() => {
    if (!expenseId || !accessToken) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    // Determine path dynamically for reverse proxies (like Vercel Services)
    const isVercelService = socketUrl.includes('/_/backend');
    const cleanSocketUrl = isVercelService ? socketUrl.replace('/_/backend', '') : socketUrl;
    
    // Connect socket
    const socket = io(cleanSocketUrl, {
      auth: {
        token: accessToken
      },
      ...(isVercelService ? { path: '/_/backend/socket.io' } : {})
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.io connected:', socket.id);
      // Join room
      socket.emit('join_expense', { expenseId });
    });

    socket.on('new_message', (msg: ChatMessagePayload) => {
      // Append new message if it matches this expense
      if (msg.expenseId === expenseId) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on('error', (err: { message: string }) => {
      console.error('Socket.io error event received:', err.message);
      toast.error(err.message || 'Real-time chat error');
    });

    socket.on('disconnect', () => {
      console.log('Socket.io connection closed');
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [expenseId, accessToken]);

  // 3. Send Message function
  const sendMessage = useCallback((content: string) => {
    if (!socketRef.current || !socketRef.current.connected) {
      toast.error('Chat server disconnected. Please try again.');
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) return;

    socketRef.current.emit('send_message', {
      expenseId,
      content: trimmed
    });
  }, [expenseId]);

  return {
    messages,
    isLoading,
    sendMessage
  };
};

export default useExpenseChat;
