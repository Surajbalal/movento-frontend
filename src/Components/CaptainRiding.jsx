import React, { useContext, useRef, useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import FinishRide from "./FinishRide";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SocketContext } from "../Context/SocketContext";
import useRideRoom from "../Hooks/useRideRoom";
import LiveTracking from "../Components/LiveTracking";
import { useNavigate } from "react-router-dom";
import { CaptainDataContext } from "../Context/CaptainContext";
import logo from "../assets/movento-logo.png";
import captainAxiosInstance from "../api/captainAxiosInstance";

function formatDistance(meters) {
  if (!meters) return "--";
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
  if (!seconds) return "--";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function CaptainRiding() {
  const [isFinishRidePanelOpen, setIsFinishRidePanelOpen] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const finishRidePanelPef = useRef(null);
  const location = useLocation();
  const initialRideData = location.state?.ride;
  const [rideData, setRideData] = useState(initialRideData);
  const { socket, receiveMessage } = useContext(SocketContext);
  const { captain } = useContext(CaptainDataContext);
  const [isCaptainMenuOpen, setIsCaptainMenuOpen] = useState(false);
  const navigate = useNavigate();
  const status = rideData?.status;

  useRideRoom(socket, rideData?._id);

  // Listen for payment status updates
  useEffect(() => {
    if (!receiveMessage) return;
    const cleanup = receiveMessage("payment-status-updated", (data) => {
      console.log("captain: payment-status-updated received", data);
      if (data.rideId === rideData?._id) {
        setRideData((prev) => ({
          ...prev,
          payment: { ...prev?.payment, status: data.paymentStatus },
        }));
      }
    });
    return cleanup;
  }, [socket, receiveMessage, rideData?._id]);

  const pickup = useMemo(() => {
    if (rideData?.pickup?.location?.coordinates) {
      return {
        lat: Number(rideData.pickup.location.coordinates[1]),
        lng: Number(rideData.pickup.location.coordinates[0]),
      };
    }
    return null;
  }, [rideData]);

  useGSAP(() => {
    if (isFinishRidePanelOpen) {
      gsap.to(finishRidePanelPef.current, { transform: "translateY(0)" });
    } else {
      gsap.to(finishRidePanelPef.current, { transform: "translateY(100%)" });
    }
  }, [isFinishRidePanelOpen]);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.log("Geolocation is not supported by this browser.");
    }
  }, []);

  const paymentStatus = rideData?.payment?.status || "pending";
  const isPaid = paymentStatus === "paid";
  const riderName = rideData?.user?.fullName?.firstName || "Rider";

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-gray-950">
      {/* ═══ FULL-SCREEN MAP ═══ */}
      <div className="absolute inset-0 z-0">
        <LiveTracking rideData={rideData} isCaptain={true} />
      </div>

      {/* ═══ TOP BAR ═══ */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
        <div className="p-3 sm:p-4 flex items-center justify-between gap-3">
          {/* Status pill */}
          <div
            className="pointer-events-auto flex items-center gap-2.5 bg-white/95 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.12)] border border-white/50"
            style={{ animation: "fadeSlideDown 0.4s ease-out" }}
          >
            <div className="relative">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <i className="ri-navigation-fill text-white text-sm"></i>
              </div>
              <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider leading-none mb-0.5">
                Captain Mode
              </p>
              <p className="text-sm font-bold text-gray-900 leading-tight">
                {status === "accepted" ? "Going to Pickup" : "Driving"}
              </p>
            </div>
          </div>

          {/* Home button & hamburger menu */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <Link
              to="/captain-home"
              className="w-11 h-11 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.12)] border border-white/50 flex items-center justify-center hover:bg-white transition-colors"
            >
              <i className="ri-home-5-line text-lg text-gray-700"></i>
            </Link>
            <button
              onClick={() => setIsCaptainMenuOpen(true)}
              className="w-11 h-11 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.12)] border border-white/50 flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
            >
              <i className="ri-menu-3-line text-lg text-gray-700"></i>
            </button>
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM SHEET ═══ */}
      <div
        className={`absolute left-0 right-0 z-20 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isSheetExpanded ? "bottom-0 top-[20vh]" : "bottom-0"
        }`}
      >
        <div
          className={`bg-white rounded-t-[1.75rem] shadow-[0_-8px_40px_rgba(0,0,0,0.15)] flex flex-col ${
            isSheetExpanded ? "h-full" : "max-h-[50vh]"
          } overflow-hidden`}
        >
          {/* Drag handle */}
          <div
            className="flex justify-center pt-3 pb-1 cursor-pointer shrink-0"
            onClick={() => setIsSheetExpanded(!isSheetExpanded)}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-8">
            {/* ── Rider Info ──────────────────── */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <i className="ri-user-3-fill text-lg text-blue-600"></i>
                </div>
                <div>
                  <p className="text-[15px] font-bold text-gray-900">
                    {riderName}
                  </p>
                  <p className="text-xs text-gray-500">Rider</p>
                </div>
              </div>
              {/* Payment badge */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                  isPaid
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                <i
                  className={
                    isPaid ? "ri-checkbox-circle-fill" : "ri-time-fill"
                  }
                ></i>
                {isPaid ? "Paid" : "Unpaid"}
              </div>
            </div>

            {/* ── Trip Progress ───────────────── */}
            <div className="py-4 border-b border-gray-100">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-0.5 pt-1.5 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                  <div className="w-px h-8 bg-gray-200"></div>
                  <div className="w-2.5 h-2.5 rounded-sm bg-gray-900"></div>
                </div>
                <div className="flex-1 min-w-0 -mt-0.5">
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                      Pickup
                    </p>
                    <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-1">
                      {rideData?.pickup?.address || "Loading..."}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                      Destination
                    </p>
                    <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-1">
                      {rideData?.destination?.address || "Loading..."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Stats Row ───────────────────── */}
            <div className="grid grid-cols-3 gap-3 py-4 border-b border-gray-100">
              <div className="text-center">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Distance
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {formatDistance(rideData?.distance)}
                </p>
              </div>
              <div className="text-center border-x border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Duration
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {formatDuration(rideData?.duration)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Fare
                </p>
                <p className="text-lg font-bold text-gray-900">
                  ₹{rideData?.fare || "--"}
                </p>
              </div>
            </div>

            {/* ── End Ride Button ─────────────── */}
            {(status === "accepted" || status === "ongoing") && (
              <div className="pt-4">
                <button
                  onClick={() => setIsFinishRidePanelOpen(true)}
                  className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98]"
                >
                  <i className="ri-flag-2-fill text-lg"></i>
                  <span>End Ride</span>
                </button>
              </div>
            )}

            {/* ── Expanded Details ────────────── */}
            {isSheetExpanded && rideData?.otp && (
              <div
                className="border-t border-gray-100 pt-4 mt-4"
                style={{ animation: "fadeSlideUp 0.3s ease-out" }}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Ride OTP</span>
                  <span className="font-bold text-gray-900 tracking-widest text-lg">
                    {rideData.otp}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ FINISH RIDE PANEL ═══ */}
      <div
        ref={finishRidePanelPef}
        className="fixed z-30 bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-full max-w-md max-h-[95vh] rounded-t-[2.5rem] overflow-hidden bg-white shadow-[0_-20px_50px_rgba(0,0,0,0.2)]"
      >
        <FinishRide
          rideData={rideData}
          setIsFinishRidePanelOpen={setIsFinishRidePanelOpen}
        />
      </div>

      {/* Captain Drawer Overlay */}
      {isCaptainMenuOpen && (
        <div
          className="fixed inset-0 z-[100] flex justify-end animate-fade-in pointer-events-auto"
          onClick={() => setIsCaptainMenuOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" />

          {/* Drawer content */}
          <div
            className="relative w-80 max-w-[85vw] h-full bg-white shadow-2xl flex flex-col justify-between p-6 animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Main content area */}
            <div className="overflow-y-auto pr-1">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <img className="w-20" src={logo} alt="Movento" />
                  <span className="bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                    Captain
                  </span>
                </div>
                <button
                  onClick={() => setIsCaptainMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>

              {/* Profile Card */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-lg font-bold border-2 border-white shadow-sm">
                  {captain?.fullName?.firstName?.[0]?.toUpperCase() || "C"}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-[15px] leading-tight">
                    {captain?.fullName?.firstName} {captain?.fullName?.lastName}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">{captain?.email}</p>
                  <p className="text-[10px] font-medium text-gray-400 mt-0.5">{captain?.phone || "No phone"}</p>
                </div>
              </div>

              {/* Active Ride Badge */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-950 text-white rounded-2xl p-4 mb-6 shadow-sm">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Active Trip
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black text-green-400">
                    In Progress
                  </span>
                </div>
              </div>

              {/* Vehicle Details Section */}
              <div className="p-4 border border-gray-100 rounded-2xl mb-6">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Vehicle Details
                </h5>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-700">
                    <i className={`${captain?.vehicle?.vehicleType === "motorcycle" ? "ri-motorbike-fill" : captain?.vehicle?.vehicleType === "auto" ? "ri-taxi-fill" : "ri-car-fill"} text-xl`}></i>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 capitalize">
                      {captain?.vehicle?.vehicleType || "Car"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {captain?.vehicle?.plate || "—"} • {captain?.vehicle?.color || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation links */}
              <nav className="flex flex-col gap-1.5">
                <Link
                  to="/captain-home"
                  onClick={() => setIsCaptainMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 font-semibold text-gray-800 text-sm transition-all"
                >
                  <i className="ri-dashboard-line text-lg text-gray-500"></i>
                  Dashboard
                </Link>

                <Link
                  to="/captain-history"
                  onClick={() => setIsCaptainMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 hover:text-gray-900 text-sm transition-all"
                >
                  <i className="ri-history-line text-lg text-gray-500"></i>
                  Ride History
                </Link>

                <Link
                  to="/captain-settings"
                  onClick={() => setIsCaptainMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 hover:text-gray-900 text-sm transition-all"
                >
                  <i className="ri-settings-3-line text-lg text-gray-500"></i>
                  Settings
                </Link>
              </nav>
            </div>

            {/* Logout button */}
            <div className="border-t border-gray-100 pt-4">
              <button
                onClick={async () => {
                  setIsCaptainMenuOpen(false);
                  try {
                    await captainAxiosInstance.get("/auth/captains/logOut");
                  } catch (err) {
                    console.error("Captain logout backend call failed:", err);
                  }
                  localStorage.removeItem("captain-token");
                  navigate("/drive");
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm transition-all w-full text-left cursor-pointer"
              >
                <i className="ri-logout-box-r-line text-lg"></i>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

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

export default CaptainRiding;