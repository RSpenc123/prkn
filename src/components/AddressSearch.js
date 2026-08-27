import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchAddress } from "../api/client";
import "./AddressSearch.css";

// Landing-page entry point into the rental flow: type an address, jump to
// /r/:addressId which lists every spot at that address. Used on both the
// desktop Landing page and, styled differently via `className`, in place
// of the mobile page's first "Download here" button.
export default function AddressSearch({ className = "", placeholder = "Enter an address" }) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setError("Enter an address to search.");
      return;
    }
    setSearching(true);
    setError("");
    const result = await searchAddress(query);
    setSearching(false);
    if (!result) {
      setError("No spots found at that address yet.");
      return;
    }
    navigate(`/r/${result.addressId}`);
  };

  return (
    <form className={`address-search ${className}`} onSubmit={handleSubmit}>
      <div className="address-search-row">
        <input
          className="address-search-input"
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Address"
        />
        <button className="address-search-button" type="submit" disabled={searching}>
          {searching ? "Searching..." : "Find Spots"}
        </button>
      </div>
      {error && <p className="address-search-error">{error}</p>}
    </form>
  );
}
