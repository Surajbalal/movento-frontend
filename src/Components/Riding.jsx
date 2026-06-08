import React, { useState, useContext, useEffect } from "react";
import RatingPopup from "./RatingPopup";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SocketContext } from "../Context/SocketContext";
import LiveTracking from "../Components/LiveTracking";
import useRideRoom from "../Hooks/useRideRoom";
import PaymentButton from "./PaymentButton";
import { UserDataContext } from "../Context/UserContext";

// ─── Helpers ─────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: {
    label: "Finding Captain",
    color: "bg-amber-500",
    pulse: true,
    icon: "ri-search-line",
  },
  accepted: {
    label: "Captain Arriving",
    color: "bg-blue-500",
    pulse: true,
    icon: "ri-car-line",
  },
  ongoing: {
    label: "On the way",
    color: "bg-green-500",
    pulse: false,
    icon: "ri-route-line",
  },
  completed: {
    label: "Completed",
    color: "bg-gray-700",
    pulse: false,
    icon: "ri-check-double-line",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-500",
    pulse: false,
    icon: "ri-close-circle-line",
  },
};

const PAYMENT_CONFIG = {
  pending: {
    label: "Pay Now",
    bg: "bg-gradient-to-r from-indigo-600 to-blue-500",
    icon: "ri-bank-card-line",
    textColor: "text-white",
  },
  paid: {
    label: "Paid",
    bg: "bg-gradient-to-r from-emerald-500 to-green-400",
    icon: "ri-checkbox-circle-fill",
    textColor: "text-white",
  },
  failed: {
    label: "Retry Payment",
    bg: "bg-gradient-to-r from-red-600 to-rose-500",
    icon: "ri-error-warning-line",
    textColor: "text-white",
  },
};

function formatDuration(seconds) {
  if (!seconds) return "--";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function formatDistance(meters) {
  if (!meters) return "--";
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// ─── Component ───────────────────────────────────────────
function Riding() {
  const location = useLocation();
  const initialRideData = location.state?.ride;
  const [rideData, setRideData] = useState(initialRideData);
  const { socket, receiveMessage } = useContext(SocketContext);
  const navigate = useNavigate();
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);
  const { user } = useContext(UserDataContext);

  // ─── Socket: ride-ended ────────────────────────────────
  useEffect(() => {
    const cleanup = receiveMessage("ride-ended", () => {
      setShowRatingPopup(true);
      console.log(" ride-ended received");
    });

    return cleanup;
  }, [socket, receiveMessage]);

  // ─── Socket: payment-status-updated ────────────────────
  useEffect(() => {
    const cleanup = receiveMessage("payment-status-updated", (data) => {
      console.log("payment-status-updated received", data);
      if (data.rideId === rideData?._id) {
        setRideData((prev) => ({
          ...prev,
          payment: { ...prev?.payment, status: data.paymentStatus },
        }));
        if (data.paymentStatus === "paid") {
          setShowPaymentSuccess(true);
          setTimeout(() => setShowPaymentSuccess(false), 3000);
        }
      }
    });

    return cleanup;
  }, [socket, receiveMessage, rideData?._id]);

  useRideRoom(socket, rideData?._id);

  // ─── Derived State ─────────────────────────────────────
  const status = rideData?.status || "ongoing";
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.ongoing;
  const paymentStatus = rideData?.payment?.status || "pending";
  const paymentCfg = PAYMENT_CONFIG[paymentStatus] || PAYMENT_CONFIG.pending;
  const captainName =
    rideData?.captain?.fullName?.firstName || "Captain";
  const captainLastName = rideData?.captain?.fullName?.lastName || "";
  const vehiclePlate = rideData?.captain?.vehicle?.plate || "";
  const vehicleType = rideData?.captain?.vehicle?.vehicleType || "car";

  const vehicleIcon =
    vehicleType === "motorcycle"
      ? "ri-motorbike-fill"
      : vehicleType === "auto"
      ? "ri-taxi-fill"
      : "ri-car-fill";

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-gray-950">
      {/* ═══════════════════════════════════════════════════
          FULL-SCREEN MAP
          ═══════════════════════════════════════════════════ */}
      <div className="absolute inset-0 z-0">
        <LiveTracking rideData={rideData} />
      </div>

      {/* ═══════════════════════════════════════════════════
          TOP BAR — Status + Navigation
          ═══════════════════════════════════════════════════ */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
        <div className="p-3 sm:p-4 flex items-start justify-between gap-3">
          {/* Status pill */}
          <div
            className="pointer-events-auto flex items-center gap-2.5 bg-white/95 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.12)] border border-white/50"
            style={{ animation: "fadeSlideDown 0.4s ease-out" }}
          >
            <div className="relative">
              <div
                className={`w-8 h-8 ${statusCfg.color} rounded-full flex items-center justify-center`}
              >
                <i className={`${statusCfg.icon} text-white text-sm`}></i>
              </div>
              {statusCfg.pulse && (
                <div
                  className={`absolute inset-0 ${statusCfg.color} rounded-full animate-ping opacity-30`}
                ></div>
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider leading-none mb-0.5">
                Ride Status
              </p>
              <p className="text-sm font-bold text-gray-900 leading-tight">
                {statusCfg.label}
              </p>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Nav menu toggle (Opens Drawer) */}
            <button
              onClick={() => setShowNavMenu(true)}
              className="w-11 h-11 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.12)] border border-white/50 flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
            >
              <i className="text-lg text-gray-700 ri-menu-line"></i>
            </button>
          </div>
        </div>

        {/* User Mobile Drawer Overlay for Riding page */}
        {showNavMenu && (
          <div
            className="fixed inset-0 z-50 flex justify-end animate-fade-in pointer-events-auto"
            onClick={() => setShowNavMenu(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" />

            {/* Drawer content */}
            <div
              className="relative w-80 max-w-[85vw] h-full bg-white shadow-2xl flex flex-col justify-between p-6 animate-slide-in-right"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div>
                <div className="flex items-center justify-between mb-8">
                  <span className="text-xl font-bold tracking-tight text-gray-900 font-sans">Movento</span>
                  <button
                    onClick={() => setShowNavMenu(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-900 cursor-pointer"
                  >
                    <i className="ri-close-line text-lg"></i>
                  </button>
                </div>

                {/* User Profile Card */}
                {user && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-6">
                    <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center text-base font-semibold">
                      {user?.fullName?.firstName?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">
                        {user?.fullName?.firstName || "Passenger"}
                      </h4>
                      <p className="text-xs text-gray-500">{user?.email || ""}</p>
                    </div>
                  </div>
                )}

                {/* Nav links */}
                <nav className="flex flex-col gap-2">
                  <Link
                    to="/"
                    onClick={() => setShowNavMenu(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 hover:text-gray-900 text-sm transition-all"
                  >
                    <i className="ri-home-5-line text-lg text-gray-500"></i>
                    Home
                  </Link>
                  <Link
                    to="/drive"
                    onClick={() => setShowNavMenu(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 hover:text-gray-900 text-sm transition-all"
                  >
                    <i className="ri-steering-2-line text-lg text-gray-500"></i>
                    Drive with Movento
                  </Link>
                  <Link
                    to="/my-rides"
                    onClick={() => setShowNavMenu(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 hover:text-gray-900 text-sm transition-all"
                  >
                    <i className="ri-history-line text-lg text-gray-500"></i>
                    My Rides
                  </Link>
                  <button
                    onClick={() => {
                      setShowNavMenu(false);
                      alert("Passenger Profile Details:\n\nName: " + (user?.fullName?.firstName + " " + user?.fullName?.lastName) + "\nEmail: " + user?.email);
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 hover:text-gray-900 text-sm transition-all w-full text-left cursor-pointer"
                  >
                    <i className="ri-user-settings-line text-lg text-gray-500"></i>
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowNavMenu(false);
                      alert("Settings:\n\nNotifications: Enabled\nLanguage: English\nTheme: System default");
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 hover:text-gray-900 text-sm transition-all w-full text-left cursor-pointer"
                  >
                    <i className="ri-settings-3-line text-lg text-gray-500"></i>
                    Settings
                  </button>
                </nav>
              </div>

              {/* Logout & Bottom Section */}
              <div className="border-t border-gray-100 pt-4">
                <Link
                  to="/user/logout"
                  onClick={() => setShowNavMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm transition-all"
                >
                  <i className="ri-logout-box-r-line text-lg"></i>
                  Logout
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          PAYMENT SUCCESS TOAST
          ═══════════════════════════════════════════════════ */}
      {showPaymentSuccess && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-[0_8px_30px_rgba(16,185,129,0.4)] flex items-center gap-2.5 pointer-events-none"
          style={{ animation: "fadeSlideDown 0.3s ease-out" }}
        >
          <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
            <i className="ri-check-line text-lg"></i>
          </div>
          <span className="text-sm font-semibold">Payment successful!</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          BOTTOM SHEET — Ride Info Card
          ═══════════════════════════════════════════════════ */}
      <div
        className={`absolute left-0 right-0 z-20 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isSheetExpanded ? "bottom-0 top-[15vh]" : "bottom-0"
        }`}
      >
        <div
          className={`bg-white rounded-t-[1.75rem] shadow-[0_-8px_40px_rgba(0,0,0,0.15)] flex flex-col ${
            isSheetExpanded ? "h-full" : ""
          } overflow-hidden`}
        >
          {/* ── Drag Handle ─────────────────────────────── */}
          <div
            className="flex justify-center pt-3 pb-1 cursor-pointer shrink-0"
            onClick={() => setIsSheetExpanded(!isSheetExpanded)}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>

          {/* ══ COLLAPSED: Compact summary strip ══ */}
          {!isSheetExpanded && (
            <div className="px-5 pb-5">
              {/* Captain + Fare row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-white shadow-sm">
                      <i className={`${vehicleIcon} text-lg text-gray-600`}></i>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-gray-900 truncate">
                      {captainName}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <i className="ri-star-fill text-amber-400 text-xs"></i>
                      <span className="text-xs font-semibold text-gray-500">4.9</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{vehiclePlate || "—"}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-black text-gray-900">₹{rideData?.fare || "--"}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${
                    paymentStatus === "paid" ? "text-emerald-600" : "text-gray-400"
                  }`}>
                    {paymentStatus === "paid" ? "Paid" : "Unpaid"}
                  </p>
                </div>
              </div>
              {/* Tap hint */}
              <p className="text-center text-[10px] text-gray-400 font-medium mt-3">
                Tap to see ride details
              </p>
            </div>
          )}

          {/* ══ EXPANDED: Full ride details ══ */}
          {isSheetExpanded && (
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-8">
              {/* ── Captain Card ──────────────────────────── */}
              <div className="flex items-center gap-3.5 py-4 border-b border-gray-100">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                    <i className={`${vehicleIcon} text-2xl text-gray-600`}></i>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-[2.5px] border-white"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[17px] font-bold text-gray-900 truncate">
                    {captainName} {captainLastName}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-0.5">
                      <i className="ri-star-fill text-amber-400 text-xs"></i>
                      <span className="text-xs font-semibold text-gray-600">4.9</span>
                    </div>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs font-medium text-gray-500 capitalize">{vehicleType}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg tracking-wider uppercase">
                    {vehiclePlate || "—"}
                  </div>
                </div>
              </div>

              {/* ── Trip Progress ─────────────────────────── */}
              <div className="py-4 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-0.5 pt-1.5 shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm"></div>
                    <div className="w-px h-8 bg-gray-200"></div>
                    <div className="w-2.5 h-2.5 rounded-sm bg-gray-900 shadow-sm"></div>
                  </div>
                  <div className="flex-1 min-w-0 -mt-0.5">
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Pickup</p>
                      <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-1">
                        {rideData?.pickup?.address || "Loading..."}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Destination</p>
                      <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-1">
                        {rideData?.destination?.address || "Loading..."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Stats Row ─────────────────────────────── */}
              <div className="grid grid-cols-3 gap-3 py-4 border-b border-gray-100">
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Distance</p>
                  <p className="text-lg font-bold text-gray-900">{formatDistance(rideData?.distance)}</p>
                </div>
                <div className="text-center border-x border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Duration</p>
                  <p className="text-lg font-bold text-gray-900">{formatDuration(rideData?.duration)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Fare</p>
                  <p className="text-lg font-bold text-gray-900">₹{rideData?.fare || "--"}</p>
                </div>
              </div>

              {/* ── Payment Section ───────────────────────── */}
              <div className="py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      paymentStatus === "paid" ? "bg-emerald-100 text-emerald-600"
                        : paymentStatus === "failed" ? "bg-red-100 text-red-600"
                        : "bg-blue-100 text-blue-600"
                    }`}>
                      <i className={`${paymentCfg.icon} text-sm`}></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Payment</p>
                      <p className={`text-sm font-bold ${
                        paymentStatus === "paid" ? "text-emerald-600"
                          : paymentStatus === "failed" ? "text-red-600"
                          : "text-gray-900"
                      }`}>{paymentCfg.label}</p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-gray-900">₹{rideData?.fare || "--"}</p>
                </div>

                <PaymentButton
                  paymentStatus={rideData?.payment?.status}
                  rideId={rideData?._id}
                  userId={rideData?.user}
                  amount={rideData?.fare}
                />
              </div>

              {/* ── Extra Details ────────────────────────── */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Ride Details</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Ride ID</span>
                    <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">
                      {rideData?._id?.slice(-8)?.toUpperCase() || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Vehicle Type</span>
                    <span className="font-medium text-gray-800 capitalize">{vehicleType}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Payment Method</span>
                    <span className="font-medium text-gray-800 capitalize">{rideData?.payment?.method || "Online"}</span>
                  </div>
                  {rideData?.otp && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">OTP</span>
                      <span className="font-bold text-gray-900 tracking-widest text-base">{rideData.otp}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          RATING POPUP
          ═══════════════════════════════════════════════════ */}
      {showRatingPopup && (
        <RatingPopup
          rideData={rideData}
          onClose={() => setShowRatingPopup(false)}
        />
      )}

      {/* ═══════════════════════════════════════════════════
          INLINE KEYFRAMES
          ═══════════════════════════════════════════════════ */}
      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default Riding;
