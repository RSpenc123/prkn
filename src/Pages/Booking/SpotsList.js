import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import BookingLayout from "./BookingLayout";
import { useBooking } from "../../context/BookingContext";
import { getSpotsByAddress, getBookedRangesBatch, getSpot } from "../../api/client";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// The backend's own per-spot "Fully Booked" style status doesn't reliably
// reflect real bookings (see SpotDetail.js's note on the same issue), so
// this checks actual booked ranges directly instead: booked right now ->
// red "Currently Unavailable", booked at some other time -> yellow
// "Partially Available", nothing booked at all -> green "Available".
//
// Takes the already-fetched rangesByAvailabilityId map (one batch request
// for every spot's every slot, see the main effect below) instead of
// fetching per spot — a list of spots each with 30+ listed slots was
// otherwise making one HTTP request per slot, which is what made this page
// slow to load.
function computeBookingStatus(spot, rangesByAvailabilityId) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = todayStr();
  let anyBooking = false;
  let currentlyUnavailable = false;
  for (const a of spot.availability || []) {
    const ranges = rangesByAvailabilityId.get(a.availabilityId) || [];
    if (ranges.length) anyBooking = true;
    if (a.date === today && ranges.some((r) => nowMin >= r.startMin && nowMin < r.endMin)) {
      currentlyUnavailable = true;
    }
  }
  if (currentlyUnavailable) return "unavailable";
  if (anyBooking) return "partial";
  return "available";
}

// The search endpoint backing this list doesn't reliably return per-slot
// pricing (its availability projection is missing price/price_type — see
// the note in realClient.js), so a real spot's pricePerHour here is often
// 0 even though it does have a real price. getParkingDetail (what the
// detail page uses) doesn't have that gap, so for any spot missing a
// price here, re-fetch its real detail just for the price rather than
// showing a "see pricing" placeholder.
async function resolveListPrice(spot) {
  if (spot.pricePerHour > 0) return spot.pricePerHour;
  try {
    const { spot: detail } = await getSpot(spot.id);
    return detail?.pricePerHour || 0;
  } catch {
    return spot.pricePerHour || 0;
  }
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
  const location = useLocation();
  const { update } = useBooking();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [address, setAddress] = useState(null);
  const [spots, setSpots] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    // The address search on the landing page already ran this same search
    // and hands its result forward via navigation state — reuse it instead
    // of hitting the (slow) search endpoint again. A direct link (QR code,
    // refresh, bookmark) won't have that state, so it falls back to
    // fetching normally.
    const preloaded = location.state?.spots;
    const fetchSpots = preloaded
      ? Promise.resolve({ address: location.state.address, spots: preloaded })
      : getSpotsByAddress(addressId);
    fetchSpots
      .then(async ({ address, spots }) => {
        if (cancelled) return;
        const sorted = sortByLeadingNumber(spots);
        const allAvailabilityIds = sorted.flatMap((spot) => (spot.availability || []).map((a) => a.availabilityId));
        const rangesByAvailabilityId = await getBookedRangesBatch(allAvailabilityIds).catch(() => new Map());
        if (cancelled) return;
        const withBookingStatus = await Promise.all(
          sorted.map(async (spot) => {
            const pricePerHour = await resolveListPrice(spot);
            return { ...spot, bookingStatus: computeBookingStatus(spot, rangesByAvailabilityId), pricePerHour };
          })
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
