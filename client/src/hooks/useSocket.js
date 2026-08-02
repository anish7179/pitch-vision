import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

// Keep a singleton socket connection so we don't create multiple connections
// when different components use the hook.
const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
let socketInstance = null;

/**
 * Custom hook to manage a Socket.io connection.
 * Automatically connects on mount and provides methods to join/leave rooms
 * and listen to specific events.
 */
export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket'], // Force websocket to skip polling phase
      });
    }
    
    socketRef.current = socketInstance;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);

    // If already connected before the event listener was attached
    if (socketInstance.connected) {
      setIsConnected(true);
    }

    return () => {
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
    };
  }, []);

  /**
   * Helper to subscribe to an event and automatically clean up on unmount.
   */
  const useSocketEvent = (event, callback) => {
    useEffect(() => {
      if (!socketInstance) return;
      
      socketInstance.on(event, callback);
      
      return () => {
        socketInstance.off(event, callback);
      };
    }, [event, callback]);
  };

  /**
   * Join a specific match room to receive targeted score updates.
   */
  const joinMatch = (matchId) => {
    if (socketInstance && matchId) {
      socketInstance.emit('join:match', matchId);
    }
  };

  /**
   * Leave a specific match room.
   */
  const leaveMatch = (matchId) => {
    if (socketInstance && matchId) {
      socketInstance.emit('leave:match', matchId);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    useSocketEvent,
    joinMatch,
    leaveMatch,
  };
}
