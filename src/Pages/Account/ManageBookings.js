import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../images/logo.png";
import { useAuth } from "../../context/AuthContext";
import { getMyBookings } from "../../api/client";
import "../Booking/booking.css";
import "./account.css";

function formatDateTime(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ManageBookings() {
  const navigate = useNavigate();
  const { user, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (!isSignedIn) {
      navigate("/signin");
      return;
    }
    let cancelled = false;
    getMyBookings({ token: user.token })
      .then((list) => {
        if (cancelled) return;
        // Most recent first.
        setBookings([...list].sort((a, b) => (b.startTime || 0) - (a.startTime || 0)));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Couldn't load your bookings.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  if (!isSignedIn) return null;

  return (
    <div className="booking-page">
      <div className="booking-header">
        <button className="booking-back" aria-label="Back" onClick={() => navigate("/")}>
          ←
        </button>
        <img className="booking-logo" src={logo} alt="PRK'n" />
        <h1 className="booking-header-title">Manage Bookings</h1>
      </div>
      <div className="booking-content">
        {loading ? (
          <p className="loading-text">Loading your bookings...</p>
        ) : error ? (
          <p className="error-text">{error}</p>
        ) : bookings.length === 0 ? (
          <p className="help-text">You haven't rented a spot yet.</p>
        ) : (
          <div className="booking-list">
            {bookings.map((b) => (
              <div key={b.id} className="booking-list-item">
                <p className="booking-list-title">{b.spotTitle}</p>
                <p className="booking-list-sub">
                  {formatDateTime(b.startTime)} – {formatDateTime(b.endTime)}
                </p>
                <div className="booking-list-row">
                  <span className={`booking-list-status ${(b.status || "").toLowerCase()}`}>{b.status || "Booked"}</span>
                  <span className="booking-list-amount">${b.amount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
