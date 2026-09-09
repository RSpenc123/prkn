import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BookingLayout from "./BookingLayout";
import { useBooking } from "../../context/BookingContext";
import { getSpotsByAddress, getBookedRanges } from "../../api/client";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// The backend's own per-spot "Fully Booked" style status doesn't reliably
// reflect real bookings (see SpotDetail.js's note on the same issue), so
// this checks actual booked ranges directly instead: booked right now ->
// red "Currently Unavailable", booked at some other time -> yellow
// "Partially Available", nothing booked at all -> green "Available".
async function computeBookingStatus(spot) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = todayStr();
  let anyBooking = false;
  let currentlyUnavailable = false;
  await Promise.all(
    (spot.availability || []).map(async (a) => {
      const ranges = await getBookedRanges(a.availabilityId).catch(() => []);
      if (ranges.length) anyBooking = true;
      if (a.date === today && ranges.some((r) => nowMin >= r.startMin && nowMin < r.endMin)) {
        currentlyUnavailable = true;
      }
    })
  );
  if (currentlyUnavailable) return "unavailable";
  if (anyBooking) return "partial";
  return "available";
}

// Hosts often title/describe spots like "Spot #1", "Spot #2 - near the
// entrance", etc. Sort by that leading number so the list reads in the
// order hosts intended rather than whatever order the database returns.
// Spots with no leading number sort after the numbered ones, in whatever
// order they arrived in.
function sortByLeadingNumber(spots) {
  const withIndex = spots.map((spot, index) => {
    const match = /(\d+)/.exec(spot.title || spot.description || "");
    return { spot, index, num: match ? parseInt(match[1], 10) : null };
  });
  withIndex.sort((a, b) => {
    if (a.num !== null && b.num !== null) return a.num - b.num;
    if (a.num !== null) return -1;
    if (b.num !== null) return 1;
    return a.index - b.index;
  });
  return withIndex.map((item) => item.spot);
}

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
      .then(async ({ address, spots }) => {
        if (cancelled) return;
        const sorted = sortByLeadingNumber(spots);
        const withBookingStatus = await Promise.all(
          sorted.map(async (spot) => ({ ...spot, bookingStatus: await computeBookingStatus(spot) }))
        );
        if (cancelled) return;
        setAddress(address);
        setSpots(withBookingStatus);
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
    <BookingLayout title="Spots" step={1} onBack={() => navigate("/")}>
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
                <div className="spot-card-body">
                  <p className="spot-card-title">{spot.title}</p>
                  <div className="spot-card-meta-row">
                    <span className="spot-card-meta">
                      <span className="spot-card-meta-icon">📍</span>
                      {address?.city || "—"}
                    </span>
                    <span className="spot-card-meta">
                      <span className="spot-card-meta-icon">$</span>
                      {spot.pricePerHour > 0 ? `${spot.pricePerHour}/hr` : "See pricing"}
                    </span>
                  </div>
                  <div className="spot-card-status-row">
                    <span className={`spot-status ${spot.bookingStatus || "available"}`}>
                      {spot.bookingStatus === "unavailable"
                        ? "Currently Unavailable"
                        : spot.bookingStatus === "partial"
                        ? "Partially Available"
                        : "Available"}
                    </span>
                  </div>
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
