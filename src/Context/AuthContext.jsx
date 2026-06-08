import React, { createContext, useState, useCallback, useContext } from "react";
import { UserDataContext } from "./UserContext";
import { CaptainDataContext } from "./CaptainContext";

export const AuthContext = createContext();

/**
 * AuthProvider manages authentication state and the auth modal.
 *
 * Uses an ACTION-BASED approach for pending auth:
 *   pendingAction = { action: "createRide", payload: { pickup, destination, vehicleType } }
 *
 * After successful authentication, consumers read `pendingAction` from context
 * and execute the corresponding handler in their own component scope.
 */
function AuthProvider({ children }) {
  // Modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalRole, setAuthModalRole] = useState("user"); // "user" | "captain"
  const [authModalTab, setAuthModalTab] = useState("login"); // "login" | "signup"

  // Pending action — serializable object, NOT a callback
  const [pendingAction, setPendingAction] = useState(null);

  // Auth success flag — incremented after each login so consumers can react
  const [authSuccessCounter, setAuthSuccessCounter] = useState(0);

  const { user } = useContext(UserDataContext);
  const { captain } = useContext(CaptainDataContext);

  /**
   * Check if a user is currently authenticated.
   */
  const isUserAuthenticated = useCallback(() => {
    return !!localStorage.getItem("token");
  }, []);

  /**
   * Check if a captain is currently authenticated.
   */
  const isCaptainAuthenticated = useCallback(() => {
    return !!localStorage.getItem("captain-token");
  }, []);

  /**
   * Request authentication for a role with a pending action.
   *
   * If already authenticated, returns true immediately (caller should proceed).
   * If not authenticated, opens modal and stores the pending action.
   *
   * @param {"user"|"captain"} role
   * @param {Object|null} action - e.g. { action: "createRide", payload: {...} }
   * @returns {boolean} - true if already authenticated
   */
  const requireAuth = useCallback(
    (role, action = null) => {
      const isAuthenticated =
        role === "user" ? isUserAuthenticated() : isCaptainAuthenticated();

      if (isAuthenticated) {
        return true;
      }

      // Not authenticated — open the modal and store the action
      setAuthModalRole(role);
      setPendingAction(action);
      setShowAuthModal(true);
      return false;
    },
    [isUserAuthenticated, isCaptainAuthenticated]
  );

  /**
   * Called after successful login/signup from the AuthModal.
   * Bumps the auth success counter so consumers can detect and handle pendingAction.
   */
  const onAuthSuccess = useCallback(() => {
    setShowAuthModal(false);
    setAuthSuccessCounter((prev) => prev + 1);
    // pendingAction is NOT cleared here — consumers read it and clear it themselves
  }, []);

  /**
   * Clear the pending action (called by consumers after handling it).
   */
  const clearPendingAction = useCallback(() => {
    setPendingAction(null);
  }, []);

  /**
   * Close modal without authenticating.
   */
  const dismissAuthModal = useCallback(() => {
    setShowAuthModal(false);
    setPendingAction(null);
  }, []);

  const value = {
    // State
    showAuthModal,
    authModalRole,
    authModalTab,
    pendingAction,
    authSuccessCounter,

    // Auth checks
    isUserAuthenticated,
    isCaptainAuthenticated,

    // Actions
    requireAuth,
    onAuthSuccess,
    clearPendingAction,
    dismissAuthModal,
    setShowAuthModal,
    setAuthModalRole,
    setAuthModalTab,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export default AuthProvider;
