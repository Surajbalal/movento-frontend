import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-blue-100 text-blue-700",
  ongoing: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
};

const PAYMENT_COLORS = {
  pending: "text-amber-600",
  paid: "text-emerald-600",
  failed: "text-red-600",
};

function formatDate(dateStr) {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;

  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function MyRides() {
  const [rides, setRides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRides = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await axiosInstance.get("/rides/my-rides");
        if (response.status === 200) {
          setRides(response.data.rides || response.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch rides:", err);
        setError(
          err.response?.status === 404
            ? "My Rides API not available yet. Please add GET /rides/my-rides endpoint."
            : "Failed to load rides. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchRides();
  }, []);

  const filteredRides = rides.filter((ride) => {
    if (activeTab === "all") return true;
    if (activeTab === "active")
      return ["pending", "accepted", "ongoing"].includes(ride.status);
    if (activeTab === "completed") return ride.status === "completed";
    if (activeTab === "cancelled") return ride.status === "cancelled";
    return true;
  });

  const tabs = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
  ];

  const handleRideClick = (ride) => {
    if (["pending", "accepted", "ongoing"].includes(ride.status)) {
      navigate("/riding", { state: { ride } });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ═══ HEADER ═══ */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            >
              <i className="ri-arrow-left-line text-xl text-gray-700"></i>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">My Rides</h1>
          </div>
        </div>

        {/* ═══ TAB BAR ═══ */}
        <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 animate-pulse border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-16 h-5 bg-gray-200 rounded-full"></div>
                  <div className="flex-1"></div>
                  <div className="w-12 h-5 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-3xl text-red-500"></i>
            </div>
            <p className="text-sm text-gray-600 max-w-xs mx-auto">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filteredRides.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-car-line text-3xl text-gray-400"></i>
            </div>
            <p className="text-lg font-semibold text-gray-800 mb-1">
              No rides yet
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {activeTab === "all"
                ? "Your ride history will appear here."
                : `No ${activeTab} rides found.`}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              <i className="ri-car-fill"></i>
              Book a Ride
            </Link>
          </div>
        )}

        {/* Ride list */}
        {!isLoading && !error && filteredRides.length > 0 && (
          <div className="space-y-3">
            {filteredRides.map((ride) => (
              <div
                key={ride._id}
                onClick={() => handleRideClick(ride)}
                className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm transition-all ${
                  ["pending", "accepted", "ongoing"].includes(ride.status)
                    ? "cursor-pointer hover:shadow-md hover:border-gray-200 active:scale-[0.99]"
                    : ""
                }`}
              >
                {/* Top row: status + date + fare */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        STATUS_COLORS[ride.status] || STATUS_COLORS.pending
                      }`}
                    >
                      {ride.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(ride.createdAt)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-gray-900">
                      ₹{ride.fare || "--"}
                    </p>
                  </div>
                </div>

                {/* Trip timeline */}
                <div className="flex items-start gap-2.5">
                  <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div className="w-px h-5 bg-gray-200"></div>
                    <div className="w-2 h-2 rounded-sm bg-gray-900"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 line-clamp-1 mb-1">
                      {ride.pickup?.address || "Pickup location"}
                    </p>
                    <p className="text-sm text-gray-800 line-clamp-1">
                      {ride.destination?.address || "Destination"}
                    </p>
                  </div>
                </div>

                {/* Bottom row: payment + resume */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <i
                      className={`text-sm ${
                        ride.payment?.status === "paid"
                          ? "ri-checkbox-circle-fill text-emerald-500"
                          : ride.payment?.status === "failed"
                          ? "ri-error-warning-fill text-red-500"
                          : "ri-time-fill text-amber-500"
                      }`}
                    ></i>
                    <span
                      className={`text-xs font-semibold capitalize ${
                        PAYMENT_COLORS[ride.payment?.status] || "text-gray-500"
                      }`}
                    >
                      {ride.payment?.status || "pending"}
                    </span>
                  </div>
                  {["pending", "accepted", "ongoing"].includes(ride.status) && (
                    <span className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                      Resume <i className="ri-arrow-right-s-line"></i>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyRides;
