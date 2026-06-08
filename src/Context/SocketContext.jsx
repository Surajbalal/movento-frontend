import React, { createContext, useEffect, useState } from "react";
import { useCallback } from "react";
import { io } from "socket.io-client";

export const SocketContext = createContext();

function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);

  /**
   * Create and set up a new socket connection using the current token.
   * Returns the new socket or null if no token is available.
   */
  const initSocket = useCallback(() => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("captain-token");
    if (!token) return null;

    const newSocket = io(`${import.meta.env.VITE_BASE_URL}`, {
      auth: { token },
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connection failed:", err.message);
    });

    newSocket.on("connect", () => {
      console.log("Connected to server", newSocket.id);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    newSocket.io.on("reconnect", (attempt) => {
      console.log("Reconnected", attempt);
    });

    newSocket.io.on("reconnect_attempt", () => {
      console.log("Trying reconnect...");
    });

    return newSocket;
  }, []);

  // Initialize socket on mount (if token exists)
  useEffect(() => {
    const newSocket = initSocket();
    if (newSocket) {
      setSocket(newSocket);
    }
    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    console.log("UPDATED SOCKET:", socket);
  }, [socket]);

  /**
   * Reconnect the socket after authentication.
   * Disconnects the old socket (if any) and creates a new connection
   * using the current token from localStorage.
   */
  const reconnectSocket = useCallback(() => {
    // Disconnect existing socket
    if (socket) {
      socket.disconnect();
    }
    const newSocket = initSocket();
    if (newSocket) {
      setSocket(newSocket);
    }
  }, [socket, initSocket]);

  // Function to send a message to a specific event
  const sendMessage = (eventName, message) => {
    if (!socket) {
      console.warn("Socket not initialized");
      return;
    }
    console.log("sending message", eventName, message);
    socket.emit(eventName, message);
  };
  // Function to receive a message from a specific event
  const receiveMessage = useCallback(
    (eventName, callback) => {
      console.log("inside receive message", eventName, callback);
      if (!socket) {
        console.warn("⚠ Socket not initialized");
        return () => {};
      }

      socket.on(eventName, callback);

      return () => {
        socket.off(eventName, callback);
      };
    },
    [socket],
  );

  return (
    <SocketContext.Provider value={{ socket, sendMessage, receiveMessage, reconnectSocket }}>
      {children}
    </SocketContext.Provider>
  );
}

export default SocketProvider;
