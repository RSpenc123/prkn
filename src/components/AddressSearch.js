import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchAddress } from "../api/client";
import { loadGoogleMapsScript } from "../utils/googleMaps";
import "./AddressSearch.css";

// Landing-page entry point into the rental flow: type an address, jump to
// /r/:addressId which lists every spot at that address. Used on both the
// desktop Landing page and, styled differently via `className`, in place
// of the mobile page's first "Download here" button.
//
// Autocompletes as you type via Google Places (matching the mobile app),
// with a plain-text + geocode fallback if the Places script can't load
// (missing/misconfigured key) so the search box still works either way.
export default function AddressSearch({ className = "", placeholder = "Enter an address or place name" }) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const selectedCoordsRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMapsScript()
      .then((google) => {
        if (cancelled || !inputRef.current) return;
        // No `types` restriction — that's what limits suggestions to just
        // street addresses. Leaving it unset matches addresses, businesses
        // (restaurants, venues, etc.), and points of interest alike, same
        // as searching "Joe's Pizza" and getting its location.
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current);
        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current.getPlace();
          if (!place?.geometry) return;
          const coords = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
          selectedCoordsRef.current = coords;
          // A business's name ("Joe's Pizza") is a more useful label than
          // its bare street address once selected.
          const label = place.name || place.formatted_address || inputRef.current.value;
          setQuery(label);
          runSearch({ query: label, coords });
        });
      })
      .catch(() => {
        // Autocomplete just won't appear; manual submit still geocodes below.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = async ({ query: q, coords }) => {
    setSearching(true);
    setError("");
    try {
      const result = await searchAddress({ query: q, coords });
      if (!result) {
        setError("No spots found at that address yet.");
        return;
      }
      navigate(`/r/${result.addressId}`);
    } catch (err) {
      setError(err.message || "Something went wrong searching that address.");
    } finally {
      setSearching(false);
    }
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    selectedCoordsRef.current = null; // typing invalidates a previously picked suggestion
  };

  // Fills the search box with the guest's current location (reverse-
  // geocoded into a readable address) without searching automatically —
  // they still click Find Spots themselves, same as picking an
  // autocomplete suggestion or typing an address by hand.
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError("Your browser doesn't support location. Try entering an address instead.");
      return;
    }
    setError("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        selectedCoordsRef.current = coords;
        try {
          const google = await loadGoogleMapsScript();
          const geocoder = new google.maps.Geocoder();
          const { results } = await geocoder.geocode({ location: coords });
          setQuery(results?.[0]?.formatted_address || "Current location");
        } catch {
          // Reverse geocoding is just for a nice label — the coords
          // themselves are already set, so search still works fine
          // without it.
          setQuery("Current location");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location access was denied. Enable it in your browser's site settings, or enter an address instead.");
        } else {
          setError("Couldn't get your location. Try entering an address instead.");
        }
      },
      // Without this, browsers/devices can return a fast, coarse
      // (WiFi/IP-based) location that's off by a block or more — close
      // enough that "nearest listed spot" search still lands right, but
      // not precise enough for the reverse-geocoded address label to
      // read correctly. This asks for the device's best available fix
      // (real GPS on a phone) instead, at the cost of taking a bit longer.
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setError("Enter an address to search.");
      return;
    }
    runSearch({ query, coords: selectedCoordsRef.current });
  };

  return (
    <form className={`address-search ${className}`} onSubmit={handleSubmit}>
      <div className="address-search-row">
        <div className="address-search-input-row">
          <input
            ref={inputRef}
            className="address-search-input"
            type="text"
            value={query}
            placeholder={placeholder}
            onChange={handleChange}
            aria-label="Address"
            autoComplete="off"
          />
          <button
            type="button"
            className="address-search-locate-btn"
            onClick={handleUseLocation}
            disabled={locating}
            aria-label="Use my location"
            title="Use my location"
          >
            {locating ? (
              <span className="address-search-locate-spinner" />
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 21s-7-7.2-7-12a7 7 0 0 1 14 0c0 4.8-7 12-7 12Z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            )}
          </button>
        </div>
        <button className="address-search-button" type="submit" disabled={searching}>
          {searching ? "Searching..." : "Find Spots"}
        </button>
      </div>
      {error && <p className="address-search-error">{error}</p>}
    </form>
  );
}
