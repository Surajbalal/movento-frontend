import React, { useRef, useState, useEffect, useContext } from "react";
import logo from "../assets/movento-logo.png";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import "remixicon/fonts/remixicon.css";
import LocationSearchPanel from "../Components/LocationSearchPanel";
import VehicalPanel from "../Components/VehicalPanel";
import Searching from "../Components/Searching";
import LookingForDriver from "../Components/LookingForDriver";
import WaitingForDriver from "../Components/WaitingForDriver";
import { UserDataContext } from "../Context/UserContext";
import { SocketContext } from "../Context/SocketContext";
import { AuthContext } from "../Context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import LiveTracking from "../Components/LiveTracking";
import axiosInstance from "../api/axiosInstance";

function Home() {
  const [pickup, setpickup] = useState("");
  const [destination, setDestination] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [addressList, setAddressList] = useState([]);

  const panelRef = useRef(null);
  const panelCloseRef = useRef(null);
  const vehicalPanelRef = useRef(null);
  const searchingPanelRef = useRef(null);
  const vehicleSearchRef = useRef(null);
  const driverWaitingRef = useRef(null);
  const [isRideAccepted, setIsRideAccepted] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [isLocationSelected, setIsLocationSelected] = useState(false);
  const [fare, setfare] = useState({});
  const [rideData, setRideData] = useState({});
  const [vehicleType, setVehicleType] = useState("car");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useContext(UserDataContext);
  const { sendMessage, socket } = useContext(SocketContext);
  const {
    requireAuth,
    isUserAuthenticated,
    pendingAction,
    authSuccessCounter,
    clearPendingAction,
    setShowAuthModal,
    setAuthModalRole,
    setAuthModalTab,
  } = useContext(AuthContext);

  // State for ongoing ride that user can manually resume
  const [activeOngoingRide, setActiveOngoingRide] = useState(null);

  // Open AuthModal helpers for navbar
  const openAuthModal = (tab = "login") => {
    setAuthModalRole("user");
    setAuthModalTab(tab);
    setShowAuthModal(true);
  };

  const token = localStorage.getItem("token");

  const [isVehicalPanelOpen, setIsVehicalPanelOpen] = useState(false);

  // Fetch active ride only if authenticated — NO forced redirect
  useEffect(() => {
    if (!token) return; // Skip for unauthenticated users

    const fetchRide = async () => {
      try {
        const response = await axiosInstance.get("/rides/get-ride");
        if (!response.data?._id) return;

        if (response.data.status === "ongoing") {
          // Store the ongoing ride so user can manually resume
          setActiveOngoingRide(response.data);
          setRideData(response.data);
          return;
        }
        if (response.data && response.data._id) {
          setRideData(response.data);
          setIsDriverWaitingOpen(true);
          setIsRideAccepted(true);
        }
      } catch (error) {
        console.log("No active ride found");
      }
    };

    fetchRide();
  }, [token]);

  // Socket ride room join — only when authenticated and ride exists
  useEffect(() => {
    if (!socket || !rideData?._id || !token) return;

    const joinRoom = () => {
      sendMessage("join-ride-room", rideData._id, (response) => {
        console.log("Joined room:", response);
      });
    };

    if (socket.connected) {
      joinRoom();
    }

    socket.on("connect", joinRoom);

    return () => {
      socket.off("connect", joinRoom);
    };
  }, [socket, rideData?._id, token]);

  // Debug log for state changes
  useEffect(() => {
    console.log("isVehicalPanelOpen changed to:", isVehicalPanelOpen);
  }, [isVehicalPanelOpen]);
  const [isSearchingPanelOpen, setIsSearchingPanelOpen] = useState(false);
  const [isVehicleSearchOpen, setIsVehicleSearchOpen] = useState(false);
  const [isDriverWaitingOpen, setIsDriverWaitingOpen] = useState(false);

  // Debug log for Searching panel state changes
  useEffect(() => {
    console.log("isSearchingPanelOpen changed to:", isSearchingPanelOpen);
  }, [isSearchingPanelOpen]);

  // Debug log for Driver Waiting panel state changes
  useEffect(() => {
    console.log("isDriverWaitingOpen changed to:", isDriverWaitingOpen);
  }, [isDriverWaitingOpen]);

  // Socket event listeners — only when authenticated
  useEffect(() => {
    if (!socket || !token) return;

    const handleRideConfirm = (ride) => {
      console.log(" ride-confirm received", ride);

      // set ride data
      setRideData(ride);

      // close all other panels
      setIsVehicalPanelOpen(false);
      setIsSearchingPanelOpen(false);
      setIsVehicleSearchOpen(false);

      // open waiting panel
      setIsRideAccepted(true);
      setIsDriverWaitingOpen(true);
    };

    const handleRideStarted = (ride) => {
      console.log(" ride-started received", ride);

      setIsDriverWaitingOpen(false);
      setIsRideAccepted(false);

      navigate("/riding", { state: { ride } });
    };

    const handleRideCancelled = (data) => {
      console.log("ride-cancelled received", data);
      setRideData({});
      setIsDriverWaitingOpen(false);
      setIsRideAccepted(false);
      setIsPanelOpen(false);
      alert(`Ride cancelled because of: ${data.reason}` || `Ride Cancelled`);
    };

    socket.on("ride-ended", (data) => {
      console.log(" ride-ended received", data);
      setRideData({});
      setIsDriverWaitingOpen(false);
      setIsRideAccepted(false);
      setIsPanelOpen(false);
      alert(data.message);
    });
    socket.on("ride-confirm", handleRideConfirm);
    socket.on("ride-started", handleRideStarted);
    socket.on("ride-cancelled", handleRideCancelled);

    // cleanup (VERY IMPORTANT)
    return () => {
      socket.off("ride-confirm", handleRideConfirm);
      socket.off("ride-started", handleRideStarted);
      socket.off("ride-cancelled", handleRideCancelled);
    };
  }, [socket, navigate, token]);

  const getfare = async () => {
    console.log(
      "getfare called with pickup:",
      pickup,
      "destination:",
      destination,
    );
    try {
      const response = await axiosInstance.get(`/rides/get-fare`, {
        params: { pickup: pickup, destination: destination },
      });
      console.log("getfare response:", response.status, response.data);
      if (response.status === 200) {
        setfare(response.data);
        console.log("Setting setIsVehicalPanelOpen to true");
        setIsVehicalPanelOpen(true);
        setIsPanelOpen(false);
        setIsLocationSelected(false);
      }
    } catch (error) {
      console.error("Error fetching fare:", error);
    }
  };

  const [isCreatingRide, setIsCreatingRide] = useState(false);
  const createRide = async () => {
    try {
      setIsCreatingRide(true);
      const response = await axiosInstance.post(`/rides/create`, {
        pickup: pickup,
        destination: destination,
        vehicleType: vehicleType,
      });
      if (response.status === 200) {
        setRideData(response.data);
        setIsVehicleSearchOpen(true);
        setIsSearchingPanelOpen(false);
      }
    } catch (error) {
      console.error("Error creating ride:", error);
      setIsVehicleSearchOpen(false);
      setIsVehicalPanelOpen(true);
    } finally {
      setIsCreatingRide(false);
    }
  };

  useEffect(() => {
    console.log("🔥 STATE CHECK → isDriverWaitingOpen:", isDriverWaitingOpen);
  }, [isDriverWaitingOpen]);

  /**
   * Auth-guarded "See prices" handler.
   * If authenticated, calls getfare() directly.
   * If not, opens the auth modal with a pending action.
   */
  const handleSeePrices = () => {
    if (!pickup || !destination) return;
    getfare();
    setIsLocationSelected(true);
  };

  /**
   * Auth-guarded ride creation handler.
   * Called from VehicalPanel confirm. Panel state transitions only happen
   * AFTER authentication is verified to prevent UI leaking on dismissal.
   */
  const handleCreateRide = () => {
    if (isUserAuthenticated()) {
      // Auth passed — transition panels and create ride
      setIsVehicalPanelOpen(false);
      setIsVehicleSearchOpen(true);
      createRide();
    } else {
      // Auth required — open modal, DON'T change panels.
      // Panels stay on VehicalPanel so dismissing the modal returns user there.
      requireAuth("user", {
        action: "createRide",
        payload: { pickup, destination, vehicleType },
      });
    }
  };

  /**
   * Handle pending actions after successful authentication.
   * Reacts to authSuccessCounter changes from AuthContext.
   */
  useEffect(() => {
    if (authSuccessCounter === 0 || !pendingAction) return;

    if (pendingAction.action === "getFare") {
      // Re-read token after auth success
      const freshToken = localStorage.getItem("token");
      if (freshToken && pickup && destination) {
        // Short delay to let state settle after auth
        setTimeout(() => {
          getfare();
          setIsLocationSelected(true);
        }, 300);
      }
      clearPendingAction();
    } else if (pendingAction.action === "createRide") {
      const freshToken = localStorage.getItem("token");
      if (freshToken) {
        // Transition panels now that auth is confirmed
        setIsVehicalPanelOpen(false);
        setIsVehicleSearchOpen(true);
        setTimeout(() => {
          createRide();
        }, 300);
      }
      clearPendingAction();
    }
  }, [authSuccessCounter]);

  const submitHandler = (e) => {
    e.preventDefault();
  };

  // Fetch suggestions
  useEffect(() => {
    if (!isPanelOpen) {
      setAddressList([]);
      return;
    }

    const input = activeField === "pickup" ? pickup : destination;
    if (!input || input.trim().length < 3) {
      setAddressList([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        setIsLoading(true);
        const response = await axiosInstance.get(
          `/rides/maps/get-suggestions`,
          {
            params: { input },
            skipGlobalError: true,
          },
        );
        setAddressList(response.data);
        setIsLoading(false);
      } catch (error) {
        console.log("error", error);
        setIsLoading(false);
      }
    };
    const timeout = setTimeout(fetchSuggestions, 400);
    return () => clearTimeout(timeout);
  }, [pickup, destination, activeField, isPanelOpen]);

  // Determine if user is authenticated for UI rendering
  const isAuthenticated = isUserAuthenticated();

  return (
    <div className="h-screen bg-white flex flex-col relative overflow-hidden font-sans">
      {/* Universal Header replacing absolute logo */}
      <header className="absolute md:static top-0 w-full z-50 bg-white md:bg-white shadow-none md:shadow-sm items-center justify-between px-6 py-4 md:border-b border-gray-100 hidden md:flex">
        <div className="flex items-center gap-8">
          <img className="w-24" src={logo} alt="Movento Logo" />
          <nav className="hidden md:flex gap-6 font-medium text-sm text-gray-900">
            <Link
              to="/"
              className="bg-gray-100 py-2 px-3 rounded-full transition-colors"
            >
              Ride
            </Link>
            <Link
              to="/drive"
              className="hover:bg-gray-100 py-2 px-3 rounded-full transition-colors"
            >
              Drive
            </Link>
            {isAuthenticated && (
              <Link
                to="/my-rides"
                className="hover:bg-gray-100 py-2 px-3 rounded-full transition-colors"
              >
                My Rides
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <button
                onClick={() => {
                  alert("User Profile Details:\n\nName: " + (user?.fullName?.firstName + " " + user?.fullName?.lastName) + "\nEmail: " + user?.email);
                }}
                className="text-sm font-medium hover:bg-gray-100 py-2 px-3 rounded-full transition-colors cursor-pointer"
              >
                Profile
              </button>
              <Link
                to="/user/logout"
                className="text-sm font-medium hover:bg-gray-100 py-2 px-3 rounded-full transition-colors"
              >
                Log out
              </Link>
              <div className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center text-sm font-semibold">
                {user?.fullName?.firstName?.[0]?.toUpperCase() || "U"}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => openAuthModal("login")}
                className="text-sm font-medium hover:bg-gray-100 py-2 px-3 rounded-full transition-colors"
              >
                Log in
              </button>
              <button
                onClick={() => openAuthModal("signup")}
                className="bg-black text-white text-sm font-medium py-2 px-4 rounded-full hover:bg-gray-800 transition-colors"
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden absolute top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-gray-100 shadow-sm pointer-events-auto">
        <Link to="/">
          <img className="w-20" src={logo} alt="Movento" />
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="w-10 h-10 bg-gray-50 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 transition-all cursor-pointer"
        >
          <i className="ri-menu-3-line text-lg text-gray-800"></i>
        </button>
      </header>

      {/* User Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end md:hidden animate-fade-in pointer-events-auto"
          onClick={() => setIsMobileMenuOpen(false)}
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
                <img className="w-20" src={logo} alt="Movento" />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>

              {/* User Profile Card */}
              {isAuthenticated && (
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
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 hover:text-gray-900 text-sm transition-all"
                >
                  <i className="ri-home-5-line text-lg text-gray-500"></i>
                  Home
                </Link>
                <Link
                  to="/drive"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 hover:text-gray-900 text-sm transition-all"
                >
                  <i className="ri-steering-2-line text-lg text-gray-500"></i>
                  Drive with Movento
                </Link>

                {isAuthenticated ? (
                  <>
                    <Link
                      to="/my-rides"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 hover:text-gray-900 text-sm transition-all"
                    >
                      <i className="ri-history-line text-lg text-gray-500"></i>
                      My Rides
                    </Link>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        alert("Passenger Profile Details:\n\nName: " + (user?.fullName?.firstName + " " + user?.fullName?.lastName) + "\nEmail: " + user?.email);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 hover:text-gray-900 text-sm transition-all w-full text-left cursor-pointer"
                    >
                      <i className="ri-user-settings-line text-lg text-gray-500"></i>
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        alert("Settings:\n\nNotifications: Enabled\nLanguage: English\nTheme: System default");
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 hover:text-gray-900 text-sm transition-all w-full text-left cursor-pointer"
                    >
                      <i className="ri-settings-3-line text-lg text-gray-500"></i>
                      Settings
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        openAuthModal("login");
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 hover:text-gray-900 text-sm transition-all w-full text-left cursor-pointer"
                    >
                      <i className="ri-login-box-line text-lg text-gray-500"></i>
                      Log in
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        openAuthModal("signup");
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 hover:text-gray-900 text-sm transition-all w-full text-left cursor-pointer"
                    >
                      <i className="ri-user-add-line text-lg text-gray-500"></i>
                      Sign up
                    </button>
                  </>
                )}
              </nav>
            </div>

            {/* Bottom Section */}
            {isAuthenticated && (
              <div className="border-t border-gray-100 pt-4">
                <Link
                  to="/user/logout"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm transition-all"
                >
                  <i className="ri-logout-box-r-line text-lg"></i>
                  Logout
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1920px] mx-auto z-10 pointer-events-none md:pointer-events-auto h-full pt-[72px] md:pt-0">
        {/* Map Background for Mobile; Handled by Grid on Desktop */}
        <div className="absolute inset-0 z-0 md:hidden bg-gray-100">
          <LiveTracking rideData={rideData} isCaptain={false} pickup={pickup} destination={destination} />
        </div>

        {/* Left Side: Search Panel */}
        <div className="w-full md:w-[450px] lg:w-[500px] h-full flex flex-col justify-end md:justify-start pointer-events-none md:pt-16 md:pl-16 z-20">
          <div className="bg-white rounded-t-[2.5rem] md:rounded-none w-full p-6 md:p-0 pointer-events-auto transition-all shadow-[0_-12px_40px_rgba(0,0,0,0.12)] md:shadow-none pb-8 md:pb-0 relative border-t border-gray-100 md:border-t-0">
            {/* Drag Handle for Mobile Bottom Sheet */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5 md:hidden"></div>
            <button
              ref={panelCloseRef}
              onClick={() => setIsPanelOpen(false)}
              className="md:hidden absolute top-4 right-4 text-gray-500 hover:text-gray-900 focus:outline-none"
            >
              <i className="ri-arrow-down-wide-line text-2xl"></i>
            </button>

            {/* Desktop Headline */}
            <h1 className="hidden md:block text-5xl lg:text-[54px] font-bold tracking-tight mb-8 text-black leading-[1.1]">
              Request a ride for now or later
            </h1>

            {/* Mobile Headline */}
            <h4 className="md:hidden text-2xl font-bold mb-5 text-gray-900">
              Where to?
            </h4>

            <form onSubmit={submitHandler} className="w-full relative">
              <div className="flex flex-col gap-3 w-full relative">
                {/* Connecting Line (Only spans between the two inputs) */}
                <div className="absolute left-[20px] md:left-[22px] top-6 bottom-6 w-[2px] bg-black z-20 hidden md:block"></div>
                <div className="md:hidden absolute left-[20px] top-6 bottom-6 w-0.5 bg-gray-300 z-10"></div>

                {/* Pickup Field */}
                <div className="relative w-full group">
                  <div className="absolute left-4 md:left-4 top-1/2 transform -translate-y-1/2 z-30">
                    <div className="w-2 md:w-3 h-2 md:h-3 bg-black rounded-full shadow-sm"></div>
                  </div>
                  <input
                    value={pickup}
                    onClick={() => {
                      setIsPanelOpen(true);
                      setActiveField("pickup");
                      setIsLocationSelected(false);
                    }}
                    onChange={(e) => setpickup(e.target.value)}
                    className="w-full pl-10 md:pl-12 pr-4 py-3 md:py-4 bg-gray-100 rounded-lg md:rounded-xl text-base placeholder-black focus:bg-gray-200 focus:outline-none transition-all duration-200"
                    type="text"
                    placeholder="Pickup location"
                    autoComplete="off"
                  />
                </div>

                {/* Destination Field */}
                <div className="relative w-full group">
                  <div className="absolute left-4 md:left-4 top-1/2 transform -translate-y-1/2 z-30">
                    <div className="w-2 md:w-3 h-2 md:h-3 bg-black rounded-sm shadow-sm"></div>
                  </div>
                  <input
                    onClick={() => {
                      setIsPanelOpen(true);
                      setActiveField("destination");
                      setIsLocationSelected(false);
                    }}
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full pl-10 md:pl-12 pr-4 py-3 md:py-4 bg-gray-100 rounded-lg md:rounded-xl text-base placeholder-black focus:bg-gray-200 focus:outline-none transition-all duration-200"
                    type="text"
                    placeholder="Dropoff location"
                    autoComplete="off"
                  />
                </div>

                {/* Search / Choose Vehicle Button (Responsive) */}
                {!fare.car ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (pickup && destination) {
                        handleSeePrices();
                      }
                    }}
                    className={`flex mt-4 items-center justify-center bg-black hover:bg-gray-800 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 active:scale-95 w-full md:w-32 cursor-pointer shadow-md shadow-black/10 ${
                      (!pickup || !destination) ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    disabled={!pickup || !destination}
                  >
                    See prices
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsVehicalPanelOpen(true);
                    }}
                    className="flex mt-4 items-center justify-center bg-black hover:bg-gray-800 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 active:scale-95 w-full md:w-40 cursor-pointer shadow-md shadow-black/10"
                  >
                    Choose vehicle
                  </button>
                )}
              </div>
            </form>

            {/* Location Panel - Dropdown on web, bottom-sheet slide on mobile */}
            {isPanelOpen && (
              <div
                ref={panelRef}
                className="bg-white rounded-t-3xl md:rounded-2xl shadow-[0_-5px_40px_rgba(0,0,0,0.15)] md:shadow-xl md:border border-gray-100 overflow-hidden md:mt-4 md:absolute md:w-[120%] z-40"
              >
                <LocationSearchPanel
                  setIsVehicalPanelOpen={setIsVehicalPanelOpen}
                  setIsPanelOpen={setIsPanelOpen}
                  setIsLocationSelected={setIsLocationSelected}
                  addressList={addressList}
                  isLoading={isLoading}
                  setFieldValue={(value) => {
                    if (activeField === "pickup") setpickup(value);
                    else setDestination(value);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Massive Rounded Map (Desktop Only) */}
        <div className="hidden md:block flex-1 p-6 md:pl-12 pb-12 z-0">
          <div className="w-full h-[85vh] rounded-3xl overflow-hidden shadow-sm relative">
            <LiveTracking rideData={rideData} isCaptain={false} pickup={pickup} destination={destination} />
          </div>
        </div>
      </div>

      {/* Side Panels - React state controls visibility (no GSAP to avoid conflicts) */}

      {/* Vehicle Selection Panel */}
      <div
        style={{ display: isVehicalPanelOpen ? "block" : "none" }}
        className="fixed z-50 bottom-0 left-0 right-0 md:left-12 md:right-auto md:bottom-auto md:top-[120px] md:h-fit md:max-h-[calc(100vh-140px)] md:w-[450px] bg-white rounded-t-3xl md:rounded-3xl shadow-[0_-5px_30px_rgba(0,0,0,0.2)] md:shadow-2xl overflow-y-auto w-full md:border border-gray-100"
      >
        <VehicalPanel
          fare={fare}
          setVehicleType={setVehicleType}
          setIsVehicalPanelOpen={setIsVehicalPanelOpen}
          setIsVehicleSearchOpen={setIsVehicleSearchOpen}
          createRide={handleCreateRide}
        />
      </div>

      {/* Searching / Confirm Ride Panel */}
      <div
        style={{ display: isSearchingPanelOpen ? "block" : "none" }}
        className="fixed z-50 bottom-0 left-0 right-0 md:left-12 md:right-auto md:bottom-auto md:top-[120px] md:h-fit md:max-h-[calc(100vh-140px)] md:w-[450px] bg-white rounded-t-3xl md:rounded-3xl shadow-[0_-5px_30px_rgba(0,0,0,0.2)] md:shadow-2xl overflow-y-auto w-full md:border border-gray-100"
      >
        <Searching
          isCreatingRide={isCreatingRide}
          pickup={pickup}
          fare={fare}
          vehicleType={vehicleType}
          destination={destination}
          setIsSearchingPanelOpen={setIsSearchingPanelOpen}
          setIsVehicleSearchOpen={setIsVehicleSearchOpen}
        />
      </div>

      {/* Looking for Driver Panel */}
      <div
        style={{ display: isVehicleSearchOpen ? "block" : "none" }}
        className="fixed z-50 bottom-0 left-0 right-0 md:left-12 md:right-auto md:bottom-auto md:top-[120px] md:h-fit md:max-h-[calc(100vh-140px)] md:w-[450px] bg-white rounded-t-3xl md:rounded-3xl shadow-[0_-5px_30px_rgba(0,0,0,0.2)] md:shadow-2xl md:border border-gray-100 overflow-hidden w-full"
      >
        <LookingForDriver
          pickup={pickup}
          fare={fare}
          vehicleType={vehicleType}
          destination={destination}
          setIsSearchingPanelOpen={setIsSearchingPanelOpen}
          setIsVehicleSearchOpen={setIsVehicleSearchOpen}
        />
      </div>

      {/* Waiting for Driver Panel — always mounted, shown via state */}
      <div
        style={{ display: isDriverWaitingOpen ? "block" : "none" }}
        className="fixed z-50 bottom-0 left-0 right-0 md:left-12 md:right-auto md:bottom-auto md:top-[120px] md:h-fit md:max-h-[calc(100vh-140px)] md:w-[450px] bg-white rounded-t-3xl md:rounded-3xl shadow-[0_-5px_30px_rgba(0,0,0,0.2)] md:shadow-2xl md:border border-gray-100 overflow-hidden w-full"
      >
        <WaitingForDriver
          socket={socket}
          rideData={rideData}
          setIsDriverWaitingOpen={setIsDriverWaitingOpen}
          setIsRideAccepted={setIsRideAccepted}
        />
      </div>

      {/* Floating button to check the current ride (accepted, waiting for driver) */}
      {isRideAccepted && !isDriverWaitingOpen && (
        <button
          onClick={() => setIsDriverWaitingOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-black hover:bg-gray-800 text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-105"
          title="Show Ride Info"
        >
          <i className="ri-car-fill text-2xl"></i>
        </button>
      )}

      {/* Resume Ride banner for ongoing rides — no forced redirect */}
      {activeOngoingRide && !isRideAccepted && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-0 md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:w-auto">
          <button
            onClick={() => navigate("/riding", { state: { ride: activeOngoingRide } })}
            className="w-full md:w-auto flex items-center justify-between gap-4 bg-black text-white px-6 py-4 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:bg-gray-800 transition-all duration-300 group"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <i className="ri-car-fill text-xl"></i>
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-black"></div>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold">Ride in progress</p>
                <p className="text-xs text-gray-400">
                  {activeOngoingRide?.destination?.address
                    ? `To: ${activeOngoingRide.destination.address.substring(0, 35)}...`
                    : "Tap to view your ride"}
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
    </div>
  );
}

export default Home;
