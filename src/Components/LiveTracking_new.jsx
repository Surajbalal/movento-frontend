import { useMemo } from "react";
import CaptainRiding from "./CaptainRiding_new";
import UserRiding from "./UserRiding";

export default function LiveTracking({ rideData = null, role = "captain" }) {
  // Clean role-based component selection
  const Component = useMemo(() => {
    return role === "captain" ? CaptainRiding : UserRiding;
  }, [role]);

  return <Component rideData={rideData} />;
}
