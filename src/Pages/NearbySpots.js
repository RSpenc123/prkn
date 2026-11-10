import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import BookingLayout from "./Booking/BookingLayout";
import { getNearbySpotsById } from "../api/client";

function formatDistance(meters) {
  const miles = meters / 1609.34;
  if (miles < 0.1) return `${Math.round(meters * 3.28084)} ft away`;
  return `${miles.toFixed(1)} mi away`;
}

// Spots can share a street address (one host, multiple spots at the same
// lot) — group by that address so the overview reads as one card per
// location instead of one card per spot, same as the QR-code address page
// does once you're inside a specific address.
function groupByAddress(spots) {
  const groups = new Map();
  for (const spot of spots) {
    const key = (spot.title || "").trim().toLowerCase() || spot.addressId;
    if (!groups.has(key)) {
      groups.set(key, {
        addressId: spot.addressId,
        line1: spot.title,
        photo: spot.photos?.[0],
        distanceMeters: spot.distanceMeters,
        minPrice: null,
        spotCount: 0,
      });
    }
    const group = groups.get(key);
    group.spotCount += 1;
    group.distanceMeters = Math.min(group.distanceMeters, spot.distanceMeters);
    if (spot.pricePerHour > 0 && (group.minPrice === null || spot.pricePerHour < group.minPrice)) {
      group.minPrice = spot.pricePerHour;
    }
  }
  return Array.from(groups.values()).sort((a, b) => a.distanceMeters - b.distanceMeters);
}

// Entry point for the home page's destination search: /near/:searchId.
// Unlike /r/:addressId (the QR-code / exact-address page), this shows every
// address with spots within a mile of the searched point, each labeled with
// its distance — picking one hands off to the exact same /r/:addressId page
// QR codes use, so that page's address-matching/sorting logic is untouched
// and reused as-is.
export default function NearbySpots() {
  const { searchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const label = location.state?.label || "";
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    // The search box already ran this same search and hands its result
    // forward via navigation state — reuse it instead of hitting the
    // (slow) search endpoint again. A direct link or refresh won't have
    // that state, so it falls back to re-running the search from the URL.
    const preloaded = location.state?.spots;
    const fetchSpots = preloaded
      ? Promise.resolve({ spots: preloaded })
      : getNearbySpotsById(searchId);
    fetchSpots
      .then(({ spots }) => {
        if (cancelled) return;
        setGroups(groupByAddress(spots || []));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Couldn't load nearby spots.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchId]);

  const selectAddress = (group) => {
    // No preloaded state passed here on purpose — /r/:addressId's own
    // getSpotsByAddress call already does the correct same-address
    // scoping (and gets the full address: city/state/zip, which this
    // overview doesn't carry), so it re-fetches fresh rather than being
    // handed a partial result from here.
    navigate(`/r/${group.addressId}`);
  };

  return (
    <BookingLayout title="Spots" step={1} onBack={() => navigate("/")}>
      {loading ? (
        <p className="loading-text">Loading nearby spots...</p>
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : (
        <>
          <p className="booking-address">
            {label ? `Spots within 1 mile of ${label}` : "Spots within 1 mile"}
          </p>
          <div className="spot-card-list">
            {groups.map((group) => (
              <button
                key={group.addressId}
                type="button"
                className="spot-card"
                onClick={() => selectAddress(group)}
              >
                {group.photo && <img className="spot-card-photo" src={group.photo} alt={group.line1} />}
                <div className="spot-card-body">
                  <p className="spot-card-title">{group.line1 || "Parking"}</p>
                  <div className="spot-card-meta-row">
                    <span className="spot-card-meta">
                      <span className="spot-card-meta-icon">📍</span>
                      {formatDistance(group.distanceMeters)}
                    </span>
                    <span className="spot-card-meta">
                      <span className="spot-card-meta-icon">$</span>
                      {group.minPrice > 0 ? `From $${group.minPrice}/hr` : "See pricing"}
                    </span>
                  </div>
                  <div className="spot-card-status-row">
                    <span className="spot-status available">
                      {group.spotCount} spot{group.spotCount === 1 ? "" : "s"} available
                    </span>
                  </div>
                </div>
              </button>
            ))}
            {groups.length === 0 && (
              <p className="loading-text">No spots found within a mile of that location yet.</p>
            )}
          </div>
        </>
      )}
    </BookingLayout>
  );
}
