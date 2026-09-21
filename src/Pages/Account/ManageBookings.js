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

// Drops a trailing ".00" so a whole-dollar amount reads as "$1" rather
// than "$1.00", matching the app's own display.
function formatMoney(amount) {
  return Number.isInteger(amount) ? `${amount}` : amount.toFixed(2);
}

const FILTERS = ["All", "Booked", "Completed", "Cancelled"];

export default function ManageBookings() {
  const navigate = useNavigate();
  const { user, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);

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

  const visibleBookings =
    filter === "All" ? bookings : bookings.filter((b) => (b.status || "").toLowerCase() === filter.toLowerCase());

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
        <div className="booking-list-filter-row">
          <div className="booking-list-filter">
            <button type="button" onClick={() => setFilterOpen((v) => !v)}>
              {filter}
              <span className="booking-list-filter-caret">▾</span>
            </button>
            {filterOpen && (
              <div className="booking-list-filter-menu">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      setFilter(f);
                      setFilterOpen(false);
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <p className="loading-text">Loading your bookings...</p>
        ) : error ? (
          <p className="error-text">{error}</p>
        ) : visibleBookings.length === 0 ? (
          <p className="help-text">
            {bookings.length === 0 ? "You haven't rented a spot yet." : "No bookings match that filter."}
          </p>
        ) : (
          <div className="booking-list">
            {visibleBookings.map((b) => (
              <div
                key={b.id}
                className="booking-list-item"
                onClick={() => b.spotId && navigate(`/account/bookings/${b.spotId}`)}
              >
                <div className="booking-list-top-row">
                  <p className="booking-list-title">{b.spotTitle}</p>
                  <div className="booking-list-top-right">
                    <span className="booking-list-amount">${formatMoney(b.amount)}</span>
                    <span className={`booking-list-status ${(b.status || "").toLowerCase()}`}>
                      {b.status || "Booked"}
                    </span>
                  </div>
                </div>
                <p className="booking-list-sub">
                  {formatDateTime(b.startTime)} – {formatDateTime(b.endTime)}
                </p>
                <div className="booking-list-divider" />
                <button
                  type="button"
                  className="booking-list-rebook-btn"
                  disabled={!b.spotId}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (b.spotId) navigate(`/r/spot/${b.spotId}`);
                  }}
                >
                  Rebook
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
