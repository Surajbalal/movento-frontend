import React, { createContext, useEffect, useState, useRef } from "react";
import { useCallback } from "react";
import { io } from "socket.io-client";

export const SocketContext = createContext();

/**
 * Reads the correct auth token from localStorage based on the current URL path.
 * Captain paths use "captain-token", all others use "token".
 */
function getAuthToken() {
  const isCaptainPath =
    window.location.pathname.startsWith("/captain") ||
    window.location.pathname === "/drive";
  return isCaptainPath
    ? localStorage.getItem("captain-token")
    : localStorage.getItem("token");
}

function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  // Ref to track the live socket instance for cleanup without stale closures
  const socketRef = useRef(null);

  /**
   * Create and set up a new socket connection using the current token.
   * Returns the new socket or null if no token is available.
   *
   * KEY FIX: Uses a dynamic `auth` callback so that on every connection
   * and reconnection attempt the latest token is read from localStorage.
   * This prevents stale-token "Unauthorized" failures after token refresh.
   */
  const initSocket = useCallback(() => {
    const token = getAuthToken();
    const isCaptainPath =
      window.location.pathname.startsWith("/captain") ||
      window.location.pathname === "/drive";

    console.log(
      "[SocketContext] initSocket — Path:",
      window.location.pathname,
      "isCaptainPath:",
      isCaptainPath,
      "token:",
      token ? `${token.substring(0, 15)}...` : null,
    );

    if (!token) {
      console.warn(
        "[SocketContext] No auth token available. Socket initialization skipped.",
      );
      return null;
    }

    const newSocket = io(`${import.meta.env.VITE_BASE_URL}`, {
      // Dynamic auth: re-read token on every connect / reconnect attempt.
      // If the token was refreshed by an axios interceptor between attempts,
      // the socket will automatically pick up the new token.
      auth: (cb) => {
        const freshToken = getAuthToken();
        console.log(
          "[SocketContext] Auth callback — sending token:",
          freshToken ? `${freshToken.substring(0, 15)}...` : "NONE",
        );
        cb({ token: freshToken });
      },
      autoConnect: false, // connect manually after event handlers are set up
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    newSocket.on("connect_error", (err) => {
      console.error(
        "[SocketContext] Socket connection failed:",
        err.message,
        "| connected:",
        newSocket.connected,
      );
    });

    newSocket.on("connect", () => {
      console.log(
        "[SocketContext] ✅ Connected to server. Socket ID:",
        newSocket.id,
      );
    });

    newSocket.on("disconnect", (reason) => {
      console.log(
        "[SocketContext] Disconnected from server. Reason:",
        reason,
      );
      // "io server disconnect" = server force-closed the connection.
      // socket.io will NOT auto-reconnect in this case — do it manually.
      if (reason === "io server disconnect") {
        const currentToken = getAuthToken();
        if (currentToken) {
          console.log(
            "[SocketContext] Server-initiated disconnect — reconnecting with fresh token…",
          );
          newSocket.connect();
        }
      }
    });

    newSocket.io.on("reconnect", (attempt) => {
      console.log(
        "[SocketContext] Reconnected successfully on attempt:",
        attempt,
      );
    });

    newSocket.io.on("reconnect_attempt", (attempt) => {
      console.log("[SocketContext] Reconnection attempt:", attempt);
    });

    // All handlers registered — now connect
    newSocket.connect();

    return newSocket;
  }, []);

  // Initialize socket on mount (if token exists)
  useEffect(() => {
    const newSocket = initSocket();
    if (newSocket) {
      socketRef.current = newSocket;
      setSocket(newSocket);
    }

    // Cross-tab sync: if another tab changes the token, reconnect
    const handleStorageChange = (e) => {
      if (e.key === "token" || e.key === "captain-token") {
        console.log(
          "[SocketContext] Storage event — key:",
          e.key,
          "value:",
          e.newValue ? "present" : "removed",
        );
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
        const freshSocket = initSocket();
        socketRef.current = freshSocket;
        setSocket(freshSocket);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      if (socketRef.current) {
        console.log(
          "[SocketContext] Cleaning up/disconnecting socket on unmount:",
          socketRef.current.id,
        );
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [initSocket]);

  useEffect(() => {
    console.log(
      "[SocketContext] State updated. Socket ID:",
      socket ? socket.id : null,
      "| connected:",
      socket ? socket.connected : false,
    );
  }, [socket]);

  /**
   * Reconnect the socket after authentication (login / logout / token refresh).
   * Disconnects the old socket and creates a new connection using the
   * current token from localStorage.
   */
  const reconnectSocket = useCallback(() => {
    console.log("[SocketContext] reconnectSocket() called");

    // Disconnect old socket
    if (socketRef.current) {
      console.log(
        "[SocketContext] Disconnecting previous socket:",
        socketRef.current.id,
      );
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Create new socket with fresh token
    const newSocket = initSocket();
    socketRef.current = newSocket;
    setSocket(newSocket);
  }, [initSocket]);

  // Function to send a message to a specific event
  const sendMessage = useCallback(
    (eventName, message) => {
      if (!socket) {
        console.warn("[SocketContext] sendMessage — Socket not initialized");
        return;
      }
      if (!socket.connected) {
        console.warn(
          "[SocketContext] sendMessage — Socket not connected, message will be queued:",
          eventName,
        );
      }
      socket.emit(eventName, message);
    },
    [socket],
  );

  // Function to receive a message from a specific event
  const receiveMessage = useCallback(
    (eventName, callback) => {
      if (!socket) {
        console.warn("[SocketContext] receiveMessage — Socket not initialized");
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
    <SocketContext.Provider
      value={{ socket, sendMessage, receiveMessage, reconnectSocket }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export default SocketProvider;

