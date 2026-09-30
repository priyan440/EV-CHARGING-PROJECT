import React from "react";
import RealtimeBookingsManager from "../../components/owner/RealtimeBookingsManager";

export default function OwnerBookings() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <RealtimeBookingsManager
        showStats={true}
        title="Owner Bookings & Real-Time Dispatch"
      />
    </div>
  );
}
