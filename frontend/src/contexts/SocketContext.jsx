import { createContext, useContext, useEffect, useState } from "react";
import socketService from "../services/socketService";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState("disconnected");

  useEffect(() => {
    const s = socketService.connect();
    setSocket(s);

    const unsubscribe = socketService.subscribeStatus((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, status, socketService }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    // If used outside provider, fallback gracefully to socketService instance
    return {
      socket: socketService.getSocket() || socketService.connect(),
      status: socketService.status,
      socketService,
    };
  }
  return context;
}

export default SocketContext;
