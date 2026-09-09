import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../images/logo.png";
import { useAuth } from "../../context/AuthContext";
import { getMyBookings, getSpot } from "../../api/client";
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
  const [expandedId, setExpandedId] = useState(null);
  // spotId -> { photo, address } | "loading" | "error"
  const [spotDetails, setSpotDetails] = useState({});

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

  const toggleExpand = (booking) => {
    const nextId = expandedId === booking.id ? null : booking.id;
    setExpandedId(nextId);
    if (nextId && booking.spotId && !spotDetails[booking.spotId]) {
      setSpotDetails((prev) => ({ ...prev, [booking.spotId]: "loading" }));
      getSpot(booking.spotId)
        .then(({ spot, address }) => {
          setSpotDetails((prev) => ({
            ...prev,
            [booking.spotId]: spot
              ? {
                  photo: spot.photos?.[0] || null,
                  address: address ? `${address.line1}, ${address.city}, ${address.state} ${address.zip}` : "",
                }
              : "error",
          }));
        })
        .catch(() => setSpotDetails((prev) => ({ ...prev, [booking.spotId]: "error" })));
    }
  };

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
            {bookings.map((b) => {
              const detail = b.spotId ? spotDetails[b.spotId] : null;
              return (
                <div key={b.id} className="booking-list-item" onClick={() => toggleExpand(b)}>
                  <p className="booking-list-title">{b.spotTitle}</p>
                  <p className="booking-list-sub">
                    {formatDateTime(b.startTime)} – {formatDateTime(b.endTime)}
                  </p>
                  <div className="booking-list-row">
                    <span className={`booking-list-status ${(b.status || "").toLowerCase()}`}>{b.status || "Booked"}</span>
                    <span className="booking-list-amount">${b.amount.toFixed(2)}</span>
                  </div>
                  {expandedId === b.id && (
                    <div className="booking-list-detail">
                      {detail === "loading" ? (
                        <p className="help-text" style={{ margin: 0 }}>
                          Loading spot details...
                        </p>
                      ) : detail === "error" || !detail ? (
                        <p className="help-text" style={{ margin: 0 }}>
                          Couldn't load this spot's details.
                        </p>
                      ) : (
                        <>
                          {detail.photo && <img src={detail.photo} alt={b.spotTitle} />}
                          <div className="booking-list-detail-text">
                            <p className="booking-list-detail-address">{detail.address || b.spotTitle}</p>
                            <p>
                              {formatDateTime(b.startTime)} – {formatDateTime(b.endTime)}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
