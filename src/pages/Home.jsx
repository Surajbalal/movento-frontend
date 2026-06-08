import React, { useRef, useState, useEffect, useContext } from "react";
import logo from "../assets/movento-logo.png";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import "remixicon/fonts/remixicon.css";
import LocationSearchPanel from "../Components/LocationSearchPanel";
import VehicalPanel from "../Components/VehicalPanel";
import Searching from "../Components/Searching";
import LookingForDriver from "../Components/LookingForDriver";
import { UserDataContext } from "../Context/UserContext";
import { SocketContext } from "../Context/SocketContext";
import { AuthContext } from "../Context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
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

  // State for passenger's recent rides
  const [recentRides, setRecentRides] = useState([]);

  const token = localStorage.getItem("token");

  // Fetch recent rides when token changes
  useEffect(() => {
    if (!token) {
      setRecentRides([]);
      return;
    }
    const fetchRecentRides = async () => {
      try {
        const response = await axiosInstance.get("/rides/my-rides");
        if (response.status === 200) {
          const allRides = response.data.rides || response.data || [];
          setRecentRides(allRides.slice(0, 3));
        }
      } catch (error) {
        console.error("Failed to fetch recent rides:", error);
      }
    };
    fetchRecentRides();
  }, [token]);

  const handleRecentRideClick = (ride) => {
    if (ride.pickup?.address) {
      setpickup(ride.pickup.address);
    } else if (typeof ride.pickup === "string") {
      setpickup(ride.pickup);
    }
    if (ride.destination?.address) {
      setDestination(ride.destination.address);
    } else if (typeof ride.destination === "string") {
      setDestination(ride.destination);
    }
  };

  // Open AuthModal helpers for navbar
  const openAuthModal = (tab = "login") => {
    setAuthModalRole("user");
    setAuthModalTab(tab);
    setShowAuthModal(true);
  };

  const [isVehicalPanelOpen, setIsVehicalPanelOpen] = useState(false);

  // Fetch active ride only if authenticated — Redirect to Riding if accepted or ongoing
  useEffect(() => {
    if (!token) return; // Skip for unauthenticated users

    const fetchRide = async () => {
      try {
        const response = await axiosInstance.get("/rides/get-ride");
        if (!response.data?._id) return;

        if (response.data.status === "accepted" || response.data.status === "ongoing") {
          navigate("/riding", { state: { ride: response.data } });
          return;
        }
        if (response.data.status === "pending") {
          setRideData(response.data);
          setpickup(response.data.pickup?.address || response.data.pickup);
          setDestination(response.data.destination?.address || response.data.destination);
          setVehicleType(response.data.vehicleType);
          setIsVehicleSearchOpen(true);
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

      setRideData(ride);

      setIsVehicalPanelOpen(false);
      setIsSearchingPanelOpen(false);
      setIsVehicleSearchOpen(false);

      // Redirect immediately to Riding page
      navigate("/riding", { state: { ride } });
    };

    const handleRideCancelled = (data) => {
      console.log("ride-cancelled received", data);
      setRideData({});
      setIsVehicleSearchOpen(false);
      setIsVehicalPanelOpen(false);
      setIsPanelOpen(false);
      alert(`Ride cancelled because of: ${data.reason}` || `Ride Cancelled`);
    };

    socket.on("ride-ended", (data) => {
      console.log(" ride-ended received", data);
      setRideData({});
      setIsVehicleSearchOpen(false);
      setIsVehicalPanelOpen(false);
      setIsPanelOpen(false);
      alert(data.message);
    });
    socket.on("ride-confirm", handleRideConfirm);
    socket.on("ride-cancelled", handleRideCancelled);

    // cleanup (VERY IMPORTANT)
    return () => {
      socket.off("ride-confirm", handleRideConfirm);
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

  // Close suggestions panel on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [panelRef]);

  // Determine if user is authenticated for UI rendering
  const isAuthenticated = isUserAuthenticated();
  const showMap = !!fare.car || (rideData && !!rideData._id);

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

      {!showMap ? (
        /* Structure B: Premium Landing Layout */
        <div className="flex-1 overflow-y-auto bg-gray-50 pt-[72px] md:pt-0 w-full relative pointer-events-auto">
          <div className="max-w-6xl mx-auto px-4 py-8 md:py-16 flex flex-col gap-12">
            
            {/* Section 1: Hero & Search Form */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-gray-100">
              
              {/* Left Column: Hero Text & Inputs */}
              <div className="md:col-span-7 flex flex-col gap-6 relative">
                <div>
                  <span className="bg-black text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                    Ride with Movento
                  </span>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-none mt-4">
                    Go anywhere with <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500">Movento</span>
                  </h1>
                  <p className="text-gray-500 text-sm md:text-base mt-2 max-w-md">
                    Request a ride now or schedule for later. Safe, affordable outstation and city travels.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={submitHandler} className="w-full relative flex flex-col gap-4">
                  <div className="flex flex-col gap-3 relative">
                    {/* Connecting Line */}
                    <div className="absolute left-[20px] top-6 bottom-6 w-[2px] bg-black z-20 hidden md:block"></div>
                    <div className="absolute left-[18px] top-6 bottom-6 w-0.5 bg-gray-300 z-10 md:hidden"></div>

                    {/* Pickup Field */}
                    <div className="relative w-full group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30">
                        <div className="w-2.5 h-2.5 bg-black rounded-full shadow-sm"></div>
                      </div>
                      <input
                        value={pickup}
                        onClick={() => {
                          setIsPanelOpen(true);
                          setActiveField("pickup");
                          setIsLocationSelected(false);
                        }}
                        onChange={(e) => setpickup(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-base text-gray-900 border border-gray-200 placeholder-gray-505 focus:bg-white focus:border-black focus:outline-none transition-all duration-200"
                        type="text"
                        placeholder="Enter pickup location"
                        autoComplete="off"
                      />
                    </div>

                    {/* Destination Field */}
                    <div className="relative w-full group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30">
                        <div className="w-2.5 h-2.5 bg-black rounded-sm shadow-sm"></div>
                      </div>
                      <input
                        onClick={() => {
                          setIsPanelOpen(true);
                          setActiveField("destination");
                          setIsLocationSelected(false);
                        }}
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-base text-gray-900 border border-gray-200 placeholder-gray-505 focus:bg-white focus:border-black focus:outline-none transition-all duration-200"
                        type="text"
                        placeholder="Enter dropoff location"
                        autoComplete="off"
                      />
                    </div>

                    {/* Location Panel - Dropdown absolute */}
                    {isPanelOpen && (
                      <div
                        ref={panelRef}
                        className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
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
                            setIsPanelOpen(false); // Close suggestions panel on selection!
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSeePrices}
                    className={`w-full py-4 bg-black hover:bg-gray-800 text-white font-bold rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-black/10 flex items-center justify-center gap-2 ${
                      (!pickup || !destination) ? "opacity-50 cursor-not-allowed" : "active:scale-[0.98]"
                    }`}
                    disabled={!pickup || !destination}
                  >
                    <span>See Prices</span>
                    <i className="ri-arrow-right-line"></i>
                  </button>
                </form>
              </div>

              {/* Right Column: Premium Hero Graphic / Card */}
              <div className="md:col-span-5 hidden md:block">
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col justify-end p-8 text-white shadow-md">
                  <div className="absolute top-0 right-0 p-6 opacity-20">
                    <i className="ri-roadster-fill text-[120px]"></i>
                  </div>
                  <div className="z-10">
                    <h3 className="text-2xl font-bold mb-2">Intercity Travel</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Travel between cities with premium vehicles and expert captains. Fast booking and live route tracking.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Recent Rides (conditional on auth & availability) */}
            {isAuthenticated && recentRides.length > 0 && (
              <div className="flex flex-col gap-4">
                <h2 className="text-xl font-bold text-gray-950 flex items-center gap-2">
                  <i className="ri-history-line text-gray-500"></i>
                  <span>Recent Rides</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recentRides.map((ride) => (
                    <div
                      key={ride._id}
                      onClick={() => handleRecentRideClick(ride)}
                      className="bg-white p-5 rounded-2xl border border-gray-150 hover:border-black cursor-pointer shadow-xs transition-all hover:shadow-md active:scale-[0.99] flex flex-col justify-between"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <div className="w-px h-4 bg-gray-200"></div>
                            <div className="w-2 h-2 rounded-sm bg-gray-900"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">
                              {ride.pickup?.address || ride.pickup || "Pickup"}
                            </p>
                            <p className="text-xs text-gray-500 truncate mt-1">
                              {ride.destination?.address || ride.destination || "Destination"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 text-xs">
                        <span className="text-gray-400 capitalize">{ride.vehicleType || "Ride"}</span>
                        <span className="font-bold text-gray-900">₹{ride.fare}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 3: Promotional Banner */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                  <i className="ri-coupon-2-fill"></i>
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold">Intercity Special Offer</h3>
                  <p className="text-white/80 text-sm mt-1">Get 20% off your first Intercity ride! Valid for limited time.</p>
                </div>
              </div>
              <div className="bg-white text-orange-600 font-black px-6 py-3 rounded-xl tracking-wider text-sm md:text-base shadow-sm">
                MOVENTO20
              </div>
            </div>

            {/* Section 4: Value Prop Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-3">
                <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center text-xl">
                  <i className="ri-roadster-fill"></i>
                </div>
                <h3 className="text-base font-bold text-gray-900 mt-2">Ride Anywhere</h3>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Affordable cars, autos, and motorbikes at your doorstep. Move around the city or travel to another city with ease.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-3">
                <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center text-xl">
                  <i className="ri-time-fill"></i>
                </div>
                <h3 className="text-base font-bold text-gray-900 mt-2">Fast Pickup</h3>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Our captains arrive in minutes, ready to take you safely. No long waiting hours or sudden cancellations.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-3">
                <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center text-xl">
                  <i className="ri-shield-check-fill"></i>
                </div>
                <h3 className="text-base font-bold text-gray-900 mt-2">Safe & Secure</h3>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Verified drivers, live tracking, and secure OTP validation on every trip. Your safety is our absolute priority.
                </p>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* Structure A: Map and Active Panels (Original Layout) */
        <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1920px] mx-auto z-10 pointer-events-none md:pointer-events-auto h-full pt-[72px] md:pt-0">
          {/* Mobile background (Instead of Map) */}
          <div className="absolute inset-0 z-0 md:hidden bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 flex items-center justify-center">
            <div className="opacity-[0.03] transform scale-150 pointer-events-none">
              <i className="ri-roadster-fill text-[300px]"></i>
            </div>
          </div>

          {/* Left Side: Search Panel */}
          <div className="w-full md:w-[450px] lg:w-[500px] h-full flex flex-col justify-end md:justify-start pointer-events-none md:pt-16 md:pl-16 z-20">
            <div className="bg-white rounded-t-[2.5rem] md:rounded-none w-full p-6 md:p-0 pointer-events-auto transition-all shadow-[0_-12px_40px_rgba(0,0,0,0.12)] md:shadow-none pb-8 md:pb-0 relative border-t border-gray-100 md:border-t-0">
              {/* Drag Handle for Mobile Bottom Sheet */}
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5 md:hidden"></div>
              <button
                ref={panelCloseRef}
                onClick={() => {
                  setIsPanelOpen(false);
                  setfare({}); // go back to landing if closed
                }}
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
                    <div className="flex gap-3 mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsVehicalPanelOpen(true);
                        }}
                        className="flex items-center justify-center bg-black hover:bg-gray-800 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 active:scale-95 w-full md:w-40 cursor-pointer shadow-md shadow-black/10"
                      >
                        Choose vehicle
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setfare({});
                          setpickup("");
                          setDestination("");
                        }}
                        className="flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-black font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer shadow-xs"
                      >
                        Reset
                      </button>
                    </div>
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
                      setIsPanelOpen(false); // Close suggestions panel on selection!
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Premium Card (Instead of Map) */}
          <div className="hidden md:flex flex-1 p-6 md:pl-12 pb-12 z-0 items-center justify-center">
            <div className="w-full h-[85vh] rounded-[2.5rem] overflow-hidden shadow-lg relative bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col justify-between p-12 text-white border border-gray-800">
              {/* Decorative large icon background */}
              <div className="absolute right-0 bottom-0 p-8 opacity-10 pointer-events-none">
                <i className="ri-roadster-fill text-[300px]"></i>
              </div>
              
              {/* Header section inside the illustration */}
              <div className="z-10">
                <span className="bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider backdrop-blur-md">
                  Booking Status
                </span>
                <h2 className="text-4xl lg:text-5xl font-black mt-6 tracking-tight leading-none">
                  Ready to roll?
                </h2>
                <p className="text-gray-400 text-sm md:text-base mt-4 max-w-md leading-relaxed">
                  Select your vehicle, choose payment method, and confirm. Your map and driver tracking will load once a Captain accepts your ride.
                </p>
              </div>

              {/* Footer message / premium micro-animation indicator */}
              <div className="z-10 flex items-center gap-3 border-t border-white/10 pt-6">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Google Maps will activate post-match
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Side Panels - React state controls visibility (no GSAP to avoid conflicts) */}

      {/* Vehicle Selection Panel */}
      <div
        style={{ display: isVehicalPanelOpen ? "block" : "none" }}
        className="fixed z-50 bottom-0 left-0 right-0 md:left-12 md:right-auto md:bottom-auto md:top-[120px] md:h-fit md:max-h-[calc(100vh-140px)] md:w-[450px] bg-white rounded-t-3xl md:rounded-3xl shadow-[0_-5px_30px_rgba(0,0,0,0.2)] md:shadow-2xl overflow-y-auto w-full md:border border-gray-100"
      >
        <VehicalPanel
          fare={fare}
          setVehicleType={setVehicleType}
          setIsVehicalPanelOpen={(val) => {
            setIsVehicalPanelOpen(val);
            if (!val) {
              setfare({}); // Reset fare to return to landing page
            }
          }}
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

      {/* Waiting for Driver panel is handled on Riding.jsx */}

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
