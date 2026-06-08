import React, { useContext } from "react";
import { CaptainDataContext } from "../Context/CaptainContext";
import { useNavigate } from "react-router-dom";

function CaptainDetails({ stats, isCaptainDetailLoading }) {
  const { captain } = useContext(CaptainDataContext);
  const navigate = useNavigate();

  const vehicleType = captain?.vehicle?.vehicleType || "car";
  const vehicleIcon =
    vehicleType === "motorcycle"
      ? "ri-motorbike-fill"
      : vehicleType === "auto"
      ? "ri-taxi-fill"
      : "ri-car-fill";

  if (isCaptainDetailLoading) {
    return (
      <div className="p-6 flex items-center justify-center gap-3 text-gray-500">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        <span className="text-sm font-medium">Loading...</span>
      </div>
    );
  }

  return (
    <div className="px-5 pb-8 pt-4">
      {/* ── Captain Profile Row ──────────────── */}
      <div className="flex items-center justify-between pb-5 border-b border-gray-100">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center border-2 border-white shadow-md">
              <i className="ri-steering-fill text-2xl text-green-600"></i>
            </div>
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div>
            <h4 className="text-base font-black text-gray-900 tracking-tight leading-tight">
              {captain?.fullName?.firstName || "Captain"}{" "}
              {captain?.fullName?.lastName || ""}
            </h4>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="flex items-center gap-0.5 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                <i className="ri-star-fill text-[10px]"></i>
                <span>4.8</span>
              </div>
              <span className="text-gray-300 text-xs">•</span>
              <span className="text-xs font-semibold text-gray-500 capitalize tracking-wide">
                {vehicleType} Captain
              </span>
            </div>
          </div>
        </div>
        <div className="text-right bg-green-50/70 border border-green-100 px-3.5 py-2 rounded-2xl">
          <p className="text-[9px] font-bold text-green-700 uppercase tracking-widest leading-none mb-1">
            Today
          </p>
          <p className="text-xl font-black text-green-800 tracking-tight leading-none">
            ₹{stats?.totalEarnings || 0}
          </p>
        </div>
      </div>

      {/* ── Stats Grid ────────────────────────── */}
      <div className="grid grid-cols-3 gap-3.5 py-5 border-b border-gray-100">
        <div className="text-center py-3.5 bg-gray-50/80 rounded-2xl border border-gray-100 hover:bg-gray-100/55 transition-colors">
          <p className="text-xl font-extrabold text-gray-900 tracking-tight">
            {stats?.totalRides || 0}
          </p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">
            Rides
          </p>
        </div>
        <div className="text-center py-3.5 bg-gray-50/80 rounded-2xl border border-gray-100 hover:bg-gray-100/55 transition-colors">
          <p className="text-xl font-extrabold text-gray-900 tracking-tight">8.5</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">
            Hours
          </p>
        </div>
        <div className="text-center py-3.5 bg-gray-50/80 rounded-2xl border border-gray-100 hover:bg-gray-100/55 transition-colors">
          <p className="text-xl font-extrabold text-gray-900 tracking-tight">4.8</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">
            Rating
          </p>
        </div>
      </div>

      {/* ── Vehicle Info ──────────────────────── */}
      <div className="my-5 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white border border-gray-100 rounded-xl flex items-center justify-center shadow-xs">
            <i className={`${vehicleIcon} text-2xl text-gray-800`}></i>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-gray-900 capitalize tracking-tight">
              {vehicleType} Details
            </p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">
              {captain?.vehicle?.color ? `${captain.vehicle.color} Color` : "Color unspecified"}
            </p>
          </div>
        </div>
        <div className="bg-gray-950 text-white text-[11px] font-black px-3.5 py-2 rounded-xl tracking-widest uppercase shadow-md shadow-black/10 select-all font-mono">
          {captain?.vehicle?.plate || "—"}
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────── */}
      <div className="grid grid-cols-2 gap-3.5 pt-2">
        <button
          onClick={() => navigate("/captain-settings")}
          className="flex items-center justify-center gap-2 py-3.5 bg-gray-100 hover:bg-gray-200/80 active:scale-95 rounded-xl text-sm font-bold text-gray-800 transition-all cursor-pointer border border-gray-200"
        >
          <i className="ri-settings-3-fill text-base text-gray-600"></i>
          Settings
        </button>
        <button
          onClick={() => navigate("/captain-history")}
          className="flex items-center justify-center gap-2 py-3.5 bg-gray-100 hover:bg-gray-200/80 active:scale-95 rounded-xl text-sm font-bold text-gray-800 transition-all cursor-pointer border border-gray-200"
        >
          <i className="ri-history-fill text-base text-gray-600"></i>
          History
        </button>
      </div>
    </div>
  );
}

export default CaptainDetails;
