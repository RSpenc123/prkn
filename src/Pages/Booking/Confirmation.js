import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BookingLayout from "./BookingLayout";
import { useBooking } from "../../context/BookingContext";
import { IS_MOCK } from "../../api/client";

function formatTime(t) {
  const [h, m] = t.split(":").map(Number);
  return new Date(0, 0, 0, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function Confirmation() {
  const { addressId } = useParams();
  const navigate = useNavigate();
  const { spot, address, date, startTime, endTime, user, booking, reset } = useBooking();
  const [copied, setCopied] = useState(false);

  if (!booking) {
    navigate(`/r/${addressId}`);
    return null;
  }

  const handleDone = () => {
    reset();
    navigate("/");
  };

  const addressText = address ? `${address.line1}, ${address.city}, ${address.state} ${address.zip}` : "";

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(addressText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked (permissions, non-HTTPS, etc.) —
      // fail quietly rather than showing a scary error for a nice-to-have.
    }
  };

  return (
    <BookingLayout title="Confirmed" step={6} onBack={handleDone}>
      <div className="confirmation-check">✓</div>
      <h2 className="confirmation-title">You're all set!</h2>
      <p className="confirmation-sub">
        {IS_MOCK ? (
          <>
            Confirmation #{booking.confirmationCode} — a confirmation was texted/emailed to {user?.contact}.{" "}
            <span className="stub-badge">Demo</span>
          </>
        ) : (
          <>Confirmation #{booking.confirmationCode} — booked for {user?.contact}.</>
        )}
      </p>

      <div className="summary-card">
        <div className="summary-row">
          <span>{spot?.title}</span>
        </div>
        <div className="summary-row confirmation-address-row">
          <span>{addressText}</span>
          {addressText && (
            <button type="button" className="copy-address-btn" onClick={handleCopyAddress}>
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
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
