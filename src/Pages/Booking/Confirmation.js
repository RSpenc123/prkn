import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import BookingLayout from "./BookingLayout";
import { useBooking } from "../../context/BookingContext";

function formatTime(t) {
  const [h, m] = t.split(":").map(Number);
  return new Date(0, 0, 0, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function Confirmation() {
  const { addressId } = useParams();
  const navigate = useNavigate();
  const { spot, address, date, startTime, endTime, user, booking, reset } = useBooking();

  if (!booking) {
    navigate(`/r/${addressId}`);
    return null;
  }

  const handleDone = () => {
    reset();
    navigate(`/r/${addressId}`);
  };

  return (
    <BookingLayout title="Confirmed" step={6} onBack={handleDone}>
      <div className="confirmation-check">✓</div>
      <h2 className="confirmation-title">You're all set!</h2>
      <p className="confirmation-sub">
        Confirmation #{booking.confirmationCode} — a confirmation was texted/emailed to{" "}
        {user?.contact}. <span className="stub-badge">Demo</span>
      </p>

      <div className="summary-card">
        <div className="summary-row">
          <span>{spot?.title}</span>
        </div>
        <div className="summary-row">
          <span>
            {address ? `${address.line1}, ${address.city}, ${address.state} ${address.zip}` : ""}
          </span>
        </div>
        <div className="summary-row">
          <span>{date}</span>
          <span>
            {formatTime(startTime)} – {formatTime(endTime)}
          </span>
        </div>
      </div>

      <button className="btn-primary" onClick={handleDone}>
        Done
      </button>
    </BookingLayout>
  );
}
