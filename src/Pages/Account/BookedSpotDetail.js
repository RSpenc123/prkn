import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import logo from "../../images/logo.png";
import { useAuth } from "../../context/AuthContext";
import { getMyBookings, getSpot } from "../../api/client";
import "../Booking/booking.css";
import "./account.css";

function formatDate(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTimeRange(startMs, endMs) {
  const fmt = (ms) => new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${fmt(startMs)} - ${fmt(endMs)}`;
}

export default function BookedSpotDetail() {
  const { spotId } = useParams();
  const navigate = useNavigate();
  const { user, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [spot, setSpot] = useState(null);
  const [address, setAddress] = useState(null);
  const [myBookingsForSpot, setMyBookingsForSpot] = useState([]);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (!isSignedIn) {
      navigate("/signin");
      return;
    }
    let cancelled = false;
    Promise.all([getSpot(spotId), getMyBookings({ token: user.token })])
      .then(([spotResult, allBookings]) => {
        if (cancelled) return;
        if (!spotResult.spot) {
          setError("Couldn't load this spot's details.");
        } else {
          setSpot(spotResult.spot);
          setAddress(spotResult.address);
          setMyBookingsForSpot(
            allBookings.filter((b) => b.spotId === spotId).sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
          );
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Couldn't load this spot's details.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, spotId]);

  if (!isSignedIn) return null;

  const fullAddress = address
    ? [address.line1, address.city, address.state && address.zip ? `${address.state} ${address.zip}` : address.state]
        .filter(Boolean)
        .join(", ")
    : spot?.title || "";

  const handleDirections = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`,
      "_blank",
      "noopener"
    );
  };

  return (
    <div className="booking-page">
      <div className="booking-header">
        <button className="booking-back" aria-label="Back" onClick={() => navigate(-1)}>
          ←
        </button>
        <img className="booking-logo" src={logo} alt="PRK'n" />
        <h1 className="booking-header-title">Booked spot details</h1>
      </div>
      <div className="booking-content">
        {loading ? (
          <p className="loading-text">Loading...</p>
        ) : error || !spot ? (
          <p className="error-text">{error || "Couldn't load this spot's details."}</p>
        ) : (
          <>
            {spot.photos && spot.photos.length > 0 && (
              <div className="spot-photo-carousel">
                <img className="spot-photo-main" src={spot.photos[photoIndex]} alt={spot.title} />
                {spot.photos.length > 1 && (
                  <div className="spot-photo-dots">
                    {spot.photos.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Photo ${i + 1}`}
                        className={`spot-photo-dot ${i === photoIndex ? "active" : ""}`}
                        onClick={() => setPhotoIndex(i)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="booked-detail-address-row">
              <p className="booked-detail-address">{fullAddress}</p>
              <button
                type="button"
                className="booked-detail-directions-btn"
                onClick={handleDirections}
                aria-label="Get directions"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="8 7 17 7 17 16" />
                </svg>
              </button>
            </div>

            <h3 className="booked-detail-section-title">Nearby Locations</h3>
            <p className="booked-detail-na">N/A</p>

            {spot.sizeTitle && (
              <div className="booked-detail-size-tag">
                <span className="spot-card-meta-icon">📏</span>
                {spot.sizeTitle}
              </div>
            )}

            <h3 className="booked-detail-section-title">Host Details</h3>
            <p className="booked-detail-host-name">{spot.host?.name || "Host"}</p>

            <h3 className="booked-detail-section-title">Description</h3>
            <p className="booked-detail-text">{spot.description || "No description provided."}</p>

            <h3 className="booked-detail-section-title">Gate codes/Special instructions</h3>
            <p className="booked-detail-na">N/A</p>

            <h3 className="booked-detail-section-title">Your Bookings</h3>
            <div className="booked-detail-bookings-list">
              {myBookingsForSpot.map((b) => (
                <div key={b.id} className="booked-detail-booking-card">
                  <div className="booked-detail-booking-row">
                    <span className="spot-card-meta-icon">📅</span>
                    {formatDate(b.startTime)}
                    <span className={`booking-list-status booked-detail-booking-status ${(b.status || "").toLowerCase()}`}>
                      {b.status || "Booked"}
                    </span>
                  </div>
                  <div className="booked-detail-booking-row">
                    <span className="spot-card-meta-icon">🕐</span>
                    {formatTimeRange(b.startTime, b.endTime)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
