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
        <button className="address-search-button" type="submit" disabled={searching}>
          {searching ? "Searching..." : "Find Spots"}
        </button>
      </div>
      {error && <p className="address-search-error">{error}</p>}
    </form>
  );
}
