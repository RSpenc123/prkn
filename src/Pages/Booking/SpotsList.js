import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BookingLayout from "./BookingLayout";
import { useBooking } from "../../context/BookingContext";
import { getSpotsByAddress } from "../../api/client";

// Entry point for the QR code: /r/:addressId
// Shows every spot listed at this address so the guest can pick one.
export default function SpotsList() {
  const { addressId } = useParams();
  const navigate = useNavigate();
  const { update } = useBooking();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [address, setAddress] = useState(null);
  const [spots, setSpots] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getSpotsByAddress(addressId)
      .then(({ address, spots }) => {
        if (cancelled) return;
        setAddress(address);
        setSpots(spots);
        setLoading(false);
        update({ addressId, address });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Couldn't load spots for this address.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressId]);

  const selectSpot = (spot) => {
    if (spot.status !== "available") return;
    navigate(`/r/${addressId}/${spot.id}`);
  };

  return (
    <BookingLayout title="Available Spots" step={1} onBack={() => navigate("/")}>
      {loading ? (
        <p className="loading-text">Loading spots...</p>
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : (
        <>
          <p className="booking-address">
            {address
              ? `${address.line1}, ${address.city}, ${address.state} ${address.zip}`
              : "Address"}
          </p>
          <div className="spot-card-list">
            {spots.map((spot) => (
              <button
                key={spot.id}
                type="button"
                className={`spot-card ${spot.status !== "available" ? "unavailable" : ""}`}
                onClick={() => selectSpot(spot)}
                disabled={spot.status !== "available"}
              >
                <img className="spot-card-photo" src={spot.photos[0]} alt={spot.title} />
                <div className="spot-card-info">
                  <p className="spot-card-title">{spot.title}</p>
                  <span className={`spot-status ${spot.status}`}>
                    {spot.status === "available" ? "Available" : "Booked"}
                  </span>
                  <p className="spot-card-price">${spot.pricePerHour}/hr</p>
                </div>
              </button>
            ))}
            {spots.length === 0 && <p className="loading-text">No spots found at this address.</p>}
          </div>
        </>
      )}
    </BookingLayout>
  );
}
