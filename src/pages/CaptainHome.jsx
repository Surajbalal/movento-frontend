import React, { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/movento-logo.png";
import CaptainDetails from "../Components/CaptainDetails";
import RidePopUp from "../Components/RidePopUp";
import ConfirmRidePopUp from "../Components/ConfirmRidePopUp";
import { SocketContext } from "../Context/SocketContext";
import { CaptainDataContext } from "../Context/CaptainContext";
import LiveTracking from "../Components/LiveTracking";
import captainAxiosInstance from "../api/captainAxiosInstance";
import Call from "../Components/Call";

function CaptainHome() {
  const [captainLocation, setCaptainLocation] = useState(null);
  const [ride, setRide] = useState(null);
  const [isRidePopupOpen, setIsRidePopupOpen] = useState(false);
  const [isConfirmPopUpOpen, setIsConfirmPopUpOpen] = useState(false);
  const [isRideAccepted, setIsRideAccepted] = useState(false);
  const [liveDistance, setLiveDistance] = useState(null);
  const [liveDuration, setLiveDuration] = useState(null);
  const confirmPopupPanelRef = useRef(null);
  const ridePopupPanelRef = useRef(null);
  const { sendMessage, socket, reconnectSocket } = useContext(SocketContext);
  const { captain, setCaptain } = useContext(CaptainDataContext);
  const [captainStats, setCaptainStats] = useState({});
  const [isCaptainDetailLoading, setIsCaptainDetailLoading] = useState(false);
  const [isAcceptingRide, setIsAcceptingRide] = useState(false);
  const [activeOngoingRide, setActiveOngoingRide] = useState(null);

  const [isOnline, setIsOnline] = useState(captain?.status === "active");

  useEffect(() => {
    if (captain) {
      setIsOnline(captain.status === "active");
    }
  }, [captain]);

  const handleToggleStatus = async () => {
    try {
      const nextStatus = isOnline ? "inactive" : "active";
      const response = await captainAxiosInstance.put("/captain/update-profile", {
        updateData: { status: nextStatus }
      });
      if (response.status === 200) {
        setIsOnline(nextStatus === "active");
        setCaptain(prev => ({ ...prev, status: nextStatus }));
      }
    } catch (error) {
      console.error("Failed to toggle status:", error);
    }
  };
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [isCaptainMenuOpen, setIsCaptainMenuOpen] = useState(false);
  const callRef = useRef(null);

  const confirm = async () => {
    try {
      setIsAcceptingRide(true);
      const response = await captainAxiosInstance.post(`/rides/confirm`, {
        rideId: ride._id,
        captainId: captain._id,
      });
      if (response.status == 200) {
        setIsRidePopupOpen(false);
        setIsConfirmPopUpOpen(true);
        setIsRideAccepted(true);
        if (sendMessage && ride._id) {
          sendMessage("join-ride-room", ride._id);
        }
      }
    } catch (error) {
      console.error("Error accepting ride:", error);
    } finally {
      setIsAcceptingRide(false);
    }
  };

  const navigate = useNavigate();

  // Fetch active ride — NO forced redirect for ongoing or accepted rides
  useEffect(() => {
    const fetchRide = async () => {
      try {
        const response = await captainAxiosInstance.get("/rides/get-ride");
        if (!response.data?._id) return;

        if (response.data.status === "ongoing" || response.data.status === "accepted") {
          // Store active ride — captain can manually resume
          setActiveOngoingRide(response.data);
          setRide(response.data);
          return;
        }
      } catch (error) {
        console.log("No active ride found");
      }
    };

    fetchRide();
  }, []);

  useEffect(() => {
    if (!socket || !ride?._id) return;
    const joinRoom = () => {
      sendMessage("join-ride-room", ride._id, (response) => {
        console.log("Joined room:", response);
      });
    };
    if (socket.connected) joinRoom();
    socket.on("connect", joinRoom);
    return () => socket.off("connect", joinRoom);
  }, [socket, ride?._id]);

  useEffect(() => {
    const fetchCaptainStats = async () => {
      setIsCaptainDetailLoading(true);
      const response = await captainAxiosInstance.get("/rides/get-captain-stats");
      if (response.status == 200) setCaptainStats(response.data);
      setIsCaptainDetailLoading(false);
    };
    fetchCaptainStats();
  }, [captain?._id]);

  useEffect(() => {
    if (!captain || !sendMessage) return;
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser.");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCaptainLocation(location);
        sendMessage("update-captain-location", {
          captainId: captain._id,
          location,
        });
      },
      (error) => {
        console.error("Error getting captain location:", error.message);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [captain?._id, sendMessage]);

  useEffect(() => {
    if (!socket) return;
    const handleNewRide = (data) => {
      setRide({ ...data.ride, user: data.user });
      setIsRidePopupOpen(true);
    };
    const handleRideCancelled = (data) => {
      console.log("ride-cancelled received", data);
      setRide(null);
      setActiveOngoingRide(null); // Clear banner
      setIsRidePopupOpen(false);
      setIsConfirmPopUpOpen(false);
      setIsRideAccepted(false);
      alert(`Ride cancelled: ${data.reason || "No reason provided"}`);
    };
    const handleRideStarted = (data) => {
      console.log("ride-started received", data);
      setIsConfirmPopUpOpen(false);
      setIsRidePopupOpen(false);
      setIsRideAccepted(false);
      navigate("/captain-riding", { state: { ride: data } });
    };
    const handleRideEnded = (data) => {
      console.log("ride-ended received", data);
      setRide(null);
      setActiveOngoingRide(null); // Clear banner
      alert(data.message);
    };
    socket.on("new-ride", handleNewRide);
    socket.on("ride-cancelled", handleRideCancelled);
    socket.on("ride-started", handleRideStarted);
    socket.on("ride-ended", handleRideEnded);
    return () => {
      socket.off("new-ride", handleNewRide);
      socket.off("ride-cancelled", handleRideCancelled);
      socket.off("ride-started", handleRideStarted);
      socket.off("ride-ended", handleRideEnded);
    };
  }, [socket, navigate]);

  const captainFirstName = captain?.fullName?.firstName || "Captain";
  const showMap = isRideAccepted;

  return (
    <div className={`h-screen flex flex-col relative font-sans ${showMap ? 'bg-gray-950 overflow-hidden' : 'bg-gray-50 overflow-y-auto'}`}>
      
      {!showMap ? (
        /* Structure B: Premium Landing Dashboard Layout (No Map) */
        <div className="flex-1 flex flex-col w-full relative pointer-events-auto overflow-y-auto">
          {/* Universal Header */}
          <header className="w-full bg-white shadow-sm border-b border-gray-100 flex items-center justify-between px-6 py-4 z-40 sticky top-0">
            <div className="flex items-center gap-3">
              <img className="w-24" src={logo} alt="Movento Logo" />
              <span className="bg-green-100 text-green-700 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                Captain
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                <span className="text-sm font-semibold text-gray-700">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
              <button
                onClick={() => setIsCaptainMenuOpen(true)}
                className="w-9 h-9 bg-gray-150 text-gray-700 rounded-full flex items-center justify-center text-sm font-semibold hover:bg-gray-200 transition-colors cursor-pointer"
              >
                {captain?.fullName?.firstName?.[0]?.toUpperCase() || "C"}
              </button>
            </div>
          </header>

          {/* Dashboard Content */}
          <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col gap-6">
            
            {/* Top earnings & status toggle card */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xs border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Today's Earnings</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-emerald-600">₹{captainStats.totalEarnings || 0}</span>
                  <span className="text-sm font-semibold text-gray-500">from {captainStats.totalRides || 0} completed rides</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-700">Accepting Rides</span>
                <button
                  onClick={handleToggleStatus}
                  className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                    isOnline ? "bg-green-500 justify-end" : "bg-gray-300 justify-start"
                  }`}
                >
                  <span className="bg-white w-6 h-6 rounded-full shadow-sm"></span>
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-1 items-center text-center">
                <i className="ri-history-line text-2xl text-gray-400"></i>
                <span className="text-xs font-bold text-gray-400 uppercase mt-1">Total Rides</span>
                <span className="text-xl font-extrabold text-gray-900 mt-1">{captainStats.totalRides || 0}</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-1 items-center text-center">
                <i className="ri-star-fill text-2xl text-amber-400"></i>
                <span className="text-xs font-bold text-gray-400 uppercase mt-1">Rating</span>
                <span className="text-xl font-extrabold text-gray-900 mt-1">4.9 ★</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-1 items-center text-center">
                <i className="ri-time-line text-2xl text-blue-500"></i>
                <span className="text-xs font-bold text-gray-400 uppercase mt-1">Hours Online</span>
                <span className="text-xl font-extrabold text-gray-900 mt-1">8.5h</span>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={handleToggleStatus}
                  className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-black transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isOnline ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    <i className={isOnline ? "ri-wifi-off-line" : "ri-wifi-line"}></i>
                  </div>
                  <span className="text-xs font-bold text-gray-800">{isOnline ? "Go Offline" : "Go Online"}</span>
                </button>

                <button
                  onClick={() => {
                    if (ride) {
                      setIsRidePopupOpen(true);
                    } else {
                      alert("No new ride requests at the moment. Keep status 'Online' to receive them.");
                    }
                  }}
                  className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-black transition-all flex flex-col items-center justify-center gap-2 cursor-pointer relative"
                >
                  {ride && (
                    <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                  )}
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-lg">
                    <i className="ri-notification-badge-line"></i>
                  </div>
                  <span className="text-xs font-bold text-gray-800">Requests</span>
                </button>

                <button
                  onClick={() => navigate("/captain-history")}
                  className="bg-white p-5 rounded-2xl border border-gray-150 hover:border-black transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
                >
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg">
                    <i className="ri-history-line"></i>
                  </div>
                  <span className="text-xs font-bold text-gray-800">History</span>
                </button>

                <button
                  onClick={() => navigate("/captain-settings")}
                  className="bg-white p-5 rounded-2xl border border-gray-150 hover:border-black transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
                >
                  <div className="w-10 h-10 bg-gray-100 text-gray-650 rounded-xl flex items-center justify-center text-lg">
                    <i className="ri-settings-3-line"></i>
                  </div>
                  <span className="text-xs font-bold text-gray-800">Settings</span>
                </button>
              </div>
            </div>

            {/* Vehicle details section */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col gap-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Registered Vehicle</h3>
              <div className="flex items-center justify-between border border-gray-100 rounded-2xl p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-700 text-2xl">
                    <i className={captain?.vehicle?.vehicleType === "motorcycle" ? "ri-motorbike-fill" : captain?.vehicle?.vehicleType === "auto" ? "ri-taxi-fill" : "ri-car-fill"}></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 capitalize">{captain?.vehicle?.vehicleType || "Car"}</h4>
                    <p className="text-xs text-gray-500 mt-1">{captain?.vehicle?.color || "Color"} • {captain?.vehicle?.capacity || 4} Seater</p>
                  </div>
                </div>
                <div className="bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-black tracking-wider text-gray-800 uppercase">
                  {captain?.vehicle?.plate || "No Plate"}
                </div>
              </div>
            </div>

          </main>

          {/* ═══ RIDE POPUP OVERLAY ON TOP OF DASHBOARD ═══ */}
          {isRidePopupOpen && ride && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
              <div
                className="bg-white rounded-3xl shadow-[0_20px_70px_-10px_rgba(0,0,0,0.2)] border border-gray-100 w-full max-w-[450px] max-h-[90vh] overflow-y-auto"
              >
                <RidePopUp
                  ride={ride}
                  confirm={confirm}
                  isAcceptingRide={isAcceptingRide}
                  setIsRidePopupOpen={setIsRidePopupOpen}
                  setIsConfirmPopUpOpen={setIsConfirmPopUpOpen}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Structure A: Map and Active Accepted/Ongoing Ride Layout */
        <div className="flex-1 flex flex-col relative w-full h-full">
          {/* ═══ FULL-SCREEN MAP ═══ */}
          <div className="absolute inset-0 z-0">
            <LiveTracking 
              rideData={ride} 
              isCaptain={true} 
              onRouteUpdate={(data) => {
                if (data) {
                  setLiveDistance(data.distanceMeters);
                  setLiveDuration(data.duration);
                }
              }}
            />
          </div>

          {/* ═══ TOP HEADER BAR ═══ */}
          <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
            <div className="p-3 sm:p-4 flex items-center justify-between gap-3">
              {/* Left: Logo + Status */}
              <div
                className="pointer-events-auto flex items-center gap-3 bg-white/95 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.12)] border border-white/50"
                style={{ animation: "fadeSlideDown 0.4s ease-out" }}
              >
                <div className="relative">
                  <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center">
                    <i className="ri-steering-2-fill text-white text-lg"></i>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                </div>
                <div>
                  <p className="text-[15px] font-bold text-gray-900 leading-tight">
                    {captainFirstName}
                  </p>
                  <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wider leading-none">
                    {isOnline ? "Online" : "Offline"}
                  </p>
                </div>
              </div>

              {/* Right: Earnings badge + Navigation */}
              <div className="flex items-center gap-2 pointer-events-auto">
                {/* Today's earnings pill */}
                <div
                  className="hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.12)] border border-white/50"
                  style={{ animation: "fadeSlideDown 0.5s ease-out" }}
                >
                  <i className="ri-money-rupee-circle-fill text-green-500 text-lg"></i>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none mb-0.5">
                      Today
                    </p>
                    <p className="text-sm font-bold text-gray-900 leading-tight">
                      ₹{captainStats.totalEarnings || 0}
                    </p>
                  </div>
                </div>

                {/* Profile menu button */}
                <button
                  onClick={() => setIsCaptainMenuOpen(true)}
                  className="w-11 h-11 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.12)] border border-white/50 flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
                >
                  <i className="ri-menu-3-line text-lg text-gray-700"></i>
                </button>
              </div>
            </div>

            {/* Status indicator when ride exists */}
            {ride && ride._id && !activeOngoingRide && (
              <div className="px-3 sm:px-4 pointer-events-auto">
                <div
                  className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-xl px-4 py-2 rounded-xl shadow-lg border border-white/50"
                  style={{ animation: "fadeSlideDown 0.6s ease-out" }}
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                  </span>
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                    {ride.status === "accepted"
                      ? `En Route to Pickup ${
                          liveDistance && liveDuration
                            ? `(${ (liveDistance / 1000).toFixed(1) } km • ${ Math.round(
                                parseInt(liveDuration) / 60
                              ) } min)`
                            : ""
                        }`
                      : ride.status === "started" || ride.status === "ongoing"
                      ? "Driving to Destination"
                      : "Waiting for Ride"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ═══ CAPTAIN DETAILS — BOTTOM SHEET ═══ */}
          {!isRideAccepted && (
            <div
              className={`absolute left-0 right-0 z-20 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                isDetailsExpanded ? "bottom-0 top-[25vh]" : "bottom-0"
              }`}
            >
              <div
                className={`bg-white rounded-t-[1.75rem] shadow-[0_-8px_40px_rgba(0,0,0,0.15)] flex flex-col ${
                  isDetailsExpanded ? "h-full" : "max-h-[45vh]"
                } overflow-hidden`}
              >
                {/* Drag handle */}
                <div
                  className="flex justify-center pt-3 pb-1 cursor-pointer shrink-0"
                  onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                >
                  <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain">
                  <CaptainDetails
                    stats={captainStats}
                    isCaptainDetailLoading={isCaptainDetailLoading}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═══ CONFIRM RIDE POPUP ═══ */}
          <div
            ref={confirmPopupPanelRef}
            style={{ display: isConfirmPopUpOpen ? "block" : "none" }}
            className="fixed z-50 bottom-0 left-0 right-0 top-auto md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[450px] bg-white rounded-t-3xl md:rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] md:shadow-[0_20px_70px_-10px_rgba(0,0,0,0.5)] md:border border-white/50 max-h-[92vh] overflow-y-auto"
          >
            <ConfirmRidePopUp
              captain={captain}
              ride={ride}
              setIsRidePopupOpen={setIsRidePopupOpen}
              setIsConfirmPopUpOpen={setIsConfirmPopUpOpen}
              setIsRideAccepted={setIsRideAccepted}
              onCallUser={() => callRef.current?.initiateCall()}
            />
          </div>


        </div>
      )}

      {/* Captain Drawer Overlay (Shared) */}
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

              {/* Earnings Widget */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-950 text-white rounded-2xl p-4 mb-6 shadow-sm">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Total Earnings (Today)
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-green-400">
                    ₹{captainStats.totalEarnings || 0}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    from {captainStats.totalRides || 0} rides
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
                      {captain?.vehicle?.plate || "—"} • {captain?.vehicle?.color || "—"} ({captain?.vehicle?.capacity || 4} Seater)
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation links */}
              <nav className="flex flex-col gap-1.5">
                <Link
                  to="/captain-home"
                  onClick={() => {
                    setIsCaptainMenuOpen(false);
                    setIsRideAccepted(false);
                    setIsConfirmPopUpOpen(false);
                    setActiveOngoingRide(null);
                    setRide(null);
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 font-semibold text-gray-800 text-sm transition-all"
                >
                  <i className="ri-dashboard-line text-lg text-gray-500"></i>
                  Dashboard
                </Link>

                {(isRideAccepted || isConfirmPopUpOpen || activeOngoingRide) && (
                  <div
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-green-100 text-green-800 font-bold text-sm cursor-not-allowed border border-green-200"
                    title="You are currently in an active ride flow"
                  >
                    <span className="flex items-center gap-3">
                      <i className="ri-navigation-line text-lg text-green-600"></i>
                      Active Ride (Current)
                    </span>
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
                  </div>
                )}

                {isConfirmPopUpOpen ? (
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-gray-300 text-sm cursor-not-allowed"
                    title="Please complete or minimize the active ride flow to view history"
                  >
                    <i className="ri-history-line text-lg text-gray-300"></i>
                    Ride History
                  </div>
                ) : (
                  <Link
                    to="/captain-history"
                    onClick={() => setIsCaptainMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 hover:text-gray-900 text-sm transition-all"
                  >
                    <i className="ri-history-line text-lg text-gray-500"></i>
                    Ride History
                  </Link>
                )}

                {isConfirmPopUpOpen ? (
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-gray-300 text-sm cursor-not-allowed"
                    title="Please complete or minimize the active ride flow to view settings"
                  >
                    <i className="ri-settings-3-line text-lg text-gray-300"></i>
                    Settings
                  </div>
                ) : (
                  <Link
                    to="/captain-settings"
                    onClick={() => setIsCaptainMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 hover:text-gray-900 text-sm transition-all"
                  >
                    <i className="ri-settings-3-line text-lg text-gray-500"></i>
                    Settings
                  </Link>
                )}
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
                  reconnectSocket();
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

      {/* RESUME RIDE BANNER — Ongoing rides (shown only if confirm popup not open) */}
      {activeOngoingRide && !isConfirmPopUpOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-0 md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:w-auto pointer-events-auto">
          <button
            onClick={() => {
              if (activeOngoingRide.status === "accepted") {
                setRide(activeOngoingRide);
                setIsConfirmPopUpOpen(true);
                setIsRideAccepted(true);
              } else {
                navigate("/captain-riding", {
                  state: { ride: activeOngoingRide },
                });
              }
            }}
            className="w-full md:w-auto flex items-center justify-between gap-4 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:bg-gray-800 transition-all duration-300 group"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <i className="ri-navigation-fill text-xl"></i>
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-gray-900"></div>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold">Ride in progress</p>
                <p className="text-xs text-gray-400">
                  {activeOngoingRide?.destination?.address
                    ? `To: ${activeOngoingRide.destination.address.substring(0, 35)}...`
                    : "Tap to resume your ride"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg group-hover:bg-white/20 transition-colors">
              <span className="text-sm font-semibold">Resume</span>
              <i className="ri-arrow-right-line text-lg"></i>
            </div>
          </button>
        </div>
      )}

      {/* Call component */}
       {ride?._id && captain?._id && (
        <Call
          ref={callRef}
          rideId={ride._id}
          callerId={captain._id}
          receiverId={ride?.user?._id}
          hideTrigger={true}
        />
      )} 

      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default CaptainHome;
