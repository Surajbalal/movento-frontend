import React, { useState, useContext, useRef, useEffect } from "react";
import { AuthContext } from "../Context/AuthContext";
import { UserDataContext } from "../Context/UserContext";
import { CaptainDataContext } from "../Context/CaptainContext";
import { SocketContext } from "../Context/SocketContext";
import axiosInstance from "../api/axiosInstance";
import captainAxiosInstance from "../api/captainAxiosInstance";
import logo from "../assets/logo.png";
import { useNavigate } from "react-router-dom";

function AuthModal() {
  const {
    showAuthModal,
    authModalRole,
    authModalTab,
    onAuthSuccess,
    dismissAuthModal,
  } = useContext(AuthContext);

  const { setUser } = useContext(UserDataContext);
  const { setCaptain } = useContext(CaptainDataContext);
  const { reconnectSocket } = useContext(SocketContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("login"); // "login" | "signup"
  const [isLoading, setIsLoading] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form — user
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  // Signup form — captain extras
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleCapacity, setVehicleCapacity] = useState("");
  const [vehicleType, setVehicleType] = useState("car");

  // OTP step
  const [step, setStep] = useState("form"); // "form" | "otp"
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);

  // Error message
  const [errorMsg, setErrorMsg] = useState("");

  // Reset form when modal opens/closes or role changes
  useEffect(() => {
    if (showAuthModal) {
      setActiveTab(authModalTab || "login");
      setStep("form");
      setLoginEmail("");
      setLoginPassword("");
      setFirstName("");
      setLastName("");
      setSignupEmail("");
      setSignupPassword("");
      setVehicleColor("");
      setVehiclePlate("");
      setVehicleCapacity("");
      setVehicleType("car");
      setOtp(["", "", "", "", "", ""]);
      setErrorMsg("");
      setIsLoading(false);
    }
  }, [showAuthModal, authModalRole]);

  if (!showAuthModal) return null;

  const isCaptain = authModalRole === "captain";

  // ── LOGIN ──────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      if (isCaptain) {
        const response = await captainAxiosInstance.post(
          `/auth/captains/login`,
          { email: loginEmail, password: loginPassword }
        );
        if (response.status === 200) {
          setCaptain(response.data.captain);
          localStorage.setItem("captain-token", response.data.token);
          reconnectSocket();
          onAuthSuccess();
          navigate("/captain-home");
        }
      } else {
        const response = await axiosInstance.post(`/auth/users/login`, {
          email: loginEmail,
          password: loginPassword,
        });
        if (response.status === 200) {
          setUser(response.data.user);
          localStorage.setItem("token", response.data.token);
          reconnectSocket();
          onAuthSuccess();
        }
      }
    } catch (error) {
      setErrorMsg(
        error.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── SIGNUP ─────────────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      if (isCaptain) {
        const payload = {
          fullName: { firstName, lastName },
          email: signupEmail,
          password: signupPassword,
          vehicle: {
            color: vehicleColor,
            plate: vehiclePlate,
            capacity: vehicleCapacity,
            vehicleType: vehicleType,
          },
        };
        const response = await captainAxiosInstance.post(
          `/auth/captains/register`,
          payload
        );
        if (response.status === 200) {
          setStep("otp");
        }
      } else {
        const payload = {
          fullName: { firstName, lastName },
          email: signupEmail,
          password: signupPassword,
        };
        const response = await axiosInstance.post(
          `/auth/users/register`,
          payload
        );
        if (response.status === 201) {
          setStep("otp");
        }
      }
    } catch (error) {
      setErrorMsg(
        error.response?.data?.message || "Signup failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── OTP VERIFY ─────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (
      e.key === "Backspace" &&
      !otp[index] &&
      index > 0 &&
      inputRefs.current[index - 1]
    ) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    const otpValue = otp.join("");
    if (otpValue.length !== 6) return;

    try {
      if (isCaptain) {
        const response = await captainAxiosInstance.post(
          `/auth/captains/verify-email`,
          { email: signupEmail, otp: otpValue }
        );
        if (response.status === 200) {
          setCaptain(response.data.captain);
          localStorage.setItem("captain-token", response.data.token);
          reconnectSocket();
          onAuthSuccess();
          navigate("/captain-home");
        }
      } else {
        const response = await axiosInstance.post(`/auth/users/verify-email`, {
          email: signupEmail,
          otp: otpValue,
        });
        if (response.status === 200) {
          setUser(response.data.user);
          localStorage.setItem("token", response.data.token);
          reconnectSocket();
          onAuthSuccess();
        }
      }
    } catch (error) {
      setErrorMsg(
        error.response?.data?.message || "Verification failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={dismissAuthModal}
      />

      {/* Modal */}
      <div className="relative z-10 w-full md:w-[440px] max-h-[90vh] overflow-y-auto bg-white rounded-t-3xl md:rounded-2xl shadow-[0_20px_70px_-10px_rgba(0,0,0,0.5)] animate-slide-up">
        {/* Close button */}
        <button
          onClick={dismissAuthModal}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-20"
        >
          <i className="ri-close-line text-lg text-gray-600"></i>
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <img className="w-10" src={logo} alt="Movento" />
            <div className="h-6 w-px bg-gray-200"></div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              {isCaptain ? "Captain" : "User"}
            </span>
          </div>

          {step === "form" ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {activeTab === "login" ? "Welcome back" : "Create account"}
              </h2>
              <p className="text-sm text-gray-500">
                {activeTab === "login"
                  ? `Log in to continue ${isCaptain ? "driving" : "your ride"}`
                  : `Sign up to ${isCaptain ? "start earning" : "get started"}`}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Verify your email
              </h2>
              <p className="text-sm text-gray-500">
                We sent a 6-digit code to {signupEmail}
              </p>
            </>
          )}
        </div>

        {/* Tabs (only in form step) */}
        {step === "form" && (
          <div className="px-6 mb-4">
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => {
                  setActiveTab("login");
                  setErrorMsg("");
                }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  activeTab === "login"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Log in
              </button>
              <button
                onClick={() => {
                  setActiveTab("signup");
                  setErrorMsg("");
                }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  activeTab === "signup"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Sign up
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mx-6 mb-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center gap-2">
            <i className="ri-error-warning-line text-red-500"></i>
            {errorMsg}
          </div>
        )}

        {/* Form content */}
        <div className="px-6 pb-6">
          {step === "otp" ? (
            /* ── OTP Form ── */
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="flex justify-center gap-3 my-4">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    className="w-11 h-13 text-center text-xl font-semibold border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 bg-gray-50"
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                  />
                ))}
              </div>
              <button
                type="submit"
                disabled={isLoading || otp.join("").length !== 6}
                className="w-full bg-black text-white font-semibold py-3.5 rounded-xl hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Verifying...
                  </span>
                ) : (
                  "Verify & Continue"
                )}
              </button>
            </form>
          ) : activeTab === "login" ? (
            /* ── LOGIN Form ── */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                  type="email"
                  placeholder="email@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black text-white font-semibold py-3.5 rounded-xl hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Logging in...
                  </span>
                ) : (
                  "Log in"
                )}
              </button>
            </form>
          ) : (
            /* ── SIGNUP Form ── */
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    First name
                  </label>
                  <input
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Last name
                  </label>
                  <input
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                  type="email"
                  placeholder="email@example.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                  type="password"
                  placeholder="Create a password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              {/* Captain vehicle fields */}
              {isCaptain && (
                <>
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      Vehicle Details
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        required
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                        type="text"
                        placeholder="Vehicle Color"
                        value={vehicleColor}
                        onChange={(e) => setVehicleColor(e.target.value)}
                      />
                      <input
                        required
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                        type="text"
                        placeholder="Vehicle Plate"
                        value={vehiclePlate}
                        onChange={(e) => setVehiclePlate(e.target.value)}
                      />
                      <input
                        required
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                        type="number"
                        placeholder="Capacity"
                        value={vehicleCapacity}
                        onChange={(e) => setVehicleCapacity(e.target.value)}
                        min="1"
                      />
                      <select
                        required
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-700 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                      >
                        <option value="car">Car</option>
                        <option value="motorcycle">Motorcycle</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black text-white font-semibold py-3.5 rounded-xl hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Creating account...
                  </span>
                ) : (
                  "Sign up"
                )}
              </button>
            </form>
          )}

          {/* Continue Browsing */}
          <button
            onClick={dismissAuthModal}
            className="w-full mt-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-all duration-200"
          >
            Continue browsing
          </button>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slide-up {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}

export default AuthModal;
