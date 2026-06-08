import { useState } from "react";
import "./App.css";
import { Route, Routes, Navigate } from "react-router-dom";

import UserLogin from "./pages/UserLogin";
import UserSignup from "./pages/UserSignup";
import CaptainLogin from "./pages/CaptainLogin";
import CaptainSignup from "./pages/CaptainSignup";
import Home from "./pages/Home";
import UserProtectWrapper from "./pages/UserProtectWrapper";
import UserLogout from "./pages/UserLogout";
import CaptainHome from "./pages/CaptainHome";
import CaptainProtectedWrapper from "./pages/CaptainProtectedWrapper";
import CaptainSettings from "./pages/CaptainSettings";
import CaptainHistory from "./pages/CaptainHistory";
import Riding from "./Components/Riding";
import CaptainRiding from "./Components/CaptainRiding";
import DriverLanding from "./pages/DriverLanding";
import MyRides from "./pages/MyRides";
import AuthModal from "./Components/AuthModal";
import { Toaster } from "react-hot-toast";
import Call from "./Components/Call";

function App() {
  return (
    <>
     <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
        }}
      />

      {/* Auth Modal — mounted globally, shown/hidden via AuthContext */}
      <AuthModal />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/drive" element={<DriverLanding />} />

        {/* Backwards compatibility — old /home redirects to / */}
        <Route path="/home" element={<Navigate to="/" replace />} />

        {/* Standalone auth pages — remain fully functional for direct navigation */}
        <Route path="/login" element={<UserLogin />} />
        <Route path="/signup" element={<UserSignup />} />
        <Route path="/captain-login" element={<CaptainLogin />} />
        <Route path="/captain-signup" element={<CaptainSignup />} />
        <Route path="/call" element={<Call />} />

        {/* Protected user routes */}
        <Route
          path="/riding"
          element={
            <UserProtectWrapper>
              <Riding />
            </UserProtectWrapper>
          }
        />
        <Route
          path="/my-rides"
          element={
            <UserProtectWrapper>
              <MyRides />
            </UserProtectWrapper>
          }
        />
        <Route
          path="/user/logout"
          element={
            <UserProtectWrapper>
              <UserLogout />
            </UserProtectWrapper>
          }
        />

        {/* Protected captain routes */}
        <Route
          path="/captain-home"
          element={
            <CaptainProtectedWrapper>
              <CaptainHome />
            </CaptainProtectedWrapper>
          }
        />
        <Route
          path="/captain-riding"
          element={
            <CaptainProtectedWrapper>
              <CaptainRiding />
            </CaptainProtectedWrapper>
          }
        />
        <Route
          path="/captain-settings"
          element={
            <CaptainProtectedWrapper>
              <CaptainSettings />
            </CaptainProtectedWrapper>
          }
        />
        <Route
          path="/captain-history"
          element={
            <CaptainProtectedWrapper>
              <CaptainHistory />
            </CaptainProtectedWrapper>
          }
        />
      </Routes>
    </>
  );
}

export default App;
